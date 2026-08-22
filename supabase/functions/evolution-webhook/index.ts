import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractPhoneNumber(key: any, messageData: any): string {
    const candidates = [
        key?.remoteJidAlt,
        key?.participant,
        messageData?.sender,
        messageData?.participant,
        key?.remoteJid,
        messageData?.remoteJid
    ];

    for (const raw of candidates) {
        if (!raw || typeof raw !== 'string') continue;
        if (raw.includes('@lid') && candidates.some(c => c && typeof c === 'string' && c.includes('@s.whatsapp.net'))) {
            continue;
        }
        const cleaned = raw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        if (cleaned && cleaned.length >= 8 && cleaned.length <= 13) {
            return cleaned;
        }
    }

    const fallback = (key?.remoteJid || messageData?.remoteJid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    return fallback;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method === 'GET') {
        return new Response('Evolution webhook active', { status: 200 })
    }

    if (req.method === 'POST') {
        try {
            const body = await req.json();
            const url = new URL(req.url);

            const supabase = createClient(
                'https://api.servitracks.com',
                'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5MDUwMCwiZXhwIjo0OTM5MDY0MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.d3PUP2XsMjRySYopRLYoUoFQ1pHb7LyMp9X_Fv4AX-M'
            );

            console.log('Evolution API event:', body.event, body.instance);

            // Extract message payload
            const rawData = body.data || body;
            const messageData = Array.isArray(rawData) ? rawData[0] : (rawData.messages ? rawData.messages[0] : rawData);

            if (!messageData) {
                return new Response('No message payload', { status: 200 });
            }

            const key = messageData.key || messageData.message?.key || {};

            // Ignore outgoing messages sent from phone (fromMe = true)
            if (key.fromMe) {
                return new Response('Ignore outgoing message', { status: 200 });
            }

            // Extract real sender telephone number
            let from = extractPhoneNumber(key, messageData);

            if (!from) {
                return new Response('No valid phone number found', { status: 200 });
            }

            const wamid = key.id || messageData.id;
            const pushName = messageData.pushName || body.pushName || from;

            // Resolve tenant_id
            let tenantId = url.searchParams.get('tenant_id');

            if (!tenantId) {
                const instanceName = body.instance || url.searchParams.get('instance');
                if (instanceName) {
                    const { data: tenantData } = await supabase
                        .from('tenants')
                        .select('id')
                        .eq('slug', instanceName)
                        .maybeSingle();
                    if (tenantData) tenantId = tenantData.id;
                }
            }

            if (!tenantId) {
                tenantId = '6b72afd6-4131-4622-9be3-ca10d4477980'; // Default Autocheck tenant
            }

            // Deduplication check
            if (wamid) {
                const { data: existing } = await supabase
                    .from('wa_messages')
                    .select('id')
                    .eq('wasender_id', wamid)
                    .limit(1);
                if (existing && existing.length > 0) {
                    return new Response('Duplicate message', { status: 200 });
                }
            }

            // Extract and unwrap message object
            let msgObj = messageData.message || messageData;
            if (msgObj.ephemeralMessage) msgObj = msgObj.ephemeralMessage.message || msgObj.ephemeralMessage;
            if (msgObj.viewOnceMessage) msgObj = msgObj.viewOnceMessage.message || msgObj.viewOnceMessage;
            if (msgObj.viewOnceMessageV2) msgObj = msgObj.viewOnceMessageV2.message || msgObj.viewOnceMessageV2;
            if (msgObj.documentWithCaptionMessage) msgObj = msgObj.documentWithCaptionMessage.message || msgObj.documentWithCaptionMessage;

            let content = 
                messageData.messageBody ||
                msgObj.conversation ||
                msgObj.extendedTextMessage?.text ||
                msgObj.text ||
                (typeof msgObj === 'string' ? msgObj : '');

            let messageType = 'text';

            if (msgObj.imageMessage) {
                messageType = 'image';
                const caption = msgObj.imageMessage.caption || '';
                const imgUrl = messageData.mediaUrl || msgObj.imageMessage.url || '';
                content = `[image] ${imgUrl}|imagen.png${caption ? '\n' + caption : ''}`;
            } else if (msgObj.videoMessage) {
                messageType = 'video';
                const caption = msgObj.videoMessage.caption || '';
                const vidUrl = messageData.mediaUrl || msgObj.videoMessage.url || '';
                content = `[video] ${vidUrl}|video.mp4${caption ? '\n' + caption : ''}`;
            } else if (msgObj.audioMessage || msgObj.pttMessage) {
                messageType = 'audio';
                const audUrl = messageData.mediaUrl || msgObj.audioMessage?.url || msgObj.pttMessage?.url || '';
                content = `[audio] ${audUrl}`;
            } else if (msgObj.documentMessage) {
                messageType = 'document';
                const docUrl = messageData.mediaUrl || msgObj.documentMessage.url || '';
                const filename = msgObj.documentMessage.fileName || msgObj.documentMessage.title || 'documento.pdf';
                content = `[document] ${docUrl}|${filename}`;
            } else if (msgObj.stickerMessage) {
                messageType = 'image';
                const stkUrl = messageData.mediaUrl || msgObj.stickerMessage.url || '';
                content = `[image] ${stkUrl}|sticker.webp`;
            }

            if (!content) {
                content = '(mensaje de voz o multimedia)';
            }

            // 1. Resolve or create Conversation
            const { data: convs } = await supabase
                .from('wa_conversations')
                .select('id, unread_count')
                .eq('tenant_id', tenantId)
                .eq('phone', from)
                .order('last_message_at', { ascending: false });

            let conversation = convs && convs.length > 0 ? convs[0] : null;

            const lastMsgPreview = messageType !== 'text' 
                ? `📎 ${messageType === 'image' ? '📷 Imagen' : messageType === 'video' ? '🎥 Video' : messageType === 'audio' ? '🎤 Audio' : '📄 Documento'}`
                : content.substring(0, 100);

            if (!conversation) {
                const { data: newConv, error: insertErr } = await supabase
                    .from('wa_conversations')
                    .insert({
                        tenant_id: tenantId,
                        name: pushName,
                        phone: from,
                        status: 'activa',
                        agent: 'humano',
                        unread_count: 1,
                        last_message: lastMsgPreview,
                        last_message_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertErr) {
                    console.error('Error inserting conversation:', insertErr);
                    return new Response('Error creating conversation: ' + JSON.stringify(insertErr), { status: 200 });
                }
                conversation = newConv;
            }

            if (!conversation) return new Response('Conversation resolve failed', { status: 200 });

            // 2. Insert Message into DB with role 'user'
            const { error: msgErr } = await supabase.from('wa_messages').insert({
                tenant_id: tenantId,
                conversation_id: conversation.id,
                role: 'user',
                content: content,
                wasender_id: wamid,
                message_type: messageType,
                status: 'delivered'
            });

            if (msgErr) {
                console.error('Error inserting message:', msgErr);
                return new Response('Error inserting message: ' + JSON.stringify(msgErr), { status: 200 });
            }

            // 3. Update Conversation last_message and unread_count
            await supabase.from('wa_conversations').update({
                name: pushName && pushName !== from ? pushName : undefined,
                last_message: lastMsgPreview,
                last_message_at: new Date().toISOString(),
                unread_count: (conversation.unread_count || 0) + 1,
                status: 'activa'
            }).eq('id', conversation.id);

            console.log(`✅ Message saved for ${from} in tenant ${tenantId}`);
            return new Response('ok', { status: 200 });
        } catch (err: any) {
            console.error('Evolution webhook error:', err);
            return new Response(JSON.stringify({ error: err.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }
    }

    return new Response('Method not allowed', { status: 405 });
});

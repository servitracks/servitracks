import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Proxy Edge Function for WaSender API calls from the browser.
 *
 * POST /wasender-proxy?action=upload   — Uploads a file via multipart/form-data
 * POST /wasender-proxy?action=send     — Sends a WhatsApp message
 * GET  /wasender-proxy?action=media&url=<url>&api_key=<api_key>  — Proxies media
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'send'

    // ── GET: Media proxy ───────────────────────────────────────────────
    if (req.method === 'GET' && action === 'media') {
        try {
            const mediaUrl = url.searchParams.get('url')
            const api_key = url.searchParams.get('api_key')

            if (!mediaUrl) {
                return new Response('Missing url parameter', { status: 400, headers: corsHeaders })
            }

            console.log(`Proxying GET media from: ${mediaUrl}`)

            const headers: HeadersInit = {}
            if (api_key) headers['Authorization'] = `Bearer ${api_key}`

            const res = await fetch(mediaUrl, { method: 'GET', headers })

            if (!res.ok) {
                console.error(`Failed to fetch media. Status: ${res.status}`)
                return new Response(`Error fetching media: ${res.statusText}`, { status: res.status, headers: corsHeaders })
            }

            const contentType = res.headers.get('Content-Type') || 'application/octet-stream'
            const arrayBuffer = await res.arrayBuffer()

            return new Response(arrayBuffer, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000'
                }
            })
        } catch (error: any) {
            console.error('Media proxy error:', error)
            return new Response(error.message, { status: 500, headers: corsHeaders })
        }
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { api_key, base_url, ...payload } = body

        if (!api_key) {
            return new Response(JSON.stringify({ error: 'Missing api_key' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const base = (base_url || 'https://wasenderapi.com').replace(/\/$/, '')

        // ── POST action=upload: base64 → multipart/form-data ──────────
        // WaSender /api/upload requires multipart/form-data, NOT JSON
        if (action === 'upload') {
            const endpoint = `${base}/api/upload`
            const base64DataUrl: string = payload.base64 || ''

            if (!base64DataUrl) {
                return new Response(JSON.stringify({ error: 'Missing base64 field' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // Parse "data:<mime>;base64,<data>"
            const commaIdx = base64DataUrl.indexOf(',')
            const meta = base64DataUrl.substring(5, commaIdx)   // "image/jpeg;base64"
            const mimeType = meta.split(';')[0]                  // "image/jpeg"
            const rawBase64 = base64DataUrl.substring(commaIdx + 1)

            // Decode base64 → Uint8Array
            const binaryStr = atob(rawBase64)
            const bytes = new Uint8Array(binaryStr.length)
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i)
            }

            const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin'
            const filename = `upload_${Date.now()}.${ext}`

            // Build multipart FormData
            const formData = new FormData()
            const blob = new Blob([bytes], { type: mimeType })
            formData.append('file', blob, filename)

            console.log(`Uploading ${filename} (${mimeType}, ${bytes.length} bytes) to ${endpoint}`)

            // IMPORTANT: Do NOT set Content-Type — fetch sets it automatically with boundary
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api_key}`,
                    'Accept': 'application/json',
                },
                body: formData,
            })

            const responseText = await res.text()
            console.log(`Upload response: ${res.status} ${responseText.substring(0, 300)}`)

            return new Response(responseText, {
                status: res.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── POST action=send: forward JSON as-is ──────────────────────
        const endpoint = `${base}/api/send-message`
        console.log(`Sending message to ${endpoint}`, JSON.stringify(payload).substring(0, 200))

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const responseText = await res.text()
        console.log(`Send response: ${res.status} ${responseText.substring(0, 300)}`)

        return new Response(responseText, {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Proxy error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

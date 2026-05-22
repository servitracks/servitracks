"use client";
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ShieldCheck, ArrowRightLeft, Mic, Image, FileText, Paperclip,
  Trash2, StopCircle, Search, Bot, User, Clock, Send, Check,
  CheckCheck, Loader2, Reply, X, Smile, Hand, MessageCircle
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";
import { supabase, supabaseAdmin } from "@/lib/supabase";

interface WaConversation {
  id: string;
  tenant_id: string;
  phone: string;
  name: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  status: string;
  agent: string;
  created_at: string;
}

interface WaMessage {
  id: string;
  conversation_id: string;
  tenant_id: string;
  role: "user" | "assistant";
  content: string;
  message_type: string;
  status: string;
  created_at: string;
}

export default function Conversations() {
  const location = useLocation();
  const { tenant } = useParams();
  const { tenants } = useStore();
  const currentTenant = tenants.find((t) => t.slug === tenant) || tenants[0];

  const [supabaseTenantId, setSupabaseTenantId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [replyingTo, setReplyingTo] = useState<WaMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const locationConvId = (location.state as any)?.conversationId as string | undefined;
  const resolvedRef = useRef(false); // prevent double-resolution

  // ── Resolve real Supabase tenant UUID by slug (only once) ────────────
  useEffect(() => {
    const slug = tenant || currentTenant?.slug;
    if (!slug || resolvedRef.current) return;
    resolvedRef.current = true;
    supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.warn("[Conversaciones] tenant not found:", slug);
          if (currentTenant?.id) setSupabaseTenantId(currentTenant.id);
          return;
        }
        console.log("[Conversaciones] tenant ID resolved:", data.id);
        setSupabaseTenantId(data.id);
      });
  }, [tenant]); // only depend on tenant slug from URL

  // ── Load conversations + polling every 30s (fallback si webhook falla) ──
  useEffect(() => {
    if (!supabaseTenantId) return;
    loadConversations();
    const interval = setInterval(loadConversations, 30_000);
    return () => clearInterval(interval);
  }, [supabaseTenantId]);

  async function loadConversations() {
    setLoadingConvs(true);
    const { data, error } = await supabaseAdmin
      .from("wa_conversations")
      .select("*")
      .eq("tenant_id", supabaseTenantId!)
      .order("last_message_at", { ascending: false });
    if (!error && data) setConversations(data);
    else if (error) console.error("[loadConversations] error:", error);
    setLoadingConvs(false);
  }

  // ── Real-time: nuevas conversaciones (supabaseAdmin bypasea RLS) ───
  useEffect(() => {
    if (!supabaseTenantId) return;
    const ch = supabaseAdmin
      .channel(`wa_conv_${supabaseTenantId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wa_conversations",
        filter: `tenant_id=eq.${supabaseTenantId}`,
      }, (payload) => {
        console.log("[RT conv]", payload.eventType, payload.new);
        if (payload.eventType === "INSERT") {
          setConversations((prev) => [payload.new as WaConversation, ...prev]);
          toast.info(`💬 Nuevo mensaje de ${(payload.new as WaConversation).name || (payload.new as WaConversation).phone}`);
        } else if (payload.eventType === "UPDATE") {
          setConversations((prev) =>
            prev.map((c) => c.id === payload.new.id ? payload.new as WaConversation : c)
              .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
          );
        }
      })
      .subscribe((status, err) => {
        console.log("[RT conversations]", status, err || "");
      });
    return () => { supabaseAdmin.removeChannel(ch); };
  }, [supabaseTenantId]);

  // ── Select first conv or from location state ────────────────────────
  useEffect(() => {
    if (locationConvId && conversations.find((c) => c.id === locationConvId)) {
      setSelectedConvId(locationConvId);
    } else if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations]);

  // ── Load messages for selected conversation ─────────────────────────
  useEffect(() => {
    if (!selectedConvId) { setMessages([]); return; }
    // Mark as read
    supabaseAdmin.from("wa_conversations").update({ unread_count: 0 }).eq("id", selectedConvId);
  }, [selectedConvId]);

  async function loadMessages(convId: string) {
    setLoadingMsgs(true);
    const { data, error } = await supabaseAdmin
      .from("wa_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data);
    setLoadingMsgs(false);
  }

  // ── Real-time: mensajes de la conversación activa (supabaseAdmin bypasea RLS) ──
  useEffect(() => {
    if (!selectedConvId) return;
    // Reload messages immediately on selection
    loadMessages(selectedConvId);
    // Polling each 8s as fallback
    const poll = setInterval(() => loadMessages(selectedConvId), 8_000);
    // Realtime subscription
    const ch = supabaseAdmin
      .channel(`wa_msgs_${selectedConvId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wa_messages",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, (payload) => {
        console.log("[RT msg]", payload.new);
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as WaMessage];
        });
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 50);
      })
      .subscribe((status, err) => console.log("[RT messages]", status, err || ""));
    return () => {
      clearInterval(poll);
      supabaseAdmin.removeChannel(ch);
    };
  }, [selectedConvId]);

  // ── Scroll on new messages ──────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────
  const handleSend = async (type = "text", mediaContent?: string) => {
    if (type === "text" && !messageText.trim()) return;
    if (!selectedConvId || !supabaseTenantId) return;
    const conv = conversations.find((c) => c.id === selectedConvId);
    if (!conv) return;

    const text = type === "text" ? messageText.trim() : (mediaContent || "[Media]");
    if (type === "text") setMessageText("");
    setReplyingTo(null);
    setSending(true);

    const { data: msg, error: msgErr } = await supabaseAdmin.from("wa_messages").insert({
      conversation_id: selectedConvId,
      tenant_id: supabaseTenantId,
      role: "assistant",
      content: text,
      message_type: type,
      status: "sent",
    }).select().single();

    if (!msgErr && msg) {
      setMessages((prev) => [...prev, msg]);
      // Update conversation last message
      await supabaseAdmin.from("wa_conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", selectedConvId);
    }

    // 2. Send via WaSender API
    if (currentTenant.wasenderApiKey) {
      try {
        const res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentTenant.wasenderApiKey}`,
          },
          body: JSON.stringify({ to: conv.phone.replace("+", ""), text }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.warn("WaSender error:", data);
          // Still saved to DB, just notify
          toast.warning(`Guardado en DB. WaSender: ${data?.message ?? res.status}`);
        } else {
          // Update message status to delivered
          if (msg) {
            await supabaseAdmin.from("wa_messages").update({ status: "delivered" }).eq("id", msg.id);
            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "delivered" } : m));
          }
        }
      } catch (e: any) {
        toast.warning("Mensaje guardado. Sin conexión a WaSender.");
      }
    }
    setSending(false);
  };

  // ── Toggle agent ────────────────────────────────────────────────────
  const toggleAgent = async (convId: string, current: string) => {
    const next = current === "ia" ? "humano" : "ia";
    await supabaseAdmin.from("wa_conversations").update({ agent: next }).eq("id", convId);
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, agent: next } : c));
    toast.success(next === "ia" ? "🤖 IA Activada" : "👤 Modo Humano Activado");
  };

  // ── Audio recording ─────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => handleSend("audio", reader.result as string);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch { toast.error("No se pudo acceder al micrófono"); }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const isAiMode = selectedConv?.agent === "ia";
  const filtered = conversations.filter(
    (c) => (c.name || c.phone).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-6">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversación..."
              className="pl-9 h-9 text-sm rounded-xl border-neutral-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loadingConvs ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <MessageCircle className="h-8 w-8 mx-auto opacity-20" />
              <p>No hay conversaciones aún</p>
              <p className="text-[10px] leading-relaxed opacity-70">Los mensajes de WhatsApp aparecerán aquí automáticamente cuando alguien escriba a tu número.</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors ${conv.id === selectedConvId ? "bg-accent" : "hover:bg-muted/50"}`}
              >
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0 mt-0.5">
                  {(conv.name || conv.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-foreground truncate">{conv.name || conv.phone}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: es })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message || ""}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 border-0 ${conv.agent === "ia" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>
                      {conv.agent === "ia" ? <Bot className="h-2.5 w-2.5 mr-0.5" /> : <User className="h-2.5 w-2.5 mr-0.5" />}
                      {conv.agent === "ia" ? "IA" : "HUMANO"}
                    </Badge>
                    {conv.unread_count > 0 && (
                      <span className="ml-auto h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="border-b border-border bg-card shrink-0">
              <div className="h-14 px-5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                  {(selectedConv.name || selectedConv.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{selectedConv.name || selectedConv.phone}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    {selectedConv.phone}
                  </p>
                </div>
                <Button
                  variant={isAiMode ? "default" : "outline"}
                  size="sm"
                  className={`h-8 gap-1.5 text-xs rounded-xl ${isAiMode ? "bg-primary hover:bg-primary/90" : "border-amber-300 text-amber-700 hover:bg-amber-50"}`}
                  onClick={() => toggleAgent(selectedConv.id, selectedConv.agent)}
                >
                  {isAiMode ? <><Bot className="h-3.5 w-3.5" />IA activa<ArrowRightLeft className="h-3 w-3" /></> : <><Hand className="h-3.5 w-3.5" />Humano<ArrowRightLeft className="h-3 w-3" /></>}
                </Button>
              </div>
              <div className={`h-8 px-5 flex items-center gap-2 text-xs font-medium ${isAiMode ? "bg-primary/5 text-primary border-t border-primary/10" : "bg-amber-50 text-amber-700 border-t border-amber-100"}`}>
                {isAiMode ? <><Bot className="h-3.5 w-3.5" />IA responde automáticamente</> : <><ShieldCheck className="h-3.5 w-3.5" />Tú controlas esta conversación</>}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-auto p-5 space-y-2"
              style={{ background: "#efeae2", backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: "overlay", backgroundSize: "400px" }}
            >
              {loadingMsgs ? (
                <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center pt-8">
                  <span className="bg-white/70 rounded-full px-3 py-1 text-xs text-muted-foreground">No hay mensajes aún</span>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isSent = msg.role === "assistant";
                  const showTail = idx === 0 || messages[idx - 1].role !== msg.role;
                  return (
                    <div key={msg.id} className={`flex ${isSent ? "justify-end" : "justify-start"} mb-1 group`}>
                      <div className={`max-w-[80%] relative rounded-lg px-3 py-1.5 text-[14px] shadow-sm ${isSent ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none" : "bg-white text-[#111b21] rounded-tl-none"}`}>
                        {showTail && (
                          <div className={`absolute top-0 w-2 h-2.5 ${isSent ? "-right-2 bg-[#d9fdd3]" : "-left-2 bg-white"}`}
                            style={{ clipPath: isSent ? "polygon(0 0, 0% 100%, 100% 0)" : "polygon(100% 0, 0 0, 100% 100%)" }} />
                        )}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className={`absolute top-2 ${isSent ? "-left-9" : "-right-9"} p-1.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md`}
                        >
                          <Reply className="h-3.5 w-3.5 text-[#667781]" />
                        </button>
                        <p className="leading-normal">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] text-[#667781]">
                            {new Date(msg.created_at).toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                          {isSent && (
                            msg.status === "read" ? <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" /> :
                            msg.status === "delivered" ? <CheckCheck className="h-3.5 w-3.5 text-[#667781]" /> :
                            <Check className="h-3.5 w-3.5 text-[#667781]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card shrink-0 p-3 px-4">
              {replyingTo && (
                <div className="px-4 py-2 mb-2 border-l-4 border-primary bg-muted/20 rounded-md flex gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-primary">Respondiendo</p>
                    <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <>
                    <div className="flex-1 flex items-center gap-1 bg-muted/40 rounded-full px-3 border border-border/40 h-12">
                      <Popover>
                        <PopoverTrigger>
                          <div className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
                            <Smile className="h-5 w-5" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0 border-none shadow-2xl mb-4 ml-4 rounded-3xl overflow-hidden" align="start">
                          <EmojiPicker onEmojiClick={(e) => setMessageText((p) => p + e.emoji)} theme={Theme.LIGHT} width="100%" height="400px" lazyLoadEmojis skinTonesDisabled previewConfig={{ showPreview: false }} />
                        </PopoverContent>
                      </Popover>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <div className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
                            <Paperclip className="h-5 w-5" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-52 mb-4 ml-6 p-1 rounded-2xl shadow-2xl border-none bg-white">
                          <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FileText className="h-4 w-4" /></div>
                            <span className="font-semibold text-sm">Documento</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Image className="h-4 w-4" /></div>
                            <span className="font-semibold text-sm">Foto / Video</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => handleSend("image", r.result as string); }
                      }} />
                      <Input
                        placeholder={isAiMode ? "IA responde automáticamente..." : "Escribe un mensaje..."}
                        className="h-9 text-[14px] border-none focus-visible:ring-0 bg-transparent px-2 shadow-none"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        disabled={sending}
                      />
                    </div>
                    <div className="shrink-0">
                      {messageText.trim() ? (
                        <Button className="h-11 w-11 rounded-full bg-[#008055] hover:bg-[#006644] shadow-md p-0" onClick={() => handleSend()} disabled={sending}>
                          {sending ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Send className="h-5 w-5 text-white ml-0.5" />}
                        </Button>
                      ) : (
                        <Button className="h-11 w-11 rounded-full bg-[#008055] hover:bg-[#006644] shadow-md p-0" onClick={startRecording}>
                          <Mic className="h-5 w-5 text-white" />
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-between bg-red-50/50 rounded-full px-4 h-12 border border-red-200/30">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-bold font-mono text-red-600">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:bg-red-100/50 font-bold px-3 rounded-full" onClick={cancelRecording}>
                        <Trash2 className="h-4 w-4 mr-1" />Cancelar
                      </Button>
                      <Button size="sm" className="h-8 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold px-4" onClick={stopRecording}>
                        <Check className="h-4 w-4 mr-1" />Enviar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 opacity-20" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Selecciona un chat</h3>
            <p className="text-sm max-w-xs mt-2">Haz clic en una conversación para ver los mensajes e interactuar a través de WhatsApp.</p>
          </div>
        )}
      </div>
    </div>
  );
}

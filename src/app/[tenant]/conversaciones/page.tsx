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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<WaMessage | null>(null);
  const [activeMediaModalUrl, setActiveMediaModalUrl] = useState<string | null>(null);

  const getProxiedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("wasenderapi.com")) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = currentTenant?.wasenderApiKey || "";
      return `${supabaseUrl}/functions/v1/wasender-proxy?action=media&url=${encodeURIComponent(url)}&api_key=${encodeURIComponent(apiKey)}`;
    }
    return url;
  };

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
    if (currentTenant?.id && !resolvedRef.current) {
      resolvedRef.current = true;
      setSupabaseTenantId(currentTenant.id);
    }
  }, [currentTenant?.id]);

  // ── Load conversations + polling every 30s (fallback si webhook falla) ──
  useEffect(() => {
    if (!supabaseTenantId) return;
    loadConversations();
    const interval = setInterval(loadConversations, 30_000);
    return () => clearInterval(interval);
  }, [supabaseTenantId]);

  async function loadConversations() {
    setLoadingConvs(true);
    const { data, error } = await supabase
      .from("wa_conversations")
      .select("*")
      .eq("tenant_id", supabaseTenantId!)
      .order("last_message_at", { ascending: false });
    if (!error && data) setConversations(data);
    else if (error) console.error("[loadConversations] error:", error);
    setLoadingConvs(false);
  }

  // Usamos una referencia para el ID activo, así el WebSocket siempre sabe cuál es la conversación actual
  // sin necesidad de desconectarse y reconectarse (lo que provocaba los CLOSED/SUBSCRIBED).
  const activeConvRef = useRef<string | null>(null);
  useEffect(() => {
    activeConvRef.current = selectedConvId;
  }, [selectedConvId]);

  // ── Real-time ÚNICO: Escucha a través de eventos globales del Layout ───
  useEffect(() => {
    if (!supabaseTenantId) return;

    const handleConversationUpdate = (e: Event) => {
      const payload = (e as CustomEvent).detail;
      console.log("[Local RT conv]", payload.eventType, payload.new);
      if (payload.eventType === "INSERT") {
        toast.info(`💬 Nuevo chat de ${(payload.new as WaConversation).name || (payload.new as WaConversation).phone}`);
      }
      loadConversations(); // Refresca la lista completa
    };

    const handleMessageReceive = (e: Event) => {
      const payload = (e as CustomEvent).detail;
      
      if (payload.eventType === "INSERT") {
        const newMsg = payload.new as WaMessage;
        console.log("[Local RT msg INSERT]", newMsg);
        
        // Si es la conversación activa -> agrega el mensaje a la pantalla actual
        if (newMsg.conversation_id === activeConvRef.current) {
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 50);
          // Marcar como leído
          supabase
            .from("wa_conversations")
            .update({ unread_count: 0 })
            .eq("id", activeConvRef.current)
            .then(({ error }) => {
              if (error) console.error("Error marking active conversation as read:", error);
            });
            
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConvRef.current ? { ...c, unread_count: 0 } : c))
          );
        }
      } else if (payload.eventType === "UPDATE") {
        const updatedMsg = payload.new as WaMessage;
        console.log("[Local RT msg UPDATE]", updatedMsg);
        
        // Si es de la conversación activa -> actualiza el estado del mensaje
        if (updatedMsg.conversation_id === activeConvRef.current) {
          setMessages((prev) => prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m));
        }
      }
    };

    window.addEventListener("wa_conversation_updated", handleConversationUpdate);
    window.addEventListener("wa_message_received", handleMessageReceive);

    return () => {
      window.removeEventListener("wa_conversation_updated", handleConversationUpdate);
      window.removeEventListener("wa_message_received", handleMessageReceive);
    };
  }, [supabaseTenantId]);

  // ── Select first conv or from location state ────────────────────────
  useEffect(() => {
    if (locationConvId && conversations.find((c) => c.id === locationConvId)) {
      setSelectedConvId(locationConvId);
    } else if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations]);

  async function loadMessages(convId: string) {
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from("wa_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data);
    setLoadingMsgs(false);
  }

  // ── Load messages for selected conversation ─────────────────────────
  useEffect(() => {
    if (!selectedConvId) { setMessages([]); return; }
    // Mark as read immediately on select
    supabase
      .from("wa_conversations")
      .update({ unread_count: 0 })
      .eq("id", selectedConvId)
      .then(({ error }) => {
        if (error) console.error("Error marking selected conversation as read:", error);
      });
      
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConvId ? { ...c, unread_count: 0 } : c))
    );
    
    // Reload messages immediately on selection
    loadMessages(selectedConvId);
  }, [selectedConvId]);

  // ── Scroll on new messages ──────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────
  const handleSend = async (type = "text", mediaUrl?: string, filename?: string) => {
    if (type === "text" && !messageText.trim()) return;
    if (!selectedConvId || !supabaseTenantId) return;
    const conv = conversations.find((c) => c.id === selectedConvId);
    if (!conv) return;

    const text = type === "text" 
      ? messageText.trim() 
      : `[${type}] ${mediaUrl}${filename ? `|${filename}` : ""}`;
      
    if (type === "text") setMessageText("");
    setReplyingTo(null);
    setSending(true);

    const { data: msg, error: msgErr } = await supabase.from("wa_messages").insert({
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
      await supabase.from("wa_conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", selectedConvId);
    }

    // 2. Send via WaSender API
    if (currentTenant.wasenderApiKey) {
      try {
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wasender-proxy`;
        
        // Exact format required by wasenderapi.com/api/send-message
        const payload = type === "text" 
          ? { 
              to: conv.phone, 
              text: text
            }
          : { 
              to: conv.phone, 
              text: type === "image" ? "📷 Imagen" : type === "audio" ? "🎤 Audio" : `📄 ${filename || "Archivo"}`, 
              imageUrl: mediaUrl
            };

        const res = await fetch(edgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            action: "send",
            api_key: currentTenant.wasenderApiKey,
            base_url: "https://wasenderapi.com", 
            ...payload
          })
        });

        const data = await res.json().catch(() => null);

        const isLogicalError = data?.success === false || data?.status === "error";

        if (!res.ok || isLogicalError) {
          const errMsg = data?.message || data?.error || (data && JSON.stringify(data)) || res.statusText || "Error 422: Faltan parámetros requeridos por WaSender";
          console.warn("WaSender API error:", errMsg, data);
          toast.warning(`Guardado en DB. Error WaSender: ${errMsg}`);
        } else {
          // Update message status to delivered
          if (msg) {
            await supabase.from("wa_messages").update({ status: "delivered" }).eq("id", msg.id);
            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "delivered" } : m));
          }
        }
      } catch (e: any) {
        toast.warning("Mensaje guardado. Sin conexión a la API de WhatsApp.");
      }
    } else {
      toast.info("Mensaje guardado en la base de datos (Requiere API Key de WhatsApp para salir).");
    }
    setSending(false);
  };

  // ── Delete Conversation ─────────────────────────────────────────────
  const handleDeleteConversation = async (convId: string) => {
    try {
      // 1. Delete messages first
      const { error: msgErr } = await supabaseAdmin
        .from("wa_messages")
        .delete()
        .eq("conversation_id", convId);

      if (msgErr) console.error("Error deleting messages:", msgErr);

      // 2. Delete conversation
      const { error: convErr } = await supabaseAdmin
        .from("wa_conversations")
        .delete()
        .eq("id", convId);

      if (convErr) {
        toast.error("No se pudo eliminar la conversación");
        console.error(convErr);
        return;
      }

      toast.success("Conversación eliminada correctamente");
      
      // Update local state
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      
      // Clear selection if deleted
      if (selectedConvId === convId) {
        setSelectedConvId(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Ocurrió un error al intentar eliminar la conversación");
    } finally {
      setConvToDelete(null);
    }
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

  const formatLastMessage = (content: string | null) => {
    if (!content) return "";
    
    // Si empieza con alguno de los tags multimedia
    if (content.startsWith("[image]")) return "📷 Imagen";
    if (content.startsWith("[video]")) return "🎥 Video";
    if (content.startsWith("[audio]")) return "🎤 Audio";
    if (content.startsWith("[document]")) return "📄 Documento";
    
    // Si contiene base64 de imágenes o documentos antiguos
    if (content.startsWith("data:image/")) return "📷 Imagen";
    if (content.startsWith("data:video/")) return "🎥 Video";
    if (content.startsWith("data:audio/")) return "🎤 Audio";
    if (content.startsWith("data:application/")) return "📄 Documento";
    
    return content;
  };

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
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors group relative ${conv.id === selectedConvId ? "bg-accent" : "hover:bg-muted/50"}`}
              >
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0 mt-0.5">
                  {(conv.name || conv.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-foreground truncate">{conv.name || conv.phone}</p>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-muted-foreground group-hover:hidden">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: es })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConvToDelete(conv.id);
                        }}
                        className="hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Eliminar conversación"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{formatLastMessage(conv.last_message)}</p>
                  <div className="flex items-center justify-between mt-1 min-h-[16px]">
                    {conv.unread_count > 0 && conv.id !== selectedConvId ? (
                      <span className="ml-auto h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {conv.unread_count}
                      </span>
                    ) : (
                      <div />
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
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => setConvToDelete(selectedConv.id)}
                  title="Eliminar conversación"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </Button>
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

                  // ── PARSEO MULTIMEDIA DETALLADO ──
                  const isMedia = msg.content.startsWith('[image]') || msg.content.startsWith('[video]') || msg.content.startsWith('[audio]') || msg.content.startsWith('[document]');
                  let mediaType = "";
                  let mediaUrl = "";
                  let mediaCaption = "";
                  let mediaFilename = "";

                  if (isMedia) {
                    const lines = msg.content.split('\n');
                    const match = lines[0].match(/^\[(\w+)\]\s*(.*)$/);
                    if (match) {
                      mediaType = match[1];
                      const parts = match[2].split('|');
                      mediaUrl = parts[0];
                      mediaFilename = parts[1] || "";
                      mediaCaption = lines.slice(1).join('\n').trim();
                    }
                  }

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
                        
                        {/* RENDERIZADO MULTIMEDIA / TEXTO */}
                        {isMedia ? (
                          <div className="space-y-1">
                            {mediaType === 'image' && (
                              <img 
                                src={getProxiedUrl(mediaUrl)} 
                                alt="WhatsApp attachment" 
                                className="rounded-xl max-h-60 object-cover max-w-full hover:scale-[1.01] transition-transform shadow-sm cursor-pointer" 
                                onClick={() => setActiveMediaModalUrl(getProxiedUrl(mediaUrl))} 
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const retries = parseInt(target.getAttribute('data-retry') || '0', 10);
                                  if (retries < 4) {
                                    target.setAttribute('data-retry', (retries + 1).toString());
                                    setTimeout(() => {
                                      const currentSrc = target.src;
                                      target.src = '';
                                      target.src = currentSrc;
                                    }, 1000 * (retries + 1));
                                  } else {
                                    target.style.display = 'none';
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'flex items-center gap-2 p-3 bg-black/5 rounded-xl text-xs text-muted-foreground';
                                    placeholder.innerHTML = '📷 <span class="opacity-75">Imagen (expirada)</span>';
                                    target.parentNode?.insertBefore(placeholder, target);
                                  }
                                }}
                              />
                            )}

                            {mediaType === 'video' && (
                              <video 
                                src={getProxiedUrl(mediaUrl)} 
                                controls 
                                className="rounded-xl max-h-60 max-w-full shadow-sm"
                              />
                            )}

                            {mediaType === 'audio' && (
                              <audio 
                                src={getProxiedUrl(mediaUrl)} 
                                controls 
                                className="max-w-full"
                              />
                            )}

                            {mediaType === 'document' && (
                              <a 
                                href={getProxiedUrl(mediaUrl)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors border border-neutral-200/50 max-w-sm"
                              >
                                <div className="h-10 w-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate text-neutral-800">{mediaFilename || "Documento.pdf"}</p>
                                  <p className="text-[10px] text-neutral-400">Haga clic para descargar</p>
                                </div>
                              </a>
                            )}

                            {mediaCaption && (
                              <p className="leading-normal mt-1">{mediaCaption}</p>
                            )}
                          </div>
                        ) : (
                          <p className="leading-normal">{msg.content}</p>
                        )}

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
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*,application/pdf,audio/*" 
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;

                      // Determinar el tipo de archivo
                      let msgType: "image" | "video" | "audio" | "document" = "document";
                      if (f.type.startsWith("image/")) msgType = "image";
                      else if (f.type.startsWith("video/")) msgType = "video";
                      else if (f.type.startsWith("audio/")) msgType = "audio";

                      const toastId = toast.loading(`Subiendo ${f.name} a WhatsApp...`);
                      
                      const reader = new FileReader();
                      reader.readAsDataURL(f);
                      reader.onload = async () => {
                        try {
                          const base64DataUrl = reader.result as string;
                          const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wasender-proxy?action=upload`;
                          
                          const res = await fetch(edgeFunctionUrl, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                            },
                            body: JSON.stringify({
                              api_key: currentTenant?.wasenderApiKey,
                              base_url: "https://wasenderapi.com",
                              base64: base64DataUrl
                            })
                          });

                          const data = await res.json().catch(() => null);

                          if (!res.ok || !data?.success || !data?.publicUrl) {
                            const errMsg = data?.message || data?.error || "Error al subir archivo a WaSender";
                            console.error("WaSender upload error:", errMsg, data);
                            toast.error(`Error al subir: ${errMsg}`, { id: toastId });
                            return;
                          }

                          toast.success("Archivo subido con éxito", { id: toastId });
                          
                          // Enviar mensaje con la URL pública de WaSender
                          await handleSend(msgType, data.publicUrl, f.name);
                        } catch (err: any) {
                          console.error("File upload crash:", err);
                          toast.error(`Error inesperado: ${err.message || err}`, { id: toastId });
                        }
                      };
                    }} 
                  />
                  <Input
                    placeholder="Escribe un mensaje..."
                    className="h-9 text-[14px] border-none focus-visible:ring-0 bg-transparent px-2 shadow-none"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={sending}
                  />
                </div>
                <div className="shrink-0">
                  <Button 
                    className="h-12 px-6 rounded-full bg-[#008055] hover:bg-[#006644] text-white font-bold flex items-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer" 
                    onClick={() => handleSend()} 
                    disabled={sending || !messageText.trim()}
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <>
                        <span>Enviar</span>
                        <Send className="h-4 w-4 text-white" />
                      </>
                    )}
                  </Button>
                </div>
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

      {/* AlertDialog de Confirmación de Borrado */}
      <AlertDialog open={!!convToDelete} onOpenChange={(open) => !open && setConvToDelete(null)}>
        <AlertDialogContent className="bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              ¿Eliminar conversación?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-neutral-500 mt-2 leading-relaxed">
              Esta acción eliminará de forma permanente esta conversación y todos sus mensajes asociados de la base de datos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex justify-end gap-3">
            <AlertDialogCancel className="rounded-xl px-4 py-2 hover:bg-neutral-100 font-semibold text-neutral-700 transition-colors border border-neutral-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (convToDelete) {
                  handleDeleteConversation(convToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 font-semibold transition-colors shadow-lg shadow-red-500/20"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Previsualización Multimedia (Lightbox) */}
      {activeMediaModalUrl && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setActiveMediaModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            <img src={activeMediaModalUrl} alt="Vista ampliada" className="max-w-full max-h-[85vh] object-contain" />
            <button 
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
              onClick={() => setActiveMediaModalUrl(null)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


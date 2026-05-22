import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ShieldCheck, ArrowRightLeft, Plus, Mic, Image, FileText, Paperclip,
  Trash2, StopCircle, Search, Bot, User, Clock, Send, AlertTriangle, Check, 
  CheckCheck, Loader2, Reply, X, Smile, Zap, Hand, Brain, ToggleLeft, ToggleRight, MessageCircle
} from "lucide-react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useStore, Conversation, ChatMessage } from "@/store/useStore";
import { useParams } from "@/lib/next-compat";

export default function Conversations() {
  const location = useLocation();
  const { tenant } = useParams();
  const locationConvId = (location.state as any)?.conversationId as string | undefined;
  
  const { 
    tenants, 
    conversations: allConversations, 
    chatMessages: allMessages, 
    addChatMessage,
    updateConversation
  } = useStore();

  const currentTenant = tenants.find((t) => t.slug === tenant) || tenants[0];
  const conversations = allConversations.filter(c => c.tenantId === currentTenant?.id);

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [switchingAgent, setSwitchingAgent] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Media Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Seleccionar la conversación inicial
  useEffect(() => {
    if (locationConvId && conversations.find(c => c.id === locationConvId)) {
      setSelectedConvId(locationConvId);
    } else if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, locationConvId]);

  const messages = allMessages.filter(m => m.conversation_id === selectedConvId);

  // --- AUDIO RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        await uploadAndSendMedia(audioBlob, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("❌ Permiso denegado. Haz clic en el candado junto a la URL para permitir el micrófono.");
      } else {
        toast.error("❌ No se pudo acceder al micrófono. Asegúrate de estar en un sitio seguro (HTTPS).");
      }
    }
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
      toast.info("🎙️ Grabación cancelada");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- MEDIA UPLOAD LOGIC ---
  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 'document';
    
    await uploadAndSendMedia(file, type);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAndSendMedia = async (file: File | Blob, type: string) => {
    setUploading(true);
    try {
      const base64Data = await fileToBase64(file);
      // Para simular la subida y envío local sin backend complejo:
      await handleSend(type, base64Data, file instanceof File ? file.name : 'audio.ogg');
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`❌ Error al procesar archivo`);
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (type = 'text', mediaUrl?: string, filename?: string) => {
    if ((type === 'text' && !messageText.trim()) || !selectedConvId) return;

    const currentMsg = messageText;
    if (type === 'text') setMessageText('');
    setReplyingTo(null);

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: selectedConvId,
      role: 'assistant', // "nosotros" somos el assistant/agente en este contexto
      content: type === 'text' ? currentMsg : `[${type}] ${filename || 'Media'}`,
      time: new Date().toISOString(),
      status: 'delivered'
    };

    // Añadir mensaje a store
    addChatMessage(newMsg);
    updateConversation(selectedConvId, {
      last_msg: newMsg.content,
      time: newMsg.time
    });

    // Enviar a WaSender si hay API key configurada
    if (currentTenant?.wasenderApiKey && currentTenant?.wasenderPhone) {
      try {
        const res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Token": currentTenant.wasenderApiKey 
          },
          body: JSON.stringify({ 
            phone: conversations.find(c => c.id === selectedConvId)?.phone || '', 
            message: newMsg.content, 
            apiKey: currentTenant.wasenderApiKey 
          }),
        });
        if (!res.ok) {
          toast.error("Error al enviar mensaje vía WaSender API");
        }
      } catch (err) {
        toast.error("No se pudo conectar a WaSender API");
      }
    }
  };

  const toggleAgent = async (convId: string, currentAgent: string) => {
    setSwitchingAgent(true);
    const newAgent = currentAgent === 'ia' ? 'humano' : 'ia';
    
    setTimeout(() => {
      updateConversation(convId, { agent: newAgent });
      if (newAgent === 'ia') {
        toast.success("🤖 IA Activada");
      } else {
        toast.success("👤 Modo Humano Activado");
      }
      setSwitchingAgent(false);
    }, 500);
  };

  const getAiSuggestion = async () => {
    if (!selectedConvId) return;
    setLoadingSuggestion(true);
    
    setTimeout(() => {
      setAiSuggestion("Hola, ¿en qué te puedo ayudar hoy con tu vehículo?");
      toast.success("✨ Sugerencia generada");
      setLoadingSuggestion(false);
    }, 1500);
  };

  const useSuggestion = () => {
    if (aiSuggestion) {
      setMessageText(aiSuggestion);
      setAiSuggestion(null);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filtered = conversations.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  const selectedConversation = conversations.find(c => c.id === selectedConvId);
  const isAiMode = selectedConversation?.agent === 'ia';

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-6">
      {/* Contact list */}
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
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No hay conversaciones aún</div>
          ) : (
            filtered.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors ${conv.id === selectedConvId ? "bg-accent" : "hover:bg-muted/50"
                  }`}
              >
                <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-accent-foreground shrink-0 mt-0.5">
                  {(conv.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-foreground truncate">{conv.name || conv.phone}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 uppercase">
                      {conv.time ? formatDistanceToNow(new Date(conv.time), { addSuffix: false, locale: es }) : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_msg}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 border-0 ${conv.agent === 'ia' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'}`}>
                      {conv.agent === "ia" ? <Bot className="h-2.5 w-2.5 mr-0.5" /> : <User className="h-2.5 w-2.5 mr-0.5" />}
                      {conv.agent === 'ia' ? 'IA' : 'HUMANO'}
                    </Badge>
                    {conv.unread > 0 && (
                      <span className="ml-auto h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {conv.unread}
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
        {selectedConversation ? (
          <>
            {/* Header with agent controls */}
            <div className="border-b border-border bg-card shrink-0">
              <div className="h-14 px-5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-accent-foreground">
                  {(selectedConversation.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{selectedConversation.name || selectedConversation.phone}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full inline-block ${selectedConversation.status === 'activa' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    {selectedConversation.status === 'activa' ? 'En línea' : 'Desconectado'}
                  </p>
                </div>

                {/* Agent mode controls */}
                <div className="flex items-center gap-2">
                  {/* AI Suggestion button (only in human mode) */}
                  {!isAiMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-xl"
                      onClick={getAiSuggestion}
                      disabled={loadingSuggestion || messages.length === 0}
                    >
                      {loadingSuggestion ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      )}
                      Sugerir respuesta
                    </Button>
                  )}

                  {/* Toggle AI/Human button */}
                  <Button
                    variant={isAiMode ? "default" : "outline"}
                    size="sm"
                    className={`h-8 gap-1.5 text-xs transition-all rounded-xl ${isAiMode
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "border-amber-300 text-amber-700 hover:bg-amber-50"
                      }`}
                    onClick={() => toggleAgent(selectedConvId!, selectedConversation.agent)}
                    disabled={switchingAgent}
                  >
                    {switchingAgent ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isAiMode ? (
                      <>
                        <Bot className="h-3.5 w-3.5" />
                        IA activa
                        <ArrowRightLeft className="h-3 w-3 ml-0.5 opacity-60" />
                      </>
                    ) : (
                      <>
                        <Hand className="h-3.5 w-3.5" />
                        Modo humano
                        <ArrowRightLeft className="h-3 w-3 ml-0.5 opacity-60" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Agent mode indicator bar */}
              <div className={`h-10 px-5 flex items-center gap-3 text-sm font-medium transition-colors ${isAiMode
                ? 'bg-primary/5 text-primary border-t border-primary/10'
                : 'bg-amber-50 text-amber-700 border-t border-amber-100'
                }`}>
                {isAiMode ? (
                  <>
                    <Bot className="h-4 w-4" />
                    <span>La IA responde automáticamente a este cliente</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto px-3 hover:bg-amber-100 hover:text-amber-700 font-semibold"
                      onClick={() => toggleAgent(selectedConvId!, 'ia')}>
                      <Hand className="h-4 w-4 mr-1.5" />
                      Intervenir
                    </Button>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Tú controlas esta conversación</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto px-3 hover:bg-primary/10 hover:text-primary font-semibold"
                      onClick={() => toggleAgent(selectedConvId!, 'humano')}>
                      <Bot className="h-4 w-4 mr-1.5" />
                      Delegar a IA
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-auto p-5 space-y-2 bg-[#efeae2] dark:bg-[#0b141a]"
              style={{
                backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                backgroundBlendMode: 'overlay',
                backgroundSize: '400px',
              }}
            >
              {messages.map((msg, idx) => {
                const isSentByMe = msg.role === "assistant";
                const showTail = idx === 0 || messages[idx - 1].role !== msg.role;
                const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                return (
                  <div key={msg.id} className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-1 group`}>
                    <div
                      className={`max-w-[85%] relative rounded-lg px-3 py-1.5 text-[14.2px] shadow-sm ${isSentByMe
                        ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                        : "bg-white text-[#111b21] rounded-tl-none"
                        } ${!showTail ? "rounded-tr-lg rounded-tl-lg" : ""}`}
                    >
                      {/* Reply Bubble */}
                      {repliedMsg && (
                        <div
                          className="bg-black/5 rounded-md border-l-4 border-primary/50 p-2 mb-1.5 cursor-pointer hover:bg-black/10 transition-colors"
                          onClick={() => {
                            const el = document.getElementById(`msg-${repliedMsg.id}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el?.classList.add('animate-pulse');
                            setTimeout(() => el?.classList.remove('animate-pulse'), 2000);
                          }}
                        >
                          <p className="text-[11px] font-bold text-primary truncate">
                            {repliedMsg.role === 'user' ? (selectedConversation?.name || 'Usuario') : 'Tú'}
                          </p>
                          <p className="text-[12px] text-[#667781] truncate line-clamp-1">{repliedMsg.content}</p>
                        </div>
                      )}

                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className={`absolute top-2 ${isSentByMe ? "-left-10" : "-right-10"} p-1.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-gray-50`}
                      >
                        <Reply className="h-3.5 w-3.5 text-[#667781]" />
                      </button>

                      {/* Bubble Tail */}
                      {showTail && (
                        <div className={`absolute top-0 w-2 h-2.5 ${isSentByMe
                          ? " -right-2 bg-[#d9fdd3]"
                          : " -left-2 bg-white"
                          }`}
                          style={{
                            clipPath: isSentByMe
                              ? 'polygon(0 0, 0% 100%, 100% 0)'
                              : 'polygon(100% 0, 0 0, 100% 100%)'
                          }} />
                      )}

                      <p id={`msg-${msg.id}`} className="leading-normal">{msg.content}</p>

                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] text-[#667781] uppercase">
                          {new Date(msg.time).toLocaleTimeString('es-DO', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            hourCycle: 'h12'
                          }).toUpperCase()}
                        </span>
                        {isSentByMe && (
                          <div className="ml-1">
                            {msg.status === 'read' ? (
                              <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="h-3.5 w-3.5 text-[#667781]" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-[#667781]" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isAiMode && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="flex justify-end mb-4 pr-3">
                  <div className="bg-[#d9fdd3] border-none rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-[#111b21] animate-bounce opacity-70" />
                      <span className="text-xs text-[#111b21] animate-pulse font-medium">La IA está pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Suggestion Box */}
            {aiSuggestion && (
              <div className="px-4 py-3 bg-primary/5 border-t border-primary/10 animate-in slide-in-from-bottom-2">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-primary mb-1">Sugerencia de IA</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiSuggestion}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={useSuggestion}>
                      <Send className="h-3 w-3" />
                      Usar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAiSuggestion(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Input Area - DEMO Pill Style */}
            <div className="border-t border-border bg-card shrink-0 p-3 px-4">
              {replyingTo && (
                <div className="px-4 py-2 mb-3 border-l-4 border-primary bg-muted/20 rounded-md flex gap-3 items-center animate-in slide-in-from-bottom-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-primary">
                      Respondiendo a {replyingTo.role === 'user' ? (selectedConversation?.name || 'Usuario') : 'Tú'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <>
                    <div className="flex-1 flex items-center gap-1 bg-muted/40 rounded-full px-3 border border-border/40 h-12">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent p-0 transition-colors">
                            <Smile className="h-5 w-5" strokeWidth={2} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0 border-none shadow-2xl mb-4 ml-4 rounded-3xl overflow-hidden" align="start">
                          <EmojiPicker 
                            onEmojiClick={onEmojiClick}
                            theme={Theme.LIGHT}
                            width="100%"
                            height="400px"
                            lazyLoadEmojis={true}
                            searchPlaceholder="Buscar..."
                            skinTonesDisabled
                            previewConfig={{ showPreview: false }}
                          />
                        </PopoverContent>
                      </Popover>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent p-0 transition-colors">
                            <Paperclip className="h-5 w-5" strokeWidth={2} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-52 mb-4 ml-6 p-1 rounded-2xl shadow-2xl border-none bg-white animate-in slide-in-from-bottom-2">
                          <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <FileText className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-[15px]">Documento</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                              <Image className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-[15px]">Fotos y videos</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect}
                        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                      />

                      <div className="flex-1 relative flex items-center">
                        <Input
                          placeholder={isAiMode ? "La IA responde automáticamente..." : "Escribe un mensaje..."}
                          className="h-9 text-[14px] border-none focus-visible:ring-0 bg-transparent px-2 placeholder:text-muted-foreground/60 w-full shadow-none"
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSend()}
                          disabled={uploading}
                        />
                        {uploading && (
                          <div className="absolute right-2 text-primary animate-spin">
                            <Loader2 className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {messageText.trim() ? (
                        <Button 
                          className="h-11 w-11 rounded-full bg-[#008055] hover:bg-[#006644] shadow-md flex items-center justify-center p-0 transition-all active:scale-90 border-0" 
                          onClick={() => handleSend('text')}
                        >
                          <Send className="h-5 w-5 text-white ml-0.5" strokeWidth={2.5} />
                        </Button>
                      ) : (
                        <Button 
                          className="h-11 w-11 rounded-full bg-[#008055] hover:bg-[#006644] shadow-md flex items-center justify-center p-0 transition-all active:scale-90 border-0"
                          onClick={startRecording}
                        >
                          <Mic className="h-5 w-5 text-white" strokeWidth={2.5} />
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-between bg-red-50/50 rounded-full px-4 h-12 border border-red-200/30 animate-in slide-in-from-right-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-bold font-mono text-red-600">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-100/50 font-bold px-3 rounded-full" onClick={cancelRecording}>
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Cancelar
                      </Button>
                      <Button size="sm" className="h-8 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold px-4 shadow-sm" onClick={stopRecording}>
                        <Check className="h-4 w-4 mr-1.5" />
                        Enviar
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
            <p className="text-sm max-w-xs mt-2">
              Haz clic en una conversación para ver los mensajes e interactuar a través de WhatsApp.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

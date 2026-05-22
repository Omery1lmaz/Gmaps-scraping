import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api, waApi } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Phone,
  RefreshCcw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
  Zap,
  Gauge,
  Activity,
  Flame,
  Layers,
  Tag,
  Notebook,
  Music4,
  Video,
  File,
  FileSpreadsheet,
  ArrowDown,
  MessageCircle as MessageCircleIcon,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Lock,
  History,
} from 'lucide-react';

import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { cn, safeFormatDate } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const WA_ENGINE_URL = import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002';

const MESSAGES_PER_PAGE = 50;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function displayName(chat: any) {
  return chat?.lead?.businessName || chat?.contact?.name || chat?.contact?.pushName || chat?.name || chat?.contact?.phone || chat?.jid || 'WhatsApp';
}

function statusTone(status: string) {
  if (status === 'CONNECTED') return 'bg-emerald-500 text-white shadow-emerald-500/20';
  if (status === 'QR_READY') return 'bg-amber-400 text-black shadow-amber-400/20';
  if (status === 'ERROR') return 'bg-rose-500 text-white shadow-rose-500/20';
  if (status === 'AUTHENTICATED') return 'bg-emerald-400 text-white shadow-emerald-400/20';
  if (status === 'INITIALIZING') return 'bg-blue-500 text-white shadow-blue-500/20';
  return 'bg-slate-500 text-white shadow-slate-500/10';
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType?.startsWith('image/')) return <ImageIcon className="size-5 text-emerald-500" />;
  if (mimeType?.startsWith('audio/')) return <Music4 className="size-5 text-purple-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="size-5 text-blue-500" />;
  if (mimeType?.includes('pdf')) return <FileText className="size-5 text-red-500" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return <FileSpreadsheet className="size-5 text-green-600" />;
  if (mimeType?.includes('text') || mimeType?.includes('document') || mimeType?.includes('word')) return <FileText className="size-5 text-emerald-500" />;
  return <File className="size-5 text-slate-500" />;
}

function MediaPreview({ media }: { media: any }) {
  const t = useT();
  const url = media.publicUrl?.startsWith('http') ? media.publicUrl : `${API_URL.replace('/api', '')}${media.publicUrl}`;
  const isImage = media.mimeType?.startsWith('image/');
  const isAudio = media.mimeType?.startsWith('audio/');
  const isVideo = media.mimeType?.startsWith('video/');

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="group relative mt-2 block overflow-hidden rounded-xl border border-white/10 bg-[#0c1220]/50 backdrop-blur-sm/5 transition hover:scale-[1.02]">
        <img src={url} alt={media.fileName || 'WhatsApp Medya'} className="max-h-72 w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl">
          <Download className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </a>
    );
  }

  if (isAudio) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-[#0c1220]/50 backdrop-blur-sm/5 p-3">
        <audio controls className="w-full h-10" preload="metadata">
          <source src={url} type={media.mimeType} />
          {t('wp_browser_no_audio')}
        </audio>
        <p className="mt-1.5 text-[10px] font-bold text-slate-400 truncate">{media.fileName || 'Ses kaydı'}</p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black">
        <video controls className="max-h-72 w-full" preload="metadata">
          <source src={url} type={media.mimeType} />
          {t('wp_browser_no_video')}
        </video>
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 truncate bg-black/50">{media.fileName || 'Video'}</p>
      </div>
    );
  }

  // Documents (PDF, Excel, etc.)
  const fileSize = media.size ? (media.size / 1024).toFixed(media.size > 1048576 ? 1 : 0) : '0';
  const unit = media.size > 1048576 ? 'MB' : 'KB';
  const displaySize = media.size > 1048576 ? (media.size / 1048576).toFixed(1) : fileSize;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1220]/50 backdrop-blur-sm/10 p-3 text-sm font-bold text-slate-700 hover:bg-[#0c1220]/50 backdrop-blur-sm/20 transition group">
      <FileIcon mimeType={media.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{media.fileName || 'Dosya'}</p>
        <p className="text-[10px] font-semibold text-slate-400">{displaySize} {unit}</p>
      </div>
      <Download className="size-4 text-slate-400 group-hover:text-slate-100 transition shrink-0" />
    </a>
  );
}

function SyncProgressBar({ syncStatus }: { syncStatus: any }) {
  const t = useT();
  if (!syncStatus || syncStatus.status === 'IDLE' || syncStatus.status === 'COMPLETED') {
    if (syncStatus?.status === 'COMPLETED') {
      return (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 px-5 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-xl">
          <span className="flex items-center gap-2"><CheckCircle2 className="size-3.5" /> {t('wp_sync_done')}</span>
          <span className="bg-emerald-500 text-white rounded-full px-2.5 py-0.5">{syncStatus.totalMessages || 0} {t('wp_total_msgs')}</span>
        </div>
      );
    }
    return null;
  }

  const totalChats = syncStatus.totalChats || 0;
  const syncedChats = syncStatus.syncedChats || 0;
  const totalMessages = syncStatus.totalMessages || 0;
  const chatProgress = totalChats > 0 ? (syncedChats / totalChats) * 100 : 0;
  const inChatProgress = syncStatus.totalMessagesInChat > 0 ? ((syncStatus.syncedMessagesInChat || 0) / syncStatus.totalMessagesInChat) * 100 : 0;

  return (
    <div className="rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50/80 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 px-5 py-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          <Loader2 className="size-3.5 animate-spin text-emerald-500" />
          <span>{syncStatus.status}: {syncedChats}/{totalChats} sohbet taranıyor</span>
        </div>
        <span className="bg-emerald-500 text-white rounded-full px-2.5 py-0.5 text-[10px] font-black">{totalMessages} mesaj</span>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-400">
          <span>Genel İlerleme</span>
          <span>{Math.round(chatProgress)}%</span>
        </div>
        <Progress value={chatProgress} className="h-2 bg-slate-200/60 dark:bg-slate-700/60" />
      </div>

      {/* Current chat progress */}
      {syncStatus.lastChatName && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span className="truncate flex-1 mr-2">İşleniyor: {syncStatus.lastChatName}</span>
            <span>{syncStatus.syncedMessagesInChat || 0}/{syncStatus.totalMessagesInChat || '?'} mesaj</span>
          </div>
          <Progress value={inChatProgress} className="h-1.5 bg-slate-200/60 dark:bg-slate-700/60" />
        </div>
      )}
    </div>
  );
}

// Search messages within a chat
function ChatSearchBar({ chatId, onSearch }: { chatId: string; onSearch: (query: string) => void }) {
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  return (
    <div className="relative">
      {searchOpen ? (
        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 2) onSearch(e.target.value);
              if (e.target.value === '') onSearch('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
              if (e.key === 'Escape') { setSearchOpen(false); onSearch(''); }
            }}
            placeholder={t('wp_search_msgs')}
            className="h-8 rounded-xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 pl-3 text-xs font-bold focus-visible:ring-emerald-500/20"
          />
          <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-xl" onClick={() => { setSearchOpen(false); onSearch(''); }}>
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setSearchOpen(true)} title="Mesajlarda ara">
          <Search className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export function WhatsAppPage() {
  const { user, token } = useAuth();
  const t = useT();

  // PRO PLAN RESTRICTION WALL
  if (user && user.plan === 'free') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full relative">
          {/* Background Glows */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          
          <div className="relative bg-[#0c1220]/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px] pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-gradient-to-tr from-emerald-500 to-green-600 p-5 rounded-3xl shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform duration-500">
                <MessageCircle size={40} className="text-black animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                  WhatsApp CRM & <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Mesajlaşma Paneli</span>
                </h2>
                <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
                  WhatsApp Web entegrasyonu, akıllı mesajlaşma ve müşteri yönetim paneli sadece <span className="text-emerald-400 font-black">PRO</span> üyelerimize özeldir.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-4">
                {[
                  { icon: MessageSquare, label: 'Müşterilerle Anlık Yazışma', desc: 'Panelden hiç çıkmadan WhatsApp mesajları gönderin.' },
                  { icon: Zap, label: 'Akıllı Hazır Şablonlar', desc: 'Sık kullanılan mesajları tek tıkla müşteriye iletin.' },
                  { icon: History, label: 'Gelişmiş Mesaj Geçmişi', desc: 'Müşteriyle olan tüm iletişimi tek bir yerden takip edin.' },
                  { icon: ShieldCheck, label: 'Güvenli Bağlantı', desc: 'Resmi WhatsApp Web API altyapısı ile güvenli senkronizasyon.' }
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-left hover:border-emerald-500/30 transition-colors">
                    <feature.icon size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-100">{feature.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 w-full flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => window.location.href = '/billing'}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-8 py-6 rounded-2xl text-base gap-3 group transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles size={20} className="fill-current" />
                  PRO'YA GEÇ VE KULLANMAYA BAŞLA
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  className="border-white/10 bg-white/5 text-slate-300 hover:text-white px-8 py-6 rounded-2xl font-bold transition-all"
                >
                  Geri Dön
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userId = user?.id || '';
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  // Multi-session state mappings
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, string>>({});
  const [sessionQrs, setSessionQrs] = useState<Record<string, string | null>>({});
  const [sessionInfos, setSessionInfos] = useState<Record<string, any>>({});
  const [sessionErrors, setSessionErrors] = useState<Record<string, string | null>>({});
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Computed states for the CURRENTLY selected session
  const status = useMemo(() => {
    if (!selectedSessionId) return 'DISCONNECTED';
    return sessionStatuses[selectedSessionId] || 'DISCONNECTED';
  }, [selectedSessionId, sessionStatuses]);

  const qrCode = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessionQrs[selectedSessionId] || null;
  }, [selectedSessionId, sessionQrs]);

  const sessionInfo = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessionInfos[selectedSessionId] || null;
  }, [selectedSessionId, sessionInfos]);

  const lastErrorMessage = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessionErrors[selectedSessionId] || null;
  }, [selectedSessionId, sessionErrors]);

  // Load sessions
  const { data: sessions = [], refetch: refetchSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['wa-sessions'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/sessions');
      return res.data;
    },
    refetchInterval: 12000,
  });

  // Keep tracking initial session values when sessions list is fetched
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      if (!selectedSessionId || !sessions.some((s: any) => s._id === selectedSessionId)) {
        setSelectedSessionId(sessions[0]._id);
      }
      
      setSessionStatuses(prev => {
        const next = { ...prev };
        sessions.forEach((s: any) => {
          if (next[s._id] === undefined) {
            next[s._id] = s.status || 'DISCONNECTED';
          }
        });
        return next;
      });

      setSessionInfos(prev => {
        const next = { ...prev };
        sessions.forEach((s: any) => {
          if (next[s._id] === undefined && (s.status === 'CONNECTED' || s.status === 'AUTHENTICATED')) {
            next[s._id] = {
              phoneNumber: s.phoneNumber,
              pushName: s.pushName,
              lastConnected: s.lastConnected,
            };
          }
        });
        return next;
      });

      setSessionErrors(prev => {
        const next = { ...prev };
        sessions.forEach((s: any) => {
          if (next[s._id] === undefined) {
            next[s._id] = s.lastErrorMessage || null;
          }
        });
        return next;
      });
    } else {
      setSelectedSessionId(null);
    }
  }, [sessions, selectedSessionId]);

  const [selectedChatId, _setSelectedChatId] = useState<string | null>(null);
  const setSelectedChatId = useCallback((id: string | null) => {
    selectedChatIdRef.current = id;
    _setSelectedChatId(id);
  }, []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [highlightedMsgIndex, setHighlightedMsgIndex] = useState(-1);
  const [searchedMsgIds, setSearchedMsgIds] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Right sidebar tab state
  const [activeTab, setActiveTab] = useState<'chats' | 'accounts'>('chats');
  const [activeRightTab, setActiveRightTab] = useState<'copilot' | 'antiban'>('copilot');

  // Anti-Ban custom state
  const [antiBanMode, setAntiBanMode] = useState<'safe' | 'normal' | 'fast'>('safe');
  const [customDelayMin, setCustomDelayMin] = useState(45);
  const [customDelayMax, setCustomDelayMax] = useState(120);
  const [dailyWarmingLimit, setDailyWarmingLimit] = useState(75);

  // --- PREMIUM EXTENSIONS: TAGS, NOTES, SCHEDULER, ANTI-BAN AUDIT ---

  // Tags Configuration
  const AVAILABLE_TAGS = useMemo(() => [
    { id: 'hot', name: '🔥 Sıcak Satış', className: 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20' },
    { id: 'meeting', name: '📅 Randevu Alındı', className: 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20' },
    { id: 'waiting', name: '⏳ Teklif Bekliyor', className: 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20' },
    { id: 'followup', name: '🔄 Takip Edilecek', className: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20' },
    { id: 'support', name: '🛠️ Destek', className: 'bg-slate-500/10 text-slate-700 hover:bg-slate-500/20' },
  ], []);

  // Tags System state
  const [chatTags, setChatTags] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('wa_chat_tags') || '{}');
    } catch {
      return {};
    }
  });

  const toggleTag = (chatId: string, tagId: string) => {
    setChatTags((prev) => {
      const current = prev[chatId] || [];
      const updated = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId];
      const next = { ...prev, [chatId]: updated };
      localStorage.setItem('wa_chat_tags', JSON.stringify(next));
      return next;
    });
  };

  // Notes System state
  const [chatNotes, setChatNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('wa_chat_notes') || '{}');
    } catch {
      return {};
    }
  });

  const updateNotes = (chatId: string, note: string) => {
    setChatNotes((prev) => {
      const next = { ...prev, [chatId]: note };
      localStorage.setItem('wa_chat_notes', JSON.stringify(next));
      return next;
    });
  };

  // Scheduled Messages System state
  const [scheduledMessages, setScheduledMessages] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('wa_scheduled_messages') || '[]');
    } catch {
      return [];
    }
  });
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleText, setScheduleText] = useState('');

  const scheduleMessage = () => {
    if (!selectedChat?.id || !scheduleText.trim() || !scheduleTime) {
      toast.error('Lütfen mesaj metnini ve gönderim zamanını seçin.');
      return;
    }
    const newSchedule = {
      id: Math.random().toString(36).substring(7),
      chatId: selectedChat.id,
      text: scheduleText,
      time: scheduleTime,
      createdAt: new Date().toISOString(),
    };
    const updatedList = [...scheduledMessages, newSchedule];
    setScheduledMessages(updatedList);
    localStorage.setItem('wa_scheduled_messages', JSON.stringify(updatedList));
    setScheduleText('');
    setScheduleTime('');
    setIsSchedulerOpen(false);
    toast.success('Mesajınız başarıyla zamanlandı!');
  };

  const cancelScheduledMessage = (id: string) => {
    const updatedList = scheduledMessages.filter((m) => m.id !== id);
    setScheduledMessages(updatedList);
    localStorage.setItem('wa_scheduled_messages', JSON.stringify(updatedList));
    toast.success('Zamanlanmış mesaj iptal edildi.');
  };

  // Live Anti-Ban Quality score calculator
  const antiBanAudit = useMemo(() => {
    let score = 100;
    const rules: string[] = [];

    if (customDelayMin < 15) {
      score -= 30;
      rules.push('⚠️ Minimum gecikme çok düşük (<15sn): Spam radarlarına takılma riskiniz yüksektir.');
    } else if (customDelayMin >= 30) {
      rules.push('✅ Minimum gecikme güvenli (>=30sn): WhatsApp spam engelleme için mükemmel.');
    }

    if (customDelayMax < 45) {
      score -= 20;
      rules.push('⚠️ Maksimum gecikme yetersiz (<45sn): WhatsApp yapay davranış hissedebilir.');
    } else if (customDelayMax >= 90) {
      rules.push('✅ Gecikme aralığı geniş: Doğal insan davranışı simülasyonu devrede.');
    }

    if (dailyWarmingLimit > 150) {
      score -= 15;
      rules.push('⚠️ Yüksek günlük limit (>150): Isınmamış yeni numaralar için engellenme sebebi.');
    } else {
      rules.push('✅ Güvenli günlük limit: Numara ısınma seviyeniz için tamamen ideal.');
    }

    return { score: Math.max(20, score), rules };
  }, [customDelayMin, customDelayMax, dailyWarmingLimit]);

  // -------------------------------------------------------------------

  // System health metrics (Simulated dynamic data)
  const metrics = useMemo(() => {
    const isActive = status === 'CONNECTED' || status === 'AUTHENTICATED';
    return {
      latency: socket?.connected ? '32ms' : '---',
      ramUsage: isActive ? '284MB' : '110MB',
      cpuLoad: isActive ? '3.8%' : '0.4%',
      sandbox: isActive ? '1 Aktif' : '0 Pasif',
    };
  }, [socket?.connected, status]);

  const fetchSessionStatus = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const response = await waApi.get(`/status/${sessionId}`);
      setSessionStatuses(prev => ({ ...prev, [sessionId]: response.data.status }));
      setSessionErrors(prev => ({ ...prev, [sessionId]: response.data.lastErrorMessage || null }));
      if (response.data.status === 'CONNECTED' || response.data.status === 'AUTHENTICATED') {
        setSessionInfos(prev => ({
          ...prev,
          [sessionId]: {
            phoneNumber: response.data.phoneNumber,
            pushName: response.data.pushName,
            lastConnected: response.data.lastConnected,
          }
        }));
      }
    } catch (e) {
      console.error('Failed to fetch status for session', sessionId, e);
    }
  };

  useEffect(() => {
    const newSocket = io(WA_ENGINE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', { userId, token });
      sessions.forEach((s: any) => {
        fetchSessionStatus(s._id).catch(() => {});
      });
    });
    newSocket.on('qr', (data: { sessionId?: string; qr: string }) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionQrs((prev) => ({ ...prev, [sId]: data.qr }));
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'QR_READY' }));
      setSessionErrors((prev) => ({ ...prev, [sId]: null }));
    });
    newSocket.on('authenticated', (data: { sessionId?: string }) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'AUTHENTICATED' }));
      setSessionQrs((prev) => ({ ...prev, [sId]: null }));
    });
    newSocket.on('ready', (data: any) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'CONNECTED' }));
      setSessionInfos((prev) => ({ ...prev, [sId]: data }));
      setSessionQrs((prev) => ({ ...prev, [sId]: null }));
      setSessionErrors((prev) => ({ ...prev, [sId]: null }));
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      refetchSessions();
      toast.success('WhatsApp başarıyla bağlandı');
    });
    newSocket.on('disconnected', (data: { sessionId?: string }) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'DISCONNECTED' }));
      setSessionInfos((prev) => {
        const next = { ...prev };
        delete next[sId];
        return next;
      });
      setSessionQrs((prev) => ({ ...prev, [sId]: null }));
      refetchSessions();
    });
    newSocket.on('wa_error', (data: any) => {
      const sId = data.sessionId || selectedSessionId || userId;
      const message = data?.message || 'WhatsApp hatası oluştu';
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'ERROR' }));
      setSessionErrors((prev) => ({ ...prev, [sId]: message }));
      toast.error(message);
    });
    newSocket.on('whatsapp_message', () => {
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      const currentChatId = selectedChatIdRef.current;
      if (currentChatId) {
        queryClient.invalidateQueries({ queryKey: ['wa-messages', currentChatId] });
      }
    });
    newSocket.on('message_status', () => {
      const currentChatId = selectedChatIdRef.current;
      if (currentChatId) {
        queryClient.invalidateQueries({ queryKey: ['wa-messages', currentChatId] });
      }
    });
    newSocket.on('sync_status', () => {
      queryClient.invalidateQueries({ queryKey: ['wa-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
    });

    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, token, userId, sessions.length]);

  const { data: rawChats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['wa-chats', search, filter, selectedSessionId],
    queryFn: async () => {
      const res = await api.get('/whatsapp/chats', { params: { search, filter, sessionId: selectedSessionId } });
      return res.data;
    },
    enabled: (status === 'CONNECTED' || status === 'AUTHENTICATED') && !!selectedSessionId,
    refetchInterval: 8000,
  });

  const chats = useMemo(() => {
    return rawChats.map((chat: any) => ({
      ...chat,
      id: chat._id || chat.id || chat.jid,
    }));
  }, [rawChats]);

  const selectedChat = useMemo(
    () => chats.find((chat: any) => chat.id === selectedChatId) || chats[0],
    [chats, selectedChatId],
  );

  useEffect(() => {
    if (!selectedChatId && chats.length > 0) setSelectedChatId(chats[0].id);
  }, [chats, selectedChatId]);

  // Infinite scroll for messages
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMessages,
  } = useInfiniteQuery({
    queryKey: ['wa-messages', selectedChat?.id, messageSearchQuery, selectedSessionId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params: any = { limit: MESSAGES_PER_PAGE, sessionId: selectedSessionId };
      if (pageParam) params.before = pageParam;
      if (messageSearchQuery) params.search = messageSearchQuery;
      const res = await api.get(`/whatsapp/chats/${selectedChat!.id}/messages`, { params });
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => {
      if (lastPage.hasMore && lastPage.nextCursor) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
    enabled: (status === 'CONNECTED' || status === 'AUTHENTICATED') && !!selectedChat?.id && !!selectedSessionId,
    refetchInterval: 5000,
  });

  // Flatten all messages from all pages, sort by timestamp, and deduplicate
  const allMessages = useMemo(() => {
    if (!messagesData?.pages) return [];
    const flat = messagesData.pages.flatMap((page: any) => page.messages || []);
    // Deduplicate by _id/id
    const seen = new Set<string>();
    const deduped = flat.filter((msg: any) => {
      const key = msg._id || msg.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Sort chronologically (oldest first) by timestamp
    deduped.sort((a: any, b: any) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return tA - tB;
    });
    return deduped;
  }, [messagesData]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current && autoScroll) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    }
  }, [autoScroll]);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [allMessages.length, autoScroll, scrollToBottom]);

  // Detect scroll position to toggle auto-scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(isAtBottom);

    // If at the top, load more messages
    if (el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      setIsLoadingMore(true);
      const prevScrollHeight = el.scrollHeight;
      fetchNextPage().then(() => {
        // Preserve scroll position after older messages are prepended
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }).finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Highlight message search
  useEffect(() => {
    if (messageSearchQuery && allMessages.length > 0) {
      const ids: string[] = [];
      allMessages.forEach((msg: any) => {
        if (msg.body?.toLowerCase().includes(messageSearchQuery.toLowerCase())) {
          ids.push(msg._id || msg.id);
        }
      });
      setSearchedMsgIds(ids);
      setHighlightedMsgIndex(ids.length > 0 ? 0 : -1);
    } else {
      setSearchedMsgIds([]);
      setHighlightedMsgIndex(-1);
    }
  }, [messageSearchQuery, allMessages]);

  const navigateSearchResult = useCallback((direction: 'up' | 'down') => {
    if (searchedMsgIds.length === 0) return;
    setHighlightedMsgIndex((prev) => {
      if (direction === 'up') {
        return prev <= 0 ? searchedMsgIds.length - 1 : prev - 1;
      } else {
        return prev >= searchedMsgIds.length - 1 ? 0 : prev + 1;
      }
    });
  }, [searchedMsgIds]);

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
    enabled: (status === 'CONNECTED' || status === 'AUTHENTICATED') && !!selectedSessionId,
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['wa-sync-status', selectedSessionId],
    queryFn: async () => (await api.get('/whatsapp/sync/status', { params: { sessionId: selectedSessionId } })).data,
    enabled: (status === 'CONNECTED' || status === 'AUTHENTICATED') && !!selectedSessionId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      let media;
      if (selectedFile) {
        media = {
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          data: await fileToDataUrl(selectedFile),
        };
      }
      return api.post(`/whatsapp/chats/${selectedChat.id}/messages`, {
        body: messageText,
        media,
        sessionId: selectedSessionId
      });
    },
    onSuccess: () => {
      setMessageText('');
      setSelectedFile(null);
      setSelectedTemplateId('');
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      queryClient.invalidateQueries({ queryKey: ['wa-messages', selectedChat?.id] });
      setAutoScroll(true);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.message || 'Mesaj gönderilemedi';
      toast.error(`Mesaj hatası: ${msg}`);
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async () => api.post('/whatsapp/chats/start', {
      phone: newPhone,
      content: newMessage,
      sessionId: selectedSessionId
    }),
    onSuccess: (res) => {
      setNewPhone('');
      setNewMessage('');
      setSelectedChatId(res.data.chat?.id || res.data.chat?._id);
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      toast.success('Yeni sohbet başarıyla başlatıldı');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.message || 'Bilinmeyen hata';
      toast.error(`Sohbet başlatılamadı: ${msg}`);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => api.post('/whatsapp/sync', { sessionId: selectedSessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-sync-status', selectedSessionId] });
      toast.success('Senkronizasyon işlemi başlatıldı');
    },
    onError: (error: any) => {
      toast.error('Senkronizasyon başlatılamadı: ' + (error.response?.data?.error || error.message));
    }
  });

  const connectMutation = useMutation({
    mutationFn: async (targetSessionId?: string) => {
      const idToConnect = targetSessionId || selectedSessionId;
      if (!idToConnect) throw new Error('Bağlanacak oturum kimliği bulunamadı');
      const response = await waApi.post(`/connect/${idToConnect}?force=1`);
      return response.data;
    },
    onMutate: () => {
      toast.info('Yeni karekod oluşturuluyor, lütfen bekleyin...');
    },
    onSuccess: () => {
      toast.success('Bağlantı motoru başarıyla başlatıldı, karekod üretiliyor...');
      refetchSessions();
    },
    onError: (error: any) => {
      toast.error('Karekod üretilirken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async (targetSessionId?: string) => {
      const idToLogout = targetSessionId || selectedSessionId;
      if (!idToLogout) throw new Error('Bağlantısı kesilecek oturum kimliği bulunamadı');
      const response = await waApi.post(`/logout/${idToLogout}`);
      return response.data;
    },
    onMutate: () => {
      toast.info('Bağlantı kesiliyor, lütfen bekleyin...');
    },
    onSuccess: (_, variables) => {
      const idToLogout = variables || selectedSessionId;
      if (idToLogout) {
        setSessionStatuses(prev => ({ ...prev, [idToLogout]: 'DISCONNECTED' }));
        setSessionInfos(prev => {
          const next = { ...prev };
          delete next[idToLogout];
          return next;
        });
        setSessionQrs(prev => ({ ...prev, [idToLogout]: null }));
      }
      toast.success('WhatsApp bağlantısı başarıyla kesildi');
      refetchSessions();
    },
    onError: (error: any) => {
      toast.error('Bağlantı kesilirken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionName: string) => {
      const response = await api.post('/whatsapp/sessions', { sessionName });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Yeni WhatsApp hesabı başarıyla eklendi');
      setSelectedSessionId(data._id || data.id);
      refetchSessions();
      setIsCreateModalOpen(false);
      setNewSessionName('');
    },
    onError: (error: any) => {
      if (error.response?.data?.error === 'PLAN_LIMIT_REACHED') {
        setIsLimitModalOpen(true);
      } else {
        toast.error('Hesap eklenirken hata oluştu: ' + (error.response?.data?.error || error.message));
      }
    }
  });

  const renameSessionMutation = useMutation({
    mutationFn: async ({ sessionId, sessionName }: { sessionId: string; sessionName: string }) => {
      const response = await api.put(`/whatsapp/sessions/${sessionId}`, { sessionName });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Hesap adı güncellendi');
      refetchSessions();
      setEditingSessionId(null);
    },
    onError: (error: any) => {
      toast.error('Hesap adı güncellenirken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.delete(`/whatsapp/sessions/${sessionId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Hesap başarıyla kaldırıldı');
      refetchSessions();
    },
    onError: (error: any) => {
      toast.error('Hesap kaldırılırken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleRename = (sessionId: string) => {
    if (!editName.trim()) {
      toast.error('Lütfen geçerli bir isim girin');
      return;
    }
    renameSessionMutation.mutate({ sessionId, sessionName: editName });
  };

  const convertLeadMutation = useMutation({
    mutationFn: async () => api.post(`/whatsapp/contacts/${selectedChat.contact?.id || selectedChat.contactId || selectedChat.id}/convert-lead`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      toast.success('Kişi başarıyla B2B lead olarak dönüştürüldü');
    },
    onError: () => toast.error('Kişi lead olarak dönüştürülemedi'),
  });

  // Dual-trigger suggest reply logic supporting customized context
  const suggestReplyMutation = useMutation({
    mutationFn: async (promptContext?: string) => {
      const history = allMessages.slice(-10).map((m: any) => `${m.direction}: ${m.body || ''}`).join('\n');
      const res = await api.post('/ai/suggest-reply', {
        leadId: selectedChat?.leadId,
        history,
        promptContext
      });
      return res.data;
    },
    onSuccess: (data) => setMessageText(data.suggestion),
    onError: () => toast.error('AI yanıt önerisi oluşturulamadı'),
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find((item: any) => item.id === templateId);
    if (!template) return;
    const lead = selectedChat?.lead || {};
    const contact = selectedChat?.contact || {};
    const vars: Record<string, string> = {
      businessName: lead.businessName || displayName(selectedChat),
      city: lead.city || '',
      category: lead.category || '',
      rating: lead.rating?.toString?.() || '',
      website: lead.website || '',
      phone: lead.phone || contact.phone || '',
    };
    let content = template.content;
    Object.entries(vars).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    setMessageText(content);
  };

  const handleSend = () => {
    if (!selectedChat?.id || (!messageText.trim() && !selectedFile)) return;
    sendMutation.mutate();
  };

  // Preset configuration for anti-ban
  useEffect(() => {
    if (antiBanMode === 'safe') {
      setCustomDelayMin(60);
      setCustomDelayMax(180);
      setDailyWarmingLimit(40);
    } else if (antiBanMode === 'normal') {
      setCustomDelayMin(30);
      setCustomDelayMax(90);
      setDailyWarmingLimit(80);
    } else {
      setCustomDelayMin(10);
      setCustomDelayMax(35);
      setDailyWarmingLimit(150);
    }
  }, [antiBanMode]);

  // Mobile panel toggles (visible only on small screens)
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const connected = status === 'CONNECTED' || status === 'AUTHENTICATED';

  const planLimits: Record<string, number> = {
    'free': 0,
    'starter': 1,
    'pro': 3,
    'enterprise': 10
  };
  const currentLimit = planLimits[user?.plan || 'starter'] || 1;

  const handleAddNewSessionClick = () => {
    if (sessions.length >= currentLimit) {
      setIsLimitModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const renderCreateSessionModal = () => {
    if (!isCreateModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="relative w-full max-w-md bg-[#0c1220]/90 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-bl-[80px] pointer-events-none" />
          
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <MessageSquare size={16} />
              </span>
              <span>Yeni WhatsApp Hesabı Ekle</span>
            </h3>
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="text-slate-400 hover:text-white transition p-1"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Hesap Adı / Etiketi
              </label>
              <Input
                type="text"
                placeholder="Örn: Müşteri Destek, Satış Ekibi"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="h-11 rounded-xl border-white/5 bg-white/5 text-slate-100 placeholder-slate-500 focus-visible:ring-emerald-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createSessionMutation.mutate(newSessionName);
                  }
                }}
              />
              <p className="text-[10px] font-semibold text-slate-500">
                Bu ismi hesabı ayırt etmek için panellerde kullanacaksınız.
              </p>
            </div>

            <div className="flex gap-3 pt-3">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 h-11 border-white/5 bg-white/5 text-slate-300 hover:text-white rounded-xl font-bold transition-all"
              >
                İptal
              </Button>
              <Button
                onClick={() => createSessionMutation.mutate(newSessionName)}
                disabled={createSessionMutation.isPending || !newSessionName.trim()}
                className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl shadow-lg shadow-emerald-500/10 transition-all gap-2"
              >
                {createSessionMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Hesap Oluştur'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLimitModal = () => {
    if (!isLimitModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="relative w-full max-w-lg bg-[#0c1220]/90 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/15 to-transparent rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="bg-gradient-to-tr from-amber-400 to-amber-600 p-4.5 rounded-3xl shadow-xl shadow-amber-500/20 animate-bounce">
              <Shield size={36} className="text-black" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-white uppercase leading-tight">
                Hesap Limitine <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">Ulaştınız!</span>
              </h3>
              <p className="text-slate-400 text-sm font-semibold max-w-sm mx-auto leading-relaxed">
                Mevcut paketinizdeki maksimum WhatsApp hesabı limitini aştınız. Daha fazla cihaz bağlamak için paketinizi yükseltin.
              </p>
            </div>

            {/* Current vs Next Limits comparison */}
            <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4.5 text-left space-y-3.5">
              <p className="text-xs font-black text-slate-300 uppercase tracking-wider">Plan Limitleri Karşılaştırması</p>
              
              <div className="space-y-2.5">
                {[
                  { plan: 'Starter', limit: '1 Hesap', active: user?.plan === 'starter' },
                  { plan: 'Growth (PRO)', limit: '3 Hesap', active: user?.plan === 'pro' },
                  { plan: 'Agency (Enterprise)', limit: '10 Hesap', active: user?.plan === 'enterprise' }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-colors",
                      item.active 
                        ? "bg-amber-500/10 border-amber-500/20 text-white font-bold" 
                        : "bg-white/5 border-white/5 text-slate-400"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className={item.active ? "text-amber-400" : "text-slate-600"} />
                      {item.plan}
                    </span>
                    <span className={item.active ? "text-amber-400 font-black" : "font-bold"}>{item.limit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button 
                onClick={() => setIsLimitModalOpen(false)}
                variant="outline" 
                className="border-white/10 bg-white/5 text-slate-300 hover:text-white px-6 h-12 rounded-2xl font-bold transition-all"
              >
                Kapat
              </Button>
              <Button 
                onClick={() => window.location.href = '/billing'}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 h-12 rounded-2xl gap-2 group transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
              >
                <Sparkles size={16} className="fill-current" />
                ÜYELİK PAKETİNİ YÜKSELT
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (sessions.length === 0 && !sessionsLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-transparent">
        <div className="max-w-2xl w-full relative">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          
          <div className="relative bg-[#0c1220]/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl overflow-hidden group text-center space-y-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px] pointer-events-none" />
            
            <div className="flex flex-col items-center space-y-5">
              <div className="bg-gradient-to-tr from-emerald-500 to-green-600 p-6 rounded-3xl shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform duration-500">
                <MessageCircle size={44} className="text-black animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                  WhatsApp CRM & <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Çoklu Oturum Yönetimi</span>
                </h2>
                <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
                  İlk WhatsApp hesabınızı ekleyerek B2B müşterilerinizle otomatik şablonlar, AI yanıt önerileri ve akıllı gecikme koruması ile yazışmaya başlayın.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
              {[
                { title: 'Çoklu Oturum', desc: 'Birden fazla WhatsApp hesabını aynı anda bağlı tutun ve yönetin.' },
                { title: 'Hazır Şablonlar', desc: 'Müşteri verileriyle otomatik olarak doldurulan şablonlarla hız kazanın.' },
                { title: 'AI Copilot', desc: 'Müşterilerinizin profilini analiz eden akıllı AI asistanı.' }
              ].map((feature, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all duration-300">
                  <p className="text-xs font-black text-emerald-400">{feature.title}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1.5 leading-normal">{feature.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleAddNewSessionClick}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-8 py-6 rounded-2xl text-base gap-2.5 transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
              >
                <UserPlus size={18} />
                İLK HESABI BAĞLA VE BAŞLA
              </Button>
            </div>
          </div>
        </div>
        {renderCreateSessionModal()}
        {renderLimitModal()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-104px)] overflow-hidden p-6 gap-6">
      {/* Page Header with Tabs */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">{t('wp_whatsapp')}</h1>
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('chats')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black transition-all",
              activeTab === 'chats' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            {t('wp_tab_all')}
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black transition-all",
              activeTab === 'accounts' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            {t('wp_whatsapp_accounts')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'accounts' ? (
          <div className="h-full overflow-y-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Sistem Sağlık Monitörü */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-white/5 bg-[#0c1220]/60 p-4 shadow-lg flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="size-6 text-emerald-500" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t('wp_active_connections')}</p>
                  <p className="text-2xl font-black text-white">{sessions.filter((s: any) => (sessionStatuses[s._id] || s.status) === 'CONNECTED').length} / {sessions.length}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#0c1220]/60 p-4 shadow-lg flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 rounded-lg"><AlertCircle className="size-6 text-rose-500" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t('wp_failed_accounts')}</p>
                  <p className="text-2xl font-black text-rose-500">{sessions.filter((s: any) => (sessionStatuses[s._id] || s.status) === 'ERROR').length}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#0c1220]/60 p-4 shadow-lg flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg"><Clock className="size-6 text-amber-500" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t('wp_pending_qr')}</p>
                  <p className="text-2xl font-black text-amber-500">{sessions.filter((s: any) => ['QR_READY', 'INITIALIZING'].includes(sessionStatuses[s._id] || s.status)).length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 hover:border-white/10 bg-[#0c1220]/40 backdrop-blur-sm p-4.5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Layers size={16} className="text-emerald-500" />
                  <span>{t('wp_whatsapp_accounts')} ({sessions.length} / {currentLimit === 10 ? '∞' : currentLimit})</span>
                </h3>
                <Button
                  size="sm"
                  onClick={handleAddNewSessionClick}
                  className="h-8.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[11px] rounded-xl px-3.5 gap-1.5 transition active:scale-95 duration-200 shadow-md shadow-emerald-500/10"
                >
                  <UserPlus size={13} />
                  {t('wp_add_new_account')}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sessions.map((session: any) => {
                  const isSelected = selectedSessionId === session._id;
                  const sessStatus = sessionStatuses[session._id] || session.status || 'DISCONNECTED';
                  const sessInfo = sessionInfos[session._id] || (session.status === 'CONNECTED' ? { phoneNumber: session.phoneNumber, pushName: session.pushName } : null);
                  const isEditing = editingSessionId === session._id;

                  return (
                    <div
                      key={session._id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedSessionId(session._id);
                          setSelectedChatId(null);
                        }
                      }}
                      className={cn(
                        "relative flex flex-col p-4 rounded-2xl border transition-all duration-300 cursor-pointer shadow-lg",
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 shadow-emerald-500/20"
                          : "border-white/5 bg-[#0c1220]/60 hover:bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "flex items-center justify-center size-8 rounded-full font-black text-xs",
                            isSelected ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"
                          )}>
                            {session.sessionName?.charAt(0).toUpperCase() || 'W'}
                          </div>
                          {isEditing ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 w-24 text-xs bg-slate-950 border-white/10"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(session._id);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-bold text-white truncate">{session.sessionName || t('wp_account')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSessionId(session._id); setEditName(session.sessionName); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 space-y-1 mb-3">
                        <p className="text-[11px] text-slate-400">{sessInfo?.phoneNumber ? `+${sessInfo.phoneNumber}` : t('wp_number_not_linked')}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                          <span className={cn("size-2 rounded-full", sessStatus === 'CONNECTED' ? "bg-emerald-500" : sessStatus === 'QR_READY' ? "bg-amber-400" : "bg-rose-500")} />
                          {sessStatus === 'CONNECTED' ? t('wp_active') : sessStatus === 'QR_READY' ? t('wp_qr_ready') : t('wp_disconnected')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                        <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(t('wp_confirm_remove'))) {
                                deleteSessionMutation.mutate(session._id);
                              }
                            }}
                            className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                        >
                          {t('wp_remove_account')}
                        </button>
                        {sessStatus === 'CONNECTED' && (
                          <button
                              onClick={(e) => { e.stopPropagation(); logoutMutation.mutate(session._id); }}
                              className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition"
                          >
                            {t('wp_disconnect')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <SyncProgressBar syncStatus={syncStatus} />
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-[330px_minmax(0,1fr)_340px] gap-6 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {/* Sohbet Listesi */}
            <section className={cn(showLeftPanel ? 'block' : 'hidden', 'md:flex min-h-0 flex-col rounded-2xl border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm shadow-xl backdrop-blur-md')}>
              <div className="space-y-3 border-b border-slate-100/60 dark:border-slate-800/60 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('wp_search_chats')} className="h-11 rounded-2xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 pl-9 text-xs font-bold focus-visible:ring-emerald-500/20" />
                </div>
                <Select value={filter} onValueChange={(value) => setFilter(value || 'all')}>
                  <SelectTrigger className="h-10 rounded-2xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 text-xs font-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">💬 {t('wp_tab_all')}</SelectItem>
                    <SelectItem value="unread">📬 {t('wp_tab_unread')}</SelectItem>
                    <SelectItem value="leads">⭐ {t('wp_tab_leads')}</SelectItem>
                    <SelectItem value="contacts">👤 {t('wp_tab_contacts')}</SelectItem>
                    <SelectItem value="groups">👥 {t('wp_tab_groups')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1.5 p-3">
                  {chatsLoading ? (
                    <div className="space-y-2 px-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 bg-[#0c1220]/50 backdrop-blur-sm/50 bg-white/5/20 p-3 shadow-xl animate-pulse">
                          <div className="size-11 rounded-xl bg-slate-200 dark:bg-slate-700/50 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 rounded-md bg-slate-200 dark:bg-slate-700/50" />
                            <div className="h-2 w-1/2 rounded-md bg-white/5 bg-white/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-400 leading-relaxed">
                      {!connected ? t('wp_chats_loading') : t('wp_no_chats_found')}
                    </div>) : chats.map((chat: any) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={cn(
                        'w-full rounded-xl border border-transparent p-4 text-left transition-all duration-300 hover:bg-white/5 group',
                        selectedChat?.id === chat.id
                          ? 'bg-emerald-500/10 border-emerald-500/20 shadow-inner'
                          : 'hover:border-white/5',
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'flex size-12 shrink-0 items-center justify-center rounded-2xl font-black text-lg transition',
                          selectedChat?.id === chat.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                        )}>
                          {displayName(chat).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="truncate text-sm font-bold text-white group-hover:text-emerald-400 transition">{displayName(chat)}</p>
                            {chat.lastMessageAt && <span className="text-[10px] font-bold text-slate-500">{safeFormatDate(chat.lastMessageAt, 'HH:mm')}</span>}
                          </div>
                          <p className="truncate text-[11px] font-medium text-slate-500 leading-snug">
                            {chat.lastMessagePreview || chat.messages?.[0]?.body || '...'}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {chat.leadId && <Badge className="border-none bg-emerald-500/10 text-[9px] font-black text-emerald-500 px-2 py-0.5 rounded-md uppercase">LEAD</Badge>}
                            {chat.unreadCount > 0 && (
                              <span className="flex items-center justify-center size-5 rounded-full bg-emerald-500 text-[10px] font-black text-white">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </section>

            {/* Mesaj Alanı ve Sağ Panel içeriği buraya gelecek (kısaltıldı) */}
            {/* ... */}
      <div className="md:hidden flex items-center justify-between gap-2 p-2">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={() => setShowLeftPanel(!showLeftPanel)} aria-label="Sohbet listesi göster/gizle">
            <MessageCircle className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={() => setShowRightPanel(!showRightPanel)} aria-label="Kontroller göster/gizle">
            <Sparkles className="size-4" />
          </Button>
        </div>
        <div className="text-xs font-black text-slate-400">WhatsApp</div>
        <div />
      </div>

      {/* Main Container Layout split into 3 Column View */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[330px_minmax(0,1fr)_340px] gap-4">

        {/* LEFT COLUMN: Chat list */}
        <section className={cn(showLeftPanel ? 'block' : 'hidden', 'md:flex min-h-0 flex-col rounded-2xl border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm shadow-xl backdrop-blur-md')}>
          <div className="space-y-3 border-b border-slate-100/60 dark:border-slate-800/60 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('wp_search_chats')} className="h-11 rounded-2xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 pl-9 text-xs font-bold focus-visible:ring-emerald-500/20" />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value || 'all')}>
              <SelectTrigger className="h-10 rounded-2xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 text-xs font-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">💬 {t('wp_tab_all')}</SelectItem>
                <SelectItem value="unread">📬 {t('wp_tab_unread')}</SelectItem>
                <SelectItem value="leads">⭐ {t('wp_tab_leads')}</SelectItem>
                <SelectItem value="contacts">👤 {t('wp_tab_contacts')}</SelectItem>
                <SelectItem value="groups">👥 {t('wp_tab_groups')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1.5 p-3">
              {chatsLoading ? (
                <div className="space-y-2 px-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 bg-[#0c1220]/50 backdrop-blur-sm/50 bg-white/5/20 p-3 shadow-xl animate-pulse">
                      <div className="size-11 rounded-xl bg-slate-200 dark:bg-slate-700/50 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded-md bg-slate-200 dark:bg-slate-700/50" />
                        <div className="h-2 w-1/2 rounded-md bg-white/5 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400 leading-relaxed">
                  {!connected ? t('wp_chats_loading') : t('wp_no_chats_found')}
                </div>              ) : chats.map((chat: any) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={cn(
                    'w-full rounded-xl border border-transparent p-4 text-left transition-all duration-300 hover:bg-white/5 group',
                    selectedChat?.id === chat.id
                      ? 'bg-emerald-500/10 border-emerald-500/20 shadow-inner'
                      : 'hover:border-white/5',
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-2xl font-black text-lg transition',
                      selectedChat?.id === chat.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                    )}>
                      {displayName(chat).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="truncate text-sm font-bold text-white group-hover:text-emerald-400 transition">{displayName(chat)}</p>
                        {chat.lastMessageAt && <span className="text-[10px] font-bold text-slate-500">{safeFormatDate(chat.lastMessageAt, 'HH:mm')}</span>}
                      </div>
                      <p className="truncate text-[11px] font-medium text-slate-500 leading-snug">
                        {chat.lastMessagePreview || chat.messages?.[0]?.body || '...'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {chat.leadId && <Badge className="border-none bg-emerald-500/10 text-[9px] font-black text-emerald-500 px-2 py-0.5 rounded-md uppercase">LEAD</Badge>}
                        {chat.unreadCount > 0 && (
                          <span className="flex items-center justify-center size-5 rounded-full bg-emerald-500 text-[10px] font-black text-white">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </section>

        {/* MIDDLE COLUMN: Message history & details */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm shadow-xl backdrop-blur-md relative overflow-hidden">
          {!connected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto space-y-8 animate-in fade-in duration-500">
              {/* Background Glows */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative space-y-3 z-10">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  WhatsApp Hesabınızı <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Bağlayın</span>
                </h3>
                <p className="text-slate-400 text-xs font-semibold max-w-sm mx-auto leading-relaxed">
                  Hesabınızı entegre etmek için aşağıdaki adımları izleyin ve karekodu taratın.
                </p>
              </div>

              {/* QR Code / Spinner Container */}
              <div className="relative z-10 flex flex-col items-center justify-center min-h-[300px] w-full max-w-sm bg-[#0c1220]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                {status === 'QR_READY' && qrCode ? (
                  <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                    <div className="p-3 bg-white rounded-2xl shadow-2xl shadow-emerald-500/20">
                      <QRCodeSVG value={qrCode} size={200} level="H" includeMargin={true} />
                    </div>
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                      <span className="relative flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                      </span>
                      <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">{t('wp_qr_waiting')}</p>
                    </div>
                  </div>
                ) : status === 'INITIALIZING' || connectMutation.isPending ? (
                  <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
                    <div className="relative size-20 flex items-center justify-center">
                      <div className="absolute size-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                      <Loader2 className="size-8 text-emerald-500 animate-spin" />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-black text-white">{t('wp_initializing')}</p>
                      <p className="text-[10px] font-semibold text-slate-500 px-6">{t('wp_connecting_wait')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-300">
                    <div className="size-20 rounded-full bg-slate-800/50 flex items-center justify-center">
                      <AlertCircle className="size-10 text-slate-500" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-black text-white">{t('wp_not_connected')}</p>
                      {lastErrorMessage && <p className="text-[10px] font-semibold text-rose-400 px-6">{lastErrorMessage}</p>}
                    </div>
                    <Button
                      onClick={() => connectMutation.mutate(selectedSessionId as string)}
                      disabled={connectMutation.isPending}
                      className="h-11 px-8 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-full shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      {connectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t('wp_generate_qr')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/5 rounded-2xl p-5 text-left space-y-4">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Adım Adım Kurulum Kılavuzu</p>
                <div className="grid grid-cols-1 gap-3 text-xs font-bold text-slate-400">
                  {[
                    { num: '1', text: 'Telefonunuzda WhatsApp uygulamasını açın.' },
                    { num: '2', text: 'Ayarlar > Bağlı Cihazlar menüsüne gidin.' },
                    { num: '3', text: 'Cihaz Bağla butonuna tıklayın.' },
                    { num: '4', text: 'Yukarıdaki karekodu telefon kameranız ile taratın.' }
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black">
                        {step.num}
                      </span>
                      <span className="leading-relaxed">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedChat ? (
            <>
              <div className="flex flex-col border-b border-slate-100/60 dark:border-slate-800/60 p-4.5 bg-[#0c1220]/50 backdrop-blur-sm/40 bg-[#0c1220]/50 backdrop-blur-sm gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">{displayName(selectedChat)}</h3>
                    <p className="text-[11px] font-bold text-slate-500">{selectedChat.contact?.phone || selectedChat.jid}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChatSearchBar chatId={selectedChat.id} onSearch={setMessageSearchQuery} />
                    <Badge className={cn('border-none px-2.5 py-1 text-[8px] font-black tracking-wider', selectedChat.leadId ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-white/5 bg-white/5 text-slate-100')}>
                      {selectedChat.leadId ? '⭐ LEAD BAĞLI' : '👤 KİŞİ KAYDI'}
                    </Badge>
                  </div>
                </div>

                {/* Search results navigation */}
                {messageSearchQuery && searchedMsgIds.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 px-3 py-2">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {highlightedMsgIndex + 1}/{searchedMsgIds.length} eşleşme bulundu
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => navigateSearchResult('up')}>
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => navigateSearchResult('down')}>
                        <ChevronDown className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 rounded-lg hover:bg-red-50 hover:text-red-600" onClick={() => setMessageSearchQuery('')}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Interactive Tags Selector */}
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100/50 dark:border-slate-800/50 pt-2.5">
                  <span className="text-[10px] font-black text-slate-400 flex items-center gap-1"><Tag size={10} /> Etiketler:</span>
                  {AVAILABLE_TAGS.map((tag) => {
                    const isActive = (chatTags[selectedChat.id] || []).includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(selectedChat.id, tag.id)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[9px] font-black transition-all active:scale-95 duration-200 shadow-xl border',
                          isActive
                            ? tag.className + ' border-transparent'
                            : 'bg-white dark:bg-zinc-950 text-slate-400 border-white/5/65 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        )}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30 p-5"
              >
                {/* Loading more indicator */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-emerald-500" />
                    <span className="ml-2 text-xs font-bold text-slate-400">Daha eski mesajlar yükleniyor...</span>
                  </div>
                )}

                {hasNextPage && !isFetchingNextPage && (
                  <div className="flex justify-center py-2">
                    <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-100" onClick={() => fetchNextPage()}>
                      <ChevronUp className="size-3.5 mr-1" /> Daha eski mesajları yükle
                    </Button>
                  </div>
                )}

                <div className="space-y-4 pb-4">
                  {allMessages.length === 0 && !isFetchingNextPage ? (
                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center py-16 text-slate-300 animate-in fade-in zoom-in-95 duration-500">
                      <div className="relative flex size-20 items-center justify-center rounded-full bg-white/5 bg-white/5 mb-6 shadow-inner animate-in fade-in">
                        <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-20" />
                        <MessageCircleIcon className="size-10 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-black text-slate-700 dark:text-slate-200">{t('wp_no_messages')}</h3>
                      <p className="mt-2 text-sm font-semibold text-slate-400 max-w-[250px] text-center leading-relaxed">
                        {t('wp_no_messages_desc')}
                      </p>
                    </div>
                  ) : allMessages.map((message: any, index: number) => {
                    const isSearchHighlighted = messageSearchQuery && (searchedMsgIds.includes(message._id || message.id)) &&
                      (searchedMsgIds[highlightedMsgIndex] === (message._id || message.id));
                    
                    const prevMessage = index > 0 ? allMessages[index - 1] : null;
                    const currentDate = new Date(message.timestamp).toDateString();
                    const prevDate = prevMessage ? new Date(prevMessage.timestamp).toDateString() : null;
                    const showDateSeparator = currentDate !== prevDate;

                    return (
                      <React.Fragment key={message._id || message.id || index}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-6">
                            <span className="px-3 py-1 bg-white dark:bg-zinc-950 text-[10px] font-bold text-slate-400 rounded-full border border-slate-100 dark:border-slate-700 shadow-xl animate-in fade-in duration-300">
                              {getDateLabel(message.timestamp)}
                            </span>
                          </div>
                        )}
                        <div
                          id={`msg-${message._id || message.id}`}
                          className={cn(
                            'flex transition-all duration-300 rounded-2xl animate-in fade-in slide-in-from-bottom-2',
                            message.direction === 'OUTGOING' ? 'justify-end' : 'justify-start',
                            isSearchHighlighted && 'ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900 bg-emerald-50/30 dark:bg-emerald-500/10 scale-[1.02]'
                          )}
                        >
                          <div className={cn(
                            'max-w-[75%] rounded-2xl px-4.5 py-3 shadow-xl transition duration-300',
                            message.direction === 'OUTGOING'
                              ? 'rounded-tr-sm bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white shadow-emerald-500/10'
                              : 'rounded-tl-sm border border-slate-200/80 dark:border-zinc-800/60 bg-[#0c1220]/50 backdrop-blur-sm bg-white dark:bg-zinc-950 text-white dark:text-slate-200 shadow-slate-100/5',
                          )}>
                            {message.body && (
                              <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed">
                                {messageSearchQuery ? (
                                  highlightText(message.body, messageSearchQuery)
                                ) : (
                                  message.body
                                )}
                              </p>
                            )}
                            {message.media?.map((media: any) => <MediaPreview key={media.id || media._id} media={media} />)}

                            <div className={cn('mt-2 flex flex-col items-end gap-1.5 text-[9px] font-black', message.direction === 'OUTGOING' ? 'text-emerald-100' : 'text-slate-400')}>
                              <div className="flex items-center gap-2">
                                <span>{safeFormatDate(message.timestamp, 'HH:mm')}</span>
                                {message.direction === 'OUTGOING' && (
                                  <span className={cn('uppercase font-black text-[8px] tracking-wider px-1 py-0.5 rounded-md bg-[#0c1220]/50 backdrop-blur-sm/10',
                                    message.status === 'SENT' ? 'text-white' : message.status === 'FAILED' ? 'text-rose-200 bg-rose-500/20' : 'text-amber-200'
                                  )}>
                                    {message.status}
                                  </span>
                                )}
                              </div>
                              {message.status === 'FAILED' && (
                                <span className="text-[9px] text-rose-200 mt-0.5 max-w-[200px] text-right break-words bg-rose-900/30 px-2 py-1 rounded-md border border-rose-500/30 shadow-xl leading-tight">
                                  Hata: {(message.error && message.error.length > 1) ? message.error : 'Mesaj gönderilemedi. WhatsApp bağlantınızı kontrol edin.'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Scheduled Messages List */}
                  {scheduledMessages.filter((m) => m.chatId === selectedChat.id).length > 0 && (
                    <div className="mt-6 rounded-2xl border border-amber-200/50 bg-amber-50/20 p-4 space-y-3.5 shadow-xl animate-fade-in">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5"><Clock className="size-3.5 animate-pulse text-amber-500" /> Bu Sohbet İçin Zamanlanmış Mesajlar</p>
                      <div className="space-y-2">
                        {scheduledMessages.filter((m) => m.chatId === selectedChat.id).map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded-xl bg-[#0c1220]/50 backdrop-blur-sm bg-white dark:bg-zinc-950 border border-slate-100/80 dark:border-slate-800 p-3 text-xs font-semibold text-slate-100 shadow-xl transition hover:border-amber-200/50 duration-200">
                            <div className="min-w-0 flex-1 mr-3">
                              <p className="text-[12px] font-black text-white leading-normal">{m.text}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">🗓️ Gönderim Tarihi: {new Date(m.time).toLocaleString('tr-TR')}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-xl text-rose-600 hover:bg-rose-50 active:scale-95 transition"
                              onClick={() => cancelScheduledMessage(m.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Auto-scroll control button */}
              {!autoScroll && (
                <div className="absolute bottom-24 right-8 z-10">
                  <Button
                    size="icon"
                    className="size-10 rounded-full bg-[#0c1220]/50 backdrop-blur-sm bg-white dark:bg-zinc-950 border border-white/5 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-100"
                    onClick={() => { setAutoScroll(true); scrollToBottom(); }}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              )}

              <div className="border-t border-slate-100/60 dark:border-slate-800/60 p-4.5 bg-[#0c1220]/50 backdrop-blur-sm/40 bg-[#0c1220]/50 backdrop-blur-sm relative">
                {/* Scheduled Message Inline Form */}
                {isSchedulerOpen && (
                  <div className="mb-3 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 p-4 space-y-3 animate-slide-in shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5"><Clock className="size-3.5" /> Mesajı İleri Bir Tarihe Zamanla</span>
                      <button onClick={() => setIsSchedulerOpen(false)} className="text-slate-400 hover:text-slate-100 dark:hover:text-slate-200 transition"><X className="size-4" /></button>
                    </div>
                    <div className="grid grid-cols-[200px_1fr] gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Gönderim Tarihi & Saati</label>
                        <Input
                          type="datetime-local"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="h-9 rounded-xl border-white/5 bg-white dark:bg-zinc-950 text-xs font-bold text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mesaj İçeriği</label>
                        <Textarea
                          placeholder="Zaman geldiğinde otomatik olarak gönderilecek mesajı buraya yazın..."
                          value={scheduleText}
                          onChange={(e) => setScheduleText(e.target.value)}
                          className="min-h-[38px] h-9 resize-none rounded-xl border-white/5 bg-white dark:bg-zinc-950 text-xs font-semibold py-2 focus-visible:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-black text-slate-400 hover:bg-slate-100/80 dark:bg-zinc-900/80" onClick={() => setIsSchedulerOpen(false)}>İptal</Button>
                      <Button size="sm" className="h-8 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/10" onClick={scheduleMessage}>Zamanla & Planla</Button>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-50 bg-white/5 border border-slate-200/80 dark:border-zinc-800/60 px-4 py-2 text-xs font-bold text-slate-100 animate-slide-in">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      {selectedFile.type.startsWith('image/') ? <ImageIcon className="size-4 text-emerald-500" /> :
                        selectedFile.type.startsWith('audio/') ? <Music4 className="size-4 text-purple-500" /> :
                          selectedFile.type.startsWith('video/') ? <Video className="size-4 text-blue-500" /> :
                            <FileText className="size-4 text-slate-500" />}
                      {selectedFile.name}
                    </span>
                    <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-100 dark:hover:text-slate-200 transition"><X className="size-4" /></button>
                  </div>
                )}

                {/* AI suggested reply buttons directly above input */}
                <div className="mb-3 flex flex-wrap items-center gap-2 animate-fade-in">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                    <Sparkles className="size-3 text-amber-500 animate-pulse" /> Akıllı AI Draft:
                  </span>
                  <Button
                    variant="outline"
                    className="h-8 rounded-xl text-[10px] font-black border-emerald-100 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-50 transition active:scale-95 duration-200"
                    disabled={suggestReplyMutation.isPending}
                    onClick={() => suggestReplyMutation.mutate('İşletmeye sunduğumuz B2B gmaps lead scraper ve WhatsApp otomasyon çözümlerimiz hakkında detaylı bilgi ver, özelliklerinden bahset.')}
                  >
                    💡 Bilgi Ver
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 rounded-xl text-[10px] font-black border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95 duration-200"
                    disabled={suggestReplyMutation.isPending}
                    onClick={() => suggestReplyMutation.mutate('İşletmeye 15 dakikalık ücretsiz bir demo ve randevu teklif et, uygun günlerini sor.')}
                  >
                    📅 Randevu Al
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 rounded-xl text-[10px] font-black border-amber-100 bg-amber-50/30 text-amber-700 hover:bg-amber-50 transition active:scale-95 duration-200"
                    disabled={suggestReplyMutation.isPending}
                    onClick={() => suggestReplyMutation.mutate('İşletmeye bugüne özel %20 indirim fırsatı sunan cazip bir teklif yap.')}
                  >
                    🎁 Özel Teklif Yap
                  </Button>

                  {suggestReplyMutation.isPending && (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 ml-auto">
                      <Loader2 className="size-3 animate-spin text-amber-500" /> AI Düşünüyor...
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-white/5 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 duration-200" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="size-4 text-slate-400" />
                  </Button>
                  <Textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Göndermek üzere bir mesaj yazın veya şablon ekleyin..."
                    className="min-h-12 flex-1 resize-none rounded-2xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 p-3 text-xs font-semibold focus-visible:ring-emerald-500/20"
                  />
                  <Button className="h-12 rounded-2xl bg-emerald-600 px-5 font-black hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-600/10 active:scale-95 transition-all duration-200" disabled={sendMutation.isPending || (!messageText.trim() && !selectedFile)} onClick={handleSend}>
                    {sendMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select value={selectedTemplateId} onValueChange={(value) => handleTemplateChange(value || '')}>
                      <SelectTrigger className="h-8.5 w-48 rounded-xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 text-[10px] font-black">
                        <SelectValue placeholder="📄 Şablon seç & doldur" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold">
                        {(templates || []).map((template: any) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Button
                      variant={isSchedulerOpen ? 'secondary' : 'outline'}
                      className={cn(
                        'h-8.5 rounded-xl text-[10px] font-black transition active:scale-95 duration-200 border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 flex items-center gap-1 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80',
                        isSchedulerOpen ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                      onClick={() => setIsSchedulerOpen(!isSchedulerOpen)}
                    >
                      <Clock size={12} className={isSchedulerOpen ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} /> Mesaj Zamanla
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 bg-white/5 border border-slate-200/80 dark:border-zinc-800/60 rounded-xl px-3 py-1.5">
                    <Clock size={12} /> Otomatik gecikme koruması aktif
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <div className="max-w-xs animate-in fade-in">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/5 bg-white/5 text-slate-300 dark:text-zinc-300">
                  <MessageSquare size={26} />
                </div>
                <h4 className="text-sm font-black text-slate-100">{t('wp_chat_not_selected')}</h4>
                <p className="mt-1 text-xs font-semibold text-slate-500">{t('wp_chat_not_selected_desc')}</p>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Tab-based controls: Copilot Insights & Anti-Ban config */}
        <aside className={cn(showRightPanel ? 'block' : 'hidden', 'md:flex min-h-0 flex-col gap-4 rounded-2xl border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm shadow-xl backdrop-blur-md p-4.5')}>
          {/* Tab Selection */}
          <div className="flex rounded-2xl bg-white/5 bg-white/5 p-1 font-bold">
            <button
              onClick={() => setActiveRightTab('copilot')}
              className={cn(
                'flex-1 text-center py-2.5 text-xs rounded-xl font-black transition-all flex items-center justify-center gap-1.5 duration-200',
                activeRightTab === 'copilot' ? 'bg-[#0c1220]/50 backdrop-blur-sm dark:bg-slate-700 shadow-xl text-white' : 'text-slate-400 hover:text-slate-100'
              )}
            >
              <Sparkles size={14} className={activeRightTab === 'copilot' ? 'text-amber-500' : 'text-slate-400'} /> Copilot & Lead
            </button>
            <button
              onClick={() => setActiveRightTab('antiban')}
              className={cn(
                'flex-1 text-center py-2.5 text-xs rounded-xl font-black transition-all flex items-center justify-center gap-1.5 duration-200',
                activeRightTab === 'antiban' ? 'bg-[#0c1220]/50 backdrop-blur-sm dark:bg-slate-700 shadow-xl text-white' : 'text-slate-400 hover:text-slate-100'
              )}
            >
              <ShieldCheck size={14} className={activeRightTab === 'antiban' ? 'text-emerald-500' : 'text-slate-400'} /> Güvenlik & Hız
            </button>
          </div>

          {!connected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative bg-gradient-to-tr from-slate-700 to-slate-800 p-4.5 rounded-2xl shadow-xl shadow-black/20 mb-4 animate-pulse z-10">
                <Lock className="size-8 text-slate-400" />
              </div>
              <h4 className="text-sm font-black text-white mb-2 z-10">Bağlantı Bekleniyor</h4>
              <p className="text-xs font-semibold text-slate-400 max-w-[220px] leading-relaxed z-10">
                Müşteri profil kartı, AI Copilot asistanı ve akıllı güvenlik yapılandırmaları WhatsApp hesabınız bağlandığında aktif olacaktır.
              </p>
            </div>
          ) : activeRightTab === 'copilot' ? (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Context info for lead */}
              {selectedChat ? (
                <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Müşteri Profil Kartı</h3>
                    <div className="mt-2.5 rounded-2xl bg-slate-50 bg-white/5 border border-slate-200/80 dark:border-zinc-800/60 p-4 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-white truncate">{displayName(selectedChat)}</p>
                        <Badge className="border-none bg-emerald-500/10 text-emerald-800 text-[8px] font-black flex items-center gap-0.5">
                          <Flame size={10} className="text-amber-500 fill-amber-500 animate-pulse" /> YÜKSEK
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">{selectedChat.contact?.phone || selectedChat.jid}</p>

                      {selectedChat.lead ? (
                        <div className="mt-4 space-y-2 border-t border-slate-200/60 dark:border-zinc-800/50 dark:border-slate-700/50 pt-3">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                            <span>Sektör (Gmaps):</span>
                            <span className="text-slate-100 font-bold">{selectedChat.lead.category || 'Belirtilmemiş'}</span>
                          </div>
                          {selectedChat.lead.city && (
                            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                              <span>Bölge:</span>
                              <span className="text-slate-100 font-bold">{selectedChat.lead.city}</span>
                            </div>
                          )}
                          {selectedChat.lead.rating && (
                            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                              <span>Puan (Yorum):</span>
                              <span className="text-slate-100 font-bold">{selectedChat.lead.rating} ★ ({selectedChat.lead.reviews || selectedChat.lead.reviewCount || 0})</span>
                            </div>
                          )}
                          {selectedChat.lead.website && (
                            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                              <span>Web:</span>
                              <a href={selectedChat.lead.website} target="_blank" rel="noreferrer" className="text-emerald-500 font-bold truncate max-w-40 hover:underline">{selectedChat.lead.website}</a>
                            </div>
                          )}

                          {/* AI Scores if available */}
                          {selectedChat.lead.aiQualityScore && (
                            <div className="mt-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 space-y-1.5">
                              <div className="flex justify-between text-[10px] font-black text-emerald-800">
                                <span>AI Kalite Puanı:</span>
                                <span>{selectedChat.lead.aiQualityScore}/100</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${selectedChat.lead.aiQualityScore}%` }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4">
                          <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                            Bu kişi henüz lead havuzuna dahil edilmemiş. Lead'e dönüştürerek teklif şablonlarını otomatik veriyle doldurabilir ve AI asistanını aktif edebilirsiniz.
                          </p>
                          <Button
                            className="mt-4.5 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold shadow-lg shadow-emerald-500/10 active:scale-95 transition-all duration-200"
                            disabled={!selectedChat.contact?.id && !selectedChat.id || convertLeadMutation.isPending}
                            onClick={() => convertLeadMutation.mutate()}
                          >
                            {convertLeadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />} Lead'e Dönüştür
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-zinc-900/60" />

                  {/* AI Quick offer Generator */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">AI Copilot Hızlı Aksiyon</h3>
                    <div className="mt-3 space-y-2.5">
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-2xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-white dark:bg-zinc-950 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-500/10 text-slate-100 active:scale-98 transition duration-200"
                        disabled={suggestReplyMutation.isPending}
                        onClick={() => suggestReplyMutation.mutate('İşletmenin sektörel zayıflıklarını kapatacak özel bir %15 hoş geldin indirimi ve B2B otomasyon avantajları sun.')}
                      >
                        🎁 Hoş Geldin İndirimi Sun
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-2xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-white dark:bg-zinc-950 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-500/10 text-slate-100 active:scale-98 transition duration-200"
                        disabled={suggestReplyMutation.isPending}
                        onClick={() => suggestReplyMutation.mutate('İşletme sahibiyle 10 dakikalık çok kısa bir B2B verimlilik analizi zoom çağrısı planlamak için teklif et.')}
                      >
                        📅 Zoom Görüşmesi Teklif Et
                      </Button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-zinc-900/60" />

                  {/* Customer Sticky Notes Widget */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5"><Notebook size={13} className="text-amber-500" /> Müşteri Sticky Notları</h3>
                    <div className="mt-3 relative">
                      <textarea
                        value={chatNotes[selectedChat.id] || ''}
                        onChange={(e) => updateNotes(selectedChat.id, e.target.value)}
                        placeholder="Bu müşteri hakkında önemli notlar alın (Örn. Yetkili Ahmet Bey, Pazartesi günleri aranmak istiyor...)"
                        className="w-full min-h-[90px] rounded-2xl border border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-amber-50/15 dark:bg-amber-500/5 p-3.5 text-xs font-semibold text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-y transition duration-200 leading-relaxed"
                      />
                      <span className="absolute bottom-2.5 right-3 text-[9px] font-black text-slate-400 tracking-wider">✍️ OTOMATİK KAYDEDİLİR</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <p className="text-xs font-bold text-slate-400">Aktif bir sohbet seçtiğinizde, lead analizi ve hızlı AI asistan menüleri burada belirecektir.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
              {/* Anti-ban mode select */}
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Shield size={14} className="text-emerald-500" /> Akıllı Anti-Ban Presets
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-white/5 bg-white/5 p-1 font-bold">
                  {(['safe', 'normal', 'fast'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAntiBanMode(mode)}
                      className={cn(
                        'text-center py-2 text-[10px] rounded-xl font-black capitalize transition-all duration-200',
                        antiBanMode === mode ? 'bg-[#0c1220]/50 backdrop-blur-sm dark:bg-slate-700 shadow-xl text-white' : 'text-slate-400 hover:text-slate-100'
                      )}
                    >
                      {mode === 'safe' ? 'Güvenli' : mode === 'normal' ? 'Normal' : 'Hızlı'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anti-Ban Audit Score Gauge */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800/60 bg-slate-50 bg-white/5 p-4 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Isınma & Güvenlik Skoru</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-black',
                    antiBanAudit.score >= 80 ? 'bg-emerald-500/10 text-emerald-700' :
                      antiBanAudit.score >= 50 ? 'bg-amber-500/10 text-amber-700' :
                        'bg-rose-500/10 text-rose-700 animate-pulse'
                  )}>
                    {antiBanAudit.score} / 100
                  </span>
                </div>

                {/* Progress bar gauge */}
                <div className="w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500 ease-out',
                      antiBanAudit.score >= 80 ? 'bg-emerald-500' :
                        antiBanAudit.score >= 50 ? 'bg-amber-500' :
                          'bg-rose-500'
                    )}
                    style={{ width: `${antiBanAudit.score}%` }}
                  />
                </div>

                {/* Audit alerts */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800/50 dark:border-slate-700/50">
                  {antiBanAudit.rules.map((rule, idx) => (
                    <p key={idx} className="text-[10px] font-bold leading-normal text-slate-400 flex items-start gap-1">{rule}</p>
                  ))}
                </div>
              </div>

              {/* Slider simulation config details */}
              <div className="rounded-2xl bg-slate-50 bg-white/5 border border-slate-200/80 dark:border-zinc-800/60 p-3.5 space-y-3.5 text-xs font-bold text-slate-100">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Min Gönderim Gecikmesi:</span>
                    <span className="text-emerald-600">{customDelayMin} saniye</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="180"
                    value={customDelayMin}
                    onChange={(e) => setCustomDelayMin(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Max Gönderim Gecikmesi:</span>
                    <span className="text-emerald-600">{customDelayMax} saniye</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={customDelayMax}
                    onChange={(e) => setCustomDelayMax(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Günlük Isınma Limiti:</span>
                    <span className="text-emerald-600">{dailyWarmingLimit} /gün</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    value={dailyWarmingLimit}
                    onChange={(e) => setDailyWarmingLimit(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
                <p className="text-[10px] font-semibold text-slate-400 leading-normal">
                  * WhatsApp spam algılama algoritmalarına takılmamak adına gönderiler arasına rastgele gecikmeler eklenir ve günlük limitler dinamik olarak yönetilir.
                </p>
              </div>

              <div className="h-px bg-slate-100 dark:bg-zinc-900/60" />

              {/* Health and system metrics */}
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Gauge size={14} className="text-emerald-500" /> Sistem & Engine Metrikleri
                </h3>
                <div className="mt-3 space-y-2 text-xs font-bold text-slate-100">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 bg-white/5 px-3.5 py-2.5 border border-slate-200/80 dark:border-zinc-800/60">
                    <span className="flex items-center gap-1.5"><Activity size={12} className="text-emerald-500 animate-pulse" /> Ping / Latency</span>
                    <span className="text-emerald-600 font-black">{metrics.latency}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 bg-white/5 px-3.5 py-2.5 border border-slate-200/80 dark:border-zinc-800/60">
                    <span className="flex items-center gap-1.5"><Layers size={12} className="text-amber-500" /> Chromium RAM</span>
                    <span className="text-white font-black">{metrics.ramUsage}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 bg-white/5 px-3.5 py-2.5 border border-slate-200/80 dark:border-zinc-800/60">
                    <span className="flex items-center gap-1.5"><Zap size={12} className="text-indigo-500" /> CPU Yükü</span>
                    <span className="text-white font-black">{metrics.cpuLoad}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 bg-white/5 px-3.5 py-2.5 border border-slate-200/80 dark:border-zinc-800/60">
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Chromium Sandbox</span>
                    <span className="text-white font-black">{metrics.sandbox}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick new chat starter input in right panel footer area */}
          <div className="mt-auto border-t border-slate-100/60 dark:border-slate-800/60 pt-4.5">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Hızlı Yeni Sohbet Başlat</h3>
            <div className="mt-2.5 space-y-2">
              <Input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="Telefon (+90...)" className="h-9.5 rounded-xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-white dark:bg-zinc-950 text-xs font-bold" />
              <Button
                className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow-md shadow-emerald-600/5 active:scale-95 transition-all duration-200"
                disabled={!newPhone || startChatMutation.isPending}
                onClick={() => startChatMutation.mutate()}
              >
                {startChatMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="mr-1.5 size-3.5" />} Yeni Sohbet Aç
              </Button>
            </div>
          </div>
        </aside>

          </>
        )}
      </div>
      {renderCreateSessionModal()}
      {renderLimitModal()}
    </div>
  );
}

// Helper: highlight search text in message body
function highlightText(text: string, query: string) {
  if (!query || !text) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return <mark key={i} className="bg-amber-300 dark:bg-amber-500/40 text-slate-900 text-white px-0.5 rounded">{part}</mark>;
    }
    return part;
  });
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Bugün';
  if (msgDate.getTime() === yesterday.getTime()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

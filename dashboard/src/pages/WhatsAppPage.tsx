import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const WA_ENGINE_URL = import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002';
const MOCK_USER_ID = 'mock-admin-user-id';

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
  if (status === 'QR_READY') return 'bg-blue-500 text-white shadow-blue-500/20';
  if (status === 'ERROR') return 'bg-rose-500 text-white shadow-rose-500/20';
  if (status === 'AUTHENTICATED') return 'bg-amber-500 text-white shadow-amber-500/20';
  return 'bg-slate-400 text-white';
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType?.startsWith('image/')) return <ImageIcon className="size-5 text-emerald-500" />;
  if (mimeType?.startsWith('audio/')) return <Music4 className="size-5 text-purple-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="size-5 text-blue-500" />;
  if (mimeType?.includes('pdf')) return <FileText className="size-5 text-red-500" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return <FileSpreadsheet className="size-5 text-green-600" />;
  if (mimeType?.includes('text') || mimeType?.includes('document') || mimeType?.includes('word')) return <FileText className="size-5 text-blue-600" />;
  return <File className="size-5 text-slate-500" />;
}

function MediaPreview({ media }: { media: any }) {
  const url = media.publicUrl?.startsWith('http') ? media.publicUrl : `${API_URL.replace('/api', '')}${media.publicUrl}`;
  const isImage = media.mimeType?.startsWith('image/');
  const isAudio = media.mimeType?.startsWith('audio/');
  const isVideo = media.mimeType?.startsWith('video/');

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="group relative mt-2 block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:scale-[1.02]">
        <img src={url} alt={media.fileName || 'WhatsApp Medya'} className="max-h-72 w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl">
          <Download className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </a>
    );
  }

  if (isAudio) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
        <audio controls className="w-full h-10" preload="metadata">
          <source src={url} type={media.mimeType} />
          Tarayıcınız ses oynatıcıyı desteklemiyor.
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
          Tarayıcınız video oynatıcıyı desteklemiyor.
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
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3 text-sm font-bold text-slate-700 hover:bg-white/20 transition group">
      <FileIcon mimeType={media.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{media.fileName || 'Dosya'}</p>
        <p className="text-[10px] font-semibold text-slate-400">{displaySize} {unit}</p>
      </div>
      <Download className="size-4 text-slate-400 group-hover:text-slate-600 transition shrink-0" />
    </a>
  );
}

function SyncProgressBar({ syncStatus }: { syncStatus: any }) {
  if (!syncStatus || syncStatus.status === 'IDLE' || syncStatus.status === 'COMPLETED') {
    if (syncStatus?.status === 'COMPLETED') {
      return (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-3 text-xs font-bold text-emerald-700 shadow-sm">
          <span className="flex items-center gap-2"><CheckCircle2 className="size-3.5" /> Senkronizasyon tamamlandı</span>
          <span className="bg-emerald-500 text-white rounded-full px-2.5 py-0.5">{syncStatus.totalMessages || 0} toplam mesaj</span>
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
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 px-5 py-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
          <Loader2 className="size-3.5 animate-spin text-blue-500" />
          <span>{syncStatus.status}: {syncedChats}/{totalChats} sohbet taranıyor</span>
        </div>
        <span className="bg-blue-500 text-white rounded-full px-2.5 py-0.5 text-[10px] font-black">{totalMessages} mesaj</span>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-500">
          <span>Genel İlerleme</span>
          <span>{Math.round(chatProgress)}%</span>
        </div>
        <Progress value={chatProgress} className="h-2 bg-slate-200/60" />
      </div>

      {/* Current chat progress */}
      {syncStatus.lastChatName && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span className="truncate flex-1 mr-2">İşleniyor: {syncStatus.lastChatName}</span>
            <span>{syncStatus.syncedMessagesInChat || 0}/{syncStatus.totalMessagesInChat || '?'} mesaj</span>
          </div>
          <Progress value={inChatProgress} className="h-1.5 bg-slate-200/60" />
        </div>
      )}
    </div>
  );
}

// Search messages within a chat
function ChatSearchBar({ chatId, onSearch }: { chatId: string; onSearch: (query: string) => void }) {
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
            placeholder="Mesajlarda ara..."
            className="h-8 rounded-xl border-slate-200/60 bg-white/80 pl-3 text-xs font-bold focus-visible:ring-blue-500/20"
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
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

  const fetchStatus = async () => {
    const response = await axios.get(`${WA_ENGINE_URL}/status/${MOCK_USER_ID}`);
    setStatus(response.data.status);
    setLastErrorMessage(response.data.lastErrorMessage || null);
    if (response.data.status === 'CONNECTED' || response.data.status === 'AUTHENTICATED') {
      setSessionInfo({
        phoneNumber: response.data.phoneNumber,
        pushName: response.data.pushName,
        lastConnected: response.data.lastConnected,
      });
    }
  };

  useEffect(() => {
    const newSocket = io(WA_ENGINE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', MOCK_USER_ID);
      fetchStatus().catch(() => toast.error('WhatsApp Engine bağlantısı kurulamadı'));
    });
    newSocket.on('qr', (data: { qr: string }) => {
      setQrCode(data.qr);
      setStatus('QR_READY');
      setLastErrorMessage(null);
    });
    newSocket.on('authenticated', () => {
      setStatus('AUTHENTICATED');
      setQrCode(null);
    });
    newSocket.on('ready', (data: any) => {
      setStatus('CONNECTED');
      setSessionInfo(data);
      setQrCode(null);
      setLastErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      toast.success('WhatsApp başarıyla bağlandı');
    });
    newSocket.on('disconnected', () => {
      setStatus('DISCONNECTED');
      setSessionInfo(null);
      setQrCode(null);
    });
    newSocket.on('wa_error', (data: any) => {
      const message = data?.message || 'WhatsApp hatası oluştu';
      setStatus('ERROR');
      setLastErrorMessage(message);
      toast.error(message);
    });
    newSocket.on('whatsapp_message', () => {
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      queryClient.invalidateQueries({ queryKey: ['wa-messages', selectedChatId] });
    });
    newSocket.on('message_status', () => {
      queryClient.invalidateQueries({ queryKey: ['wa-messages', selectedChatId] });
    });
    newSocket.on('sync_status', () => {
      queryClient.invalidateQueries({ queryKey: ['wa-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient, selectedChatId]);

  const { data: rawChats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['wa-chats', search, filter],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/whatsapp/chats`, { params: { search, filter } });
      return res.data;
    },
    enabled: status === 'CONNECTED' || status === 'AUTHENTICATED',
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
    queryKey: ['wa-messages', selectedChat?.id, messageSearchQuery],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params: any = { limit: MESSAGES_PER_PAGE };
      if (pageParam) params.before = pageParam;
      if (messageSearchQuery) params.search = messageSearchQuery;
      const res = await axios.get(`${API_URL}/whatsapp/chats/${selectedChat!.id}/messages`, { params });
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => {
      if (lastPage.hasMore && lastPage.nextCursor) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
    enabled: (status === 'CONNECTED' || status === 'AUTHENTICATED') && !!selectedChat?.id,
    refetchInterval: 5000,
  });

  // Flatten all messages from all pages
  const allMessages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page: any) => page.messages || []);
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
      fetchNextPage().finally(() => {
        setIsLoadingMore(false);
        // Keep scroll position after loading
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
    queryFn: async () => (await axios.get(`${API_URL}/templates`)).data,
    enabled: status === 'CONNECTED' || status === 'AUTHENTICATED',
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['wa-sync-status'],
    queryFn: async () => (await axios.get(`${API_URL}/whatsapp/sync/status`, { params: { userId: MOCK_USER_ID } })).data,
    enabled: status === 'CONNECTED' || status === 'AUTHENTICATED',
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
      return axios.post(`${API_URL}/whatsapp/chats/${selectedChat.id}/messages`, {
        body: messageText,
        userId: MOCK_USER_ID,
        media,
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
    mutationFn: async () => axios.post(`${API_URL}/whatsapp/chats/start`, {
      phone: newPhone,
      content: newMessage,
      userId: MOCK_USER_ID,
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
    mutationFn: async () => axios.post(`${API_URL}/whatsapp/sync`, { userId: MOCK_USER_ID }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-sync-status'] });
      toast.success('Senkronizasyon işlemi başlatıldı');
    },
    onError: (error: any) => {
      toast.error('Senkronizasyon başlatılamadı: ' + (error.response?.data?.error || error.message));
    }
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${WA_ENGINE_URL}/connect/${MOCK_USER_ID}?force=1`);
      return response.data;
    },
    onMutate: () => {
      toast.info('Yeni karekod oluşturuluyor, lütfen bekleyin...');
    },
    onSuccess: () => {
      toast.success('Bağlantı motoru başarıyla başlatıldı, karekod üretiliyor...');
      fetchStatus();
    },
    onError: (error: any) => {
      toast.error('Karekod üretilirken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${WA_ENGINE_URL}/logout/${MOCK_USER_ID}`);
      return response.data;
    },
    onMutate: () => {
      toast.info('Bağlantı kesiliyor, lütfen bekleyin...');
    },
    onSuccess: () => {
      setStatus('DISCONNECTED');
      setSessionInfo(null);
      setQrCode(null);
      toast.success('WhatsApp bağlantısı başarıyla kesildi');
    },
    onError: (error: any) => {
      toast.error('Bağlantı kesilirken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const convertLeadMutation = useMutation({
    mutationFn: async () => axios.post(`${API_URL}/whatsapp/contacts/${selectedChat.contact?.id || selectedChat.contactId || selectedChat.id}/convert-lead`),
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
      const res = await axios.post(`${API_URL}/ai/suggest-reply`, {
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

  const connected = status === 'CONNECTED' || status === 'AUTHENTICATED';

  if (!connected) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center p-6 bg-slate-50/50">
        <div className="w-full max-w-xl rounded-3xl border border-white bg-white/75 p-8 text-center shadow-xl backdrop-blur-xl transition-all duration-300">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-inner">
            {status === 'ERROR' ? <AlertCircle size={38} /> : <MessageSquare size={38} className="animate-pulse" />}
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">WhatsApp Entegrasyonu</h2>
          <p className="mt-3 text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
            WhatsApp hesabınızı bağlayarak Google Maps üzerinde bulduğunuz işletmelerle hemen güvenli iletişim kurmaya başlayabilirsiniz.
          </p>
          <div className="mt-6 flex justify-center">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-sm transition-all', statusTone(status))}>
              <Zap size={12} /> Status: {status}
            </span>
          </div>

          {qrCode && (
            <div className="mt-8 flex flex-col items-center animate-fade-in">
              <div className="relative rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl transition hover:shadow-emerald-500/5 hover:border-emerald-500/10 duration-300">
                <QRCodeSVG value={qrCode} size={250} level="H" />
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 opacity-0 hover:opacity-100 transition-opacity rounded-3xl cursor-pointer">
                  <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs">Barkodu Tara</div>
                </div>
              </div>
              <p className="mt-4 text-xs font-black text-slate-400">Telefonunuzdan WhatsApp web tarayıcısını açıp karekodu okutun.</p>
            </div>
          )}

          {lastErrorMessage && (
            <p className="mt-5 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-700 max-w-md mx-auto shadow-inner leading-relaxed">
              {lastErrorMessage}
            </p>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-5 rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-95 transition-all duration-200"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              <RefreshCcw className={cn("mr-2 size-4", connectMutation.isPending ? "animate-spin" : "animate-spin-slow")} />
              {connectMutation.isPending ? 'QR Kod Üretiliyor...' : 'QR Kod Üret & Yeniden Bağlan'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-104px)] flex-col gap-4 p-1">
      {/* Top Banner Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white bg-white/70 px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="min-w-0">
          <h2 className="flex items-center gap-3 text-2xl font-black text-slate-800">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <MessageCircle size={22} />
            </span>
            <span>WhatsApp Kontrol Merkezi</span>
          </h2>
          <p className="mt-1 text-xs font-black text-slate-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            Aktif Hesap: <span className="text-slate-600">{sessionInfo?.pushName || 'Bağlı hesap'}</span> {sessionInfo?.phoneNumber ? `(+${sessionInfo.phoneNumber})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge className="border-none bg-emerald-500/10 text-emerald-700 px-3.5 py-1.5 text-[10px] font-black tracking-wider"><CheckCircle2 className="mr-1 size-3.5" /> BAĞLI</Badge>
          <Badge className={cn('border-none px-3.5 py-1.5 text-[10px] font-black tracking-wider shadow-sm', socket?.connected ? 'bg-blue-500/10 text-blue-700' : 'bg-rose-500/10 text-rose-700')}>
            SOKET {socket?.connected ? 'ON' : 'OFF'}
          </Badge>
          <Button variant="outline" className="h-10 rounded-2xl text-xs font-black border-slate-200/60 bg-white/60 hover:bg-slate-50 transition active:scale-95 duration-200" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCcw className={cn('mr-2 size-4 text-slate-500', syncMutation.isPending && 'animate-spin')} /> Geçmişi Eşitle
          </Button>
          <Button
            variant="ghost"
            className="h-10 rounded-2xl text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:scale-95 transition duration-200"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-2 size-4" /> {logoutMutation.isPending ? 'Kesiliyor...' : 'Bağlantıyı Kes'}
          </Button>
        </div>
      </div>

      {/* Sync Progress */}
      <SyncProgressBar syncStatus={syncStatus} />

      {/* Main Container Layout split into 3 Column View */}
      <div className="grid min-h-0 flex-1 grid-cols-[330px_minmax(0,1fr)_340px] gap-4">

        {/* LEFT COLUMN: Chat list */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-white/60 bg-white/70 shadow-xl backdrop-blur-md">
          <div className="space-y-3 border-b border-slate-100/60 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sohbet veya kişi ara..." className="h-11 rounded-2xl border-slate-200/60 bg-white/80 pl-9 text-xs font-bold focus-visible:ring-emerald-500/20" />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value || 'all')}>
              <SelectTrigger className="h-10 rounded-2xl border-slate-200/60 bg-white/80 text-xs font-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">💬 Tüm sohbetler</SelectItem>
                <SelectItem value="unread">📬 Okunmamış sohbetler</SelectItem>
                <SelectItem value="leads">⭐ Lead bağlı olanlar</SelectItem>
                <SelectItem value="contacts">👤 Yalnızca kişiler</SelectItem>
                <SelectItem value="groups">👥 Gruplar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1.5 p-3">
              {chatsLoading ? (
                <div className="p-8 text-center text-xs font-black text-slate-400 animate-pulse flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-slate-300" /> Sohbetler yükleniyor...
                </div>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  Arama kriterlerinize uyan sohbet bulunamadı.
                </div>
              ) : chats.map((chat: any) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={cn(
                    'w-full rounded-2xl border p-3.5 text-left transition-all duration-300 active:scale-98',
                    selectedChat?.id === chat.id
                      ? 'border-emerald-500/20 bg-emerald-500/5 shadow-inner'
                      : 'border-transparent hover:bg-slate-50/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm transition',
                      selectedChat?.id === chat.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                    )}>
                      {displayName(chat).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black text-slate-800">{displayName(chat)}</p>
                        {chat.lastMessageAt && <span className="text-[10px] font-bold text-slate-400">{safeFormatDate(chat.lastMessageAt, 'HH:mm')}</span>}
                      </div>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 leading-tight">
                        {chat.lastMessagePreview || chat.messages?.[0]?.body || (chat.jid ? chat.jid.split('@')[0] : 'Yeni Sohbet')}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1">
                        {chat.leadId && <Badge className="border-none bg-blue-100 text-[8px] font-black text-blue-700 px-1.5 py-0.5">LEAD</Badge>}
                        {chat.isGroup && <Badge className="border-none bg-slate-100 text-[8px] font-black text-slate-600 px-1.5 py-0.5">GRUP</Badge>}
                        {chat.unreadCount > 0 && (
                          <Badge className="border-none bg-emerald-500 text-[8px] font-black text-white px-1.5 py-0.5 animate-bounce">
                            {chat.unreadCount} YENİ
                          </Badge>
                        )}
                        {chatTags[chat.id]?.map((tagId) => {
                          const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span key={tagId} className="inline-block rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-200/50 text-slate-700">
                              {tag.name.split(' ')[1] || tag.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </section>

        {/* MIDDLE COLUMN: Message history & details */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-white/60 bg-white/70 shadow-xl backdrop-blur-md">
          {selectedChat ? (
            <>
              <div className="flex flex-col border-b border-slate-100/60 p-4.5 bg-white/40 gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-800">{displayName(selectedChat)}</h3>
                    <p className="text-[11px] font-bold text-slate-400">{selectedChat.contact?.phone || selectedChat.jid}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChatSearchBar chatId={selectedChat.id} onSearch={setMessageSearchQuery} />
                    <Badge className={cn('border-none px-2.5 py-1 text-[8px] font-black tracking-wider', selectedChat.leadId ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}>
                      {selectedChat.leadId ? '⭐ LEAD BAĞLI' : '👤 KİŞİ KAYDI'}
                    </Badge>
                  </div>
                </div>

                {/* Search results navigation */}
                {messageSearchQuery && searchedMsgIds.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                    <span className="text-[11px] font-bold text-blue-700">
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
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100/50 pt-2.5">
                  <span className="text-[10px] font-black text-slate-400 flex items-center gap-1"><Tag size={10} /> Etiketler:</span>
                  {AVAILABLE_TAGS.map((tag) => {
                    const isActive = (chatTags[selectedChat.id] || []).includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(selectedChat.id, tag.id)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[9px] font-black transition-all active:scale-95 duration-200 shadow-sm border',
                          isActive
                            ? tag.className + ' border-transparent'
                            : 'bg-white text-slate-400 border-slate-200/65 hover:bg-slate-50'
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
                className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30 p-5"
              >
                {/* Loading more indicator */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-blue-500" />
                    <span className="ml-2 text-xs font-bold text-slate-500">Daha eski mesajlar yükleniyor...</span>
                  </div>
                )}

                {hasNextPage && !isFetchingNextPage && (
                  <div className="flex justify-center py-2">
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => fetchNextPage()}>
                      <ChevronUp className="size-3.5 mr-1" /> Daha eski mesajları yükle
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  {allMessages.length === 0 && !isFetchingNextPage ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                      <MessageCircleIcon className="size-12 mb-3" />
                      <p className="text-sm font-bold">Henüz mesaj bulunmuyor</p>
                      <p className="text-xs font-semibold mt-1">Yukarıdaki butonu kullanarak geçmişi senkronize edin.</p>
                    </div>
                  ) : allMessages.map((message: any, index: number) => {
                    const isSearchHighlighted = messageSearchQuery && (searchedMsgIds.includes(message._id || message.id)) &&
                      (searchedMsgIds[highlightedMsgIndex] === (message._id || message.id));

                    return (
                      <div
                        key={message._id || message.id || index}
                        id={`msg-${message._id || message.id}`}
                        className={cn(
                          'flex transition-all duration-300 rounded-2xl',
                          message.direction === 'OUTGOING' ? 'justify-end' : 'justify-start',
                          isSearchHighlighted && 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50/30 scale-[1.02]'
                        )}
                      >
                        <div className={cn(
                          'max-w-[75%] rounded-3xl px-4.5 py-3 shadow-sm transition duration-300',
                          message.direction === 'OUTGOING'
                            ? 'rounded-tr-sm bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white shadow-emerald-500/10'
                            : 'rounded-tl-sm border border-slate-100 bg-white text-slate-800 shadow-slate-100/5',
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
                              <span>{safeFormatDate(message.timestamp, 'dd MMM HH:mm')}</span>
                              {message.direction === 'OUTGOING' && (
                                <span className={cn('uppercase font-black text-[8px] tracking-wider px-1 py-0.5 rounded-md bg-white/10',
                                  message.status === 'SENT' ? 'text-white' : message.status === 'FAILED' ? 'text-rose-200 bg-rose-500/20' : 'text-amber-200'
                                )}>
                                  {message.status}
                                </span>
                              )}
                            </div>
                            {message.status === 'FAILED' && (
                              <span className="text-[9px] text-rose-200 mt-0.5 max-w-[200px] text-right break-words bg-rose-900/30 px-2 py-1 rounded-md border border-rose-500/30 shadow-sm leading-tight">
                                Hata: {(message.error && message.error.length > 1) ? message.error : 'Mesaj gönderilemedi. WhatsApp bağlantınızı kontrol edin.'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Scheduled Messages List */}
                  {scheduledMessages.filter((m) => m.chatId === selectedChat.id).length > 0 && (
                    <div className="mt-6 rounded-2xl border border-amber-200/50 bg-amber-50/20 p-4 space-y-3.5 shadow-sm animate-fade-in">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5"><Clock className="size-3.5 animate-pulse text-amber-500" /> Bu Sohbet İçin Zamanlanmış Mesajlar</p>
                      <div className="space-y-2">
                        {scheduledMessages.filter((m) => m.chatId === selectedChat.id).map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded-xl bg-white border border-slate-100/80 p-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-amber-200/50 duration-200">
                            <div className="min-w-0 flex-1 mr-3">
                              <p className="text-[12px] font-black text-slate-800 leading-normal">{m.text}</p>
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
                    className="size-10 rounded-full bg-white border border-slate-200 shadow-lg hover:bg-slate-50 text-slate-600"
                    onClick={() => { setAutoScroll(true); scrollToBottom(); }}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              )}

              <div className="border-t border-slate-100/60 p-4.5 bg-white/40 relative">
                {/* Scheduled Message Inline Form */}
                {isSchedulerOpen && (
                  <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3 animate-slide-in shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-800 flex items-center gap-1.5"><Clock className="size-3.5" /> Mesajı İleri Bir Tarihe Zamanla</span>
                      <button onClick={() => setIsSchedulerOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X className="size-4" /></button>
                    </div>
                    <div className="grid grid-cols-[200px_1fr] gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gönderim Tarihi & Saati</label>
                        <Input
                          type="datetime-local"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mesaj İçeriği</label>
                        <Textarea
                          placeholder="Zaman geldiğinde otomatik olarak gönderilecek mesajı buraya yazın..."
                          value={scheduleText}
                          onChange={(e) => setScheduleText(e.target.value)}
                          className="min-h-[38px] h-9 resize-none rounded-xl border-slate-200 bg-white text-xs font-semibold py-2 focus-visible:ring-blue-500/20"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-black text-slate-500 hover:bg-slate-100" onClick={() => setIsSchedulerOpen(false)}>İptal</Button>
                      <Button size="sm" className="h-8 rounded-lg text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10" onClick={scheduleMessage}>Zamanla & Planla</Button>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-2 text-xs font-bold text-slate-600 animate-slide-in">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      {selectedFile.type.startsWith('image/') ? <ImageIcon className="size-4 text-emerald-500" /> :
                        selectedFile.type.startsWith('audio/') ? <Music4 className="size-4 text-purple-500" /> :
                          selectedFile.type.startsWith('video/') ? <Video className="size-4 text-blue-500" /> :
                            <FileText className="size-4 text-slate-500" />}
                      {selectedFile.name}
                    </span>
                    <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600 transition"><X className="size-4" /></button>
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
                    className="h-8 rounded-xl text-[10px] font-black border-blue-100 bg-blue-50/30 text-blue-700 hover:bg-blue-50 transition active:scale-95 duration-200"
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
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 transition active:scale-95 duration-200" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="size-4 text-slate-500" />
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
                    className="min-h-12 flex-1 resize-none rounded-2xl border-slate-200/60 bg-white/80 p-3 text-xs font-semibold focus-visible:ring-emerald-500/20"
                  />
                  <Button className="h-12 rounded-2xl bg-emerald-600 px-5 font-black hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-600/10 active:scale-95 transition-all duration-200" disabled={sendMutation.isPending || (!messageText.trim() && !selectedFile)} onClick={handleSend}>
                    {sendMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select value={selectedTemplateId} onValueChange={(value) => handleTemplateChange(value || '')}>
                      <SelectTrigger className="h-8.5 w-48 rounded-xl border-slate-200/60 bg-white/80 text-[10px] font-black">
                        <SelectValue placeholder="📄 Şablon seç & doldur" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold">
                        {(templates || []).map((template: any) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Button
                      variant={isSchedulerOpen ? 'secondary' : 'outline'}
                      className={cn(
                        'h-8.5 rounded-xl text-[10px] font-black transition active:scale-95 duration-200 border-slate-200/60 flex items-center gap-1 bg-white/80',
                        isSchedulerOpen ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-600 hover:bg-slate-50'
                      )}
                      onClick={() => setIsSchedulerOpen(!isSchedulerOpen)}
                    >
                      <Clock size={12} className={isSchedulerOpen ? 'text-blue-600 animate-pulse' : 'text-slate-400'} /> Mesaj Zamanla
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
                    <Clock size={12} /> Otomatik gecikme koruması aktif
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <div className="max-w-xs">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <MessageSquare size={26} />
                </div>
                <h4 className="text-sm font-black text-slate-700">Sohbet Seçilmedi</h4>
                <p className="mt-1 text-xs font-semibold text-slate-400">Mesajlaşma geçmişini görüntülemek ve yanıt hazırlamak için soldaki listeden bir sohbet seçin.</p>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Tab-based controls: Copilot Insights & Anti-Ban config */}
        <aside className="flex min-h-0 flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 shadow-xl backdrop-blur-md p-4.5">
          {/* Tab Selection */}
          <div className="flex rounded-2xl bg-slate-100 p-1 font-bold">
            <button
              onClick={() => setActiveRightTab('copilot')}
              className={cn(
                'flex-1 text-center py-2.5 text-xs rounded-xl font-black transition-all flex items-center justify-center gap-1.5 duration-200',
                activeRightTab === 'copilot' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Sparkles size={14} className={activeRightTab === 'copilot' ? 'text-amber-500' : 'text-slate-400'} /> Copilot & Lead
            </button>
            <button
              onClick={() => setActiveRightTab('antiban')}
              className={cn(
                'flex-1 text-center py-2.5 text-xs rounded-xl font-black transition-all flex items-center justify-center gap-1.5 duration-200',
                activeRightTab === 'antiban' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <ShieldCheck size={14} className={activeRightTab === 'antiban' ? 'text-emerald-500' : 'text-slate-400'} /> Güvenlik & Hız
            </button>
          </div>

          {activeRightTab === 'copilot' ? (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Context info for lead */}
              {selectedChat ? (
                <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Müşteri Profil Kartı</h3>
                    <div className="mt-2.5 rounded-2xl bg-slate-50 border border-slate-100 p-4 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-slate-800 truncate">{displayName(selectedChat)}</p>
                        <Badge className="border-none bg-emerald-500/10 text-emerald-800 text-[8px] font-black flex items-center gap-0.5">
                          <Flame size={10} className="text-amber-500 fill-amber-500 animate-pulse" /> YÜKSEK
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">{selectedChat.contact?.phone || selectedChat.jid}</p>

                      {selectedChat.lead ? (
                        <div className="mt-4 space-y-2 border-t border-slate-200/50 pt-3">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                            <span>Sektör (Gmaps):</span>
                            <span className="text-slate-700 font-bold">{selectedChat.lead.category || 'Belirtilmemiş'}</span>
                          </div>
                          {selectedChat.lead.city && (
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                              <span>Bölge:</span>
                              <span className="text-slate-700 font-bold">{selectedChat.lead.city}</span>
                            </div>
                          )}
                          {selectedChat.lead.rating && (
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                              <span>Puan (Yorum):</span>
                              <span className="text-slate-700 font-bold">{selectedChat.lead.rating} ★ ({selectedChat.lead.reviews || selectedChat.lead.reviewCount || 0})</span>
                            </div>
                          )}
                          {selectedChat.lead.website && (
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                              <span>Web:</span>
                              <a href={selectedChat.lead.website} target="_blank" rel="noreferrer" className="text-blue-600 font-bold truncate max-w-40 hover:underline">{selectedChat.lead.website}</a>
                            </div>
                          )}

                          {/* AI Scores if available */}
                          {selectedChat.lead.aiQualityScore && (
                            <div className="mt-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 space-y-1.5">
                              <div className="flex justify-between text-[10px] font-black text-emerald-800">
                                <span>AI Kalite Puanı:</span>
                                <span>{selectedChat.lead.aiQualityScore}/100</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
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
                            className="mt-4.5 w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/10 active:scale-95 transition-all duration-200"
                            disabled={!selectedChat.contact?.id && !selectedChat.id || convertLeadMutation.isPending}
                            onClick={() => convertLeadMutation.mutate()}
                          >
                            {convertLeadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />} Lead'e Dönüştür
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100/60" />

                  {/* AI Quick offer Generator */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">AI Copilot Hızlı Aksiyon</h3>
                    <div className="mt-3 space-y-2.5">
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-2xl border-slate-200/60 bg-white text-xs font-black hover:bg-slate-50 hover:border-emerald-500/10 text-slate-700 active:scale-98 transition duration-200"
                        disabled={suggestReplyMutation.isPending}
                        onClick={() => suggestReplyMutation.mutate('İşletmenin sektörel zayıflıklarını kapatacak özel bir %15 hoş geldin indirimi ve B2B otomasyon avantajları sun.')}
                      >
                        🎁 Hoş Geldin İndirimi Sun
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-2xl border-slate-200/60 bg-white text-xs font-black hover:bg-slate-50 hover:border-blue-500/10 text-slate-700 active:scale-98 transition duration-200"
                        disabled={suggestReplyMutation.isPending}
                        onClick={() => suggestReplyMutation.mutate('İşletme sahibiyle 10 dakikalık çok kısa bir B2B verimlilik analizi zoom çağrısı planlamak için teklif et.')}
                      >
                        📅 Zoom Görüşmesi Teklif Et
                      </Button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100/60" />

                  {/* Customer Sticky Notes Widget */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5"><Notebook size={13} className="text-amber-500" /> Müşteri Sticky Notları</h3>
                    <div className="mt-3 relative">
                      <textarea
                        value={chatNotes[selectedChat.id] || ''}
                        onChange={(e) => updateNotes(selectedChat.id, e.target.value)}
                        placeholder="Bu müşteri hakkında önemli notlar alın (Örn. Yetkili Ahmet Bey, Pazartesi günleri aranmak istiyor...)"
                        className="w-full min-h-[90px] rounded-2xl border border-slate-200/60 bg-amber-50/15 p-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-y transition duration-200 leading-relaxed"
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
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Shield size={14} className="text-emerald-500" /> Akıllı Anti-Ban Presets
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1 font-bold">
                  {(['safe', 'normal', 'fast'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAntiBanMode(mode)}
                      className={cn(
                        'text-center py-2 text-[10px] rounded-xl font-black capitalize transition-all duration-200',
                        antiBanMode === mode ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {mode === 'safe' ? 'Güvenli' : mode === 'normal' ? 'Normal' : 'Hızlı'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anti-Ban Audit Score Gauge */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Isınma & Güvenlik Skoru</span>
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
                <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
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
                <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                  {antiBanAudit.rules.map((rule, idx) => (
                    <p key={idx} className="text-[10px] font-bold leading-normal text-slate-500 flex items-start gap-1">{rule}</p>
                  ))}
                </div>
              </div>

              {/* Slider simulation config details */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 space-y-3.5 text-xs font-bold text-slate-600">
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

              <div className="h-px bg-slate-100/60" />

              {/* Health and system metrics */}
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Gauge size={14} className="text-blue-500" /> Sistem & Engine Metrikleri
                </h3>
                <div className="mt-3 space-y-2 text-xs font-bold text-slate-600">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100">
                    <span className="flex items-center gap-1.5"><Activity size={12} className="text-blue-500 animate-pulse" /> Ping / Latency</span>
                    <span className="text-emerald-600 font-black">{metrics.latency}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100">
                    <span className="flex items-center gap-1.5"><Layers size={12} className="text-amber-500" /> Chromium RAM</span>
                    <span className="text-slate-800 font-black">{metrics.ramUsage}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100">
                    <span className="flex items-center gap-1.5"><Zap size={12} className="text-indigo-500" /> CPU Yükü</span>
                    <span className="text-slate-800 font-black">{metrics.cpuLoad}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100">
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Chromium Sandbox</span>
                    <span className="text-slate-800 font-black">{metrics.sandbox}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick new chat starter input in right panel footer area */}
          <div className="mt-auto border-t border-slate-100/60 pt-4.5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Hızlı Yeni Sohbet Başlat</h3>
            <div className="mt-2.5 space-y-2">
              <Input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="Telefon (+90...)" className="h-9.5 rounded-xl border-slate-200/60 bg-white text-xs font-bold" />
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

      </div>
    </div>
  );
}

// Helper: highlight search text in message body
function highlightText(text: string, query: string) {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (regex.test(part)) {
      return <mark key={i} className="bg-yellow-300 text-slate-900 px-0.5 rounded">{part}</mark>;
    }
    return part;
  });
}
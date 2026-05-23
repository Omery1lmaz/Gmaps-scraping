import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, waApi } from '../../lib/api';
import {
  MessageSquare,
  AlertCircle,
  LayoutDashboard,
  ChevronDown
} from 'lucide-react';

import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { useParams, Link } from '../../lib/router';
import { Button } from '../../components/ui/button';

// Extracted Components
import { ProPlanRestriction } from '../../features/whatsapp/components/ProPlanRestriction';
import { WhatsAppHeader } from '../../features/whatsapp/components/WhatsAppHeader';
import { ChatList } from '../../features/whatsapp/components/ChatList';
import { MessageList } from '../../features/whatsapp/components/MessageList';
import { MessageInput } from '../../features/whatsapp/components/MessageInput';
import { RightSidebar } from '../../features/whatsapp/components/RightSidebar';
import { SyncProgressBar } from '../../features/whatsapp/components/Chat/SyncProgressBar';
import { ChatHeader } from '../../features/whatsapp/components/ChatHeader';
import { WhatsAppConnector } from '../../features/whatsapp/components/WhatsAppConnector';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../../components/ui/sheet';
import { Settings2, Sparkles } from 'lucide-react';

// Utils
import { displayName, fileToDataUrl } from '../../features/whatsapp/whatsapp-utils';
import { useWhatsApp } from '../../features/whatsapp/WhatsAppProvider';

const WA_ENGINE_URL = import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002';
const MESSAGES_PER_PAGE = 50;

export function ChatViewPage() {
  const { user, token } = useAuth();
  const t = useT();
  const { chatId: paramChatId } = useParams();

  // PRO PLAN RESTRICTION WALL
  if (user && user.plan === 'free') {
    return <ProPlanRestriction />;
  }

  const userId = user?.id || '';
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const { socket } = useWhatsApp();
  
  // Multi-session state mappings
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() => {
    return localStorage.getItem('wa_selected_session_id');
  });
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, string>>({});
  const [sessionQrs, setSessionQrs] = useState<Record<string, string | null>>({});
  const [sessionInfos, setSessionInfos] = useState<Record<string, any>>({});
  const [sessionErrors, setSessionErrors] = useState<Record<string, string | null>>({});
  
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
        const firstSessionId = sessions[0]._id;
        setSelectedSessionId(firstSessionId);
        localStorage.setItem('wa_selected_session_id', firstSessionId);
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

  // Update selectedChatId if paramChatId changes or clear if session changes
  useEffect(() => {
    if (paramChatId) {
      setSelectedChatId(paramChatId);
    }
  }, [paramChatId, setSelectedChatId]);

  useEffect(() => {
    setSelectedChatId(null);
  }, [selectedSessionId, setSelectedChatId]);

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
    if (!socket) return;

    if (socket.connected) {
      sessions.forEach((s: any) => {
        fetchSessionStatus(s._id).catch(() => {});
      });
    }

    const onQr = (data: { sessionId?: string; qr: string }) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionQrs((prev) => ({ ...prev, [sId]: data.qr }));
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'QR_READY' }));
      setSessionErrors((prev) => ({ ...prev, [sId]: null }));
    };

    const onAuthenticated = (data: { sessionId?: string }) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'AUTHENTICATED' }));
      setSessionQrs((prev) => ({ ...prev, [sId]: null }));
    };

    const onReady = (data: any) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'CONNECTED' }));
      setSessionInfos((prev) => ({ ...prev, [sId]: data }));
      setSessionQrs((prev) => ({ ...prev, [sId]: null }));
      setSessionErrors((prev) => ({ ...prev, [sId]: null }));
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      refetchSessions();
      toast.success('WhatsApp başarıyla bağlandı');
    };

    const onDisconnected = (data: { sessionId?: string }) => {
      const sId = data.sessionId || selectedSessionId || userId;
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'DISCONNECTED' }));
      setSessionInfos((prev) => {
        const next = { ...prev };
        delete next[sId];
        return next;
      });
      setSessionQrs((prev) => ({ ...prev, [sId]: null }));
      refetchSessions();
    };

    const onWaError = (data: any) => {
      const sId = data.sessionId || selectedSessionId || userId;
      const message = data?.message || 'WhatsApp hatası oluştu';
      setSessionStatuses((prev) => ({ ...prev, [sId]: 'ERROR' }));
      setSessionErrors((prev) => ({ ...prev, [sId]: message }));
      toast.error(message);
    };

    const onWhatsappMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      const currentChatId = selectedChatIdRef.current;
      if (currentChatId) {
        queryClient.invalidateQueries({ queryKey: ['wa-messages', currentChatId] });
      }
    };

    const onMessageStatus = () => {
      const currentChatId = selectedChatIdRef.current;
      if (currentChatId) {
        queryClient.invalidateQueries({ queryKey: ['wa-messages', currentChatId] });
      }
    };

    const onSyncStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['wa-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
    };

    socket.on('qr', onQr);
    socket.on('authenticated', onAuthenticated);
    socket.on('ready', onReady);
    socket.on('disconnected', onDisconnected);
    socket.on('wa_error', onWaError);
    socket.on('whatsapp_message', onWhatsappMessage);
    socket.on('message_status', onMessageStatus);
    socket.on('sync_status', onSyncStatus);

    return () => {
      socket.off('qr', onQr);
      socket.off('authenticated', onAuthenticated);
      socket.off('ready', onReady);
      socket.off('disconnected', onDisconnected);
      socket.off('wa_error', onWaError);
      socket.off('whatsapp_message', onWhatsappMessage);
      socket.off('message_status', onMessageStatus);
      socket.off('sync_status', onSyncStatus);
    };
  }, [socket, selectedSessionId, userId, queryClient, refetchSessions, sessions]);

  const { data: rawChats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['wa-chats', search, filter, selectedSessionId],
    queryFn: async () => {
      const res = await api.get('/whatsapp/chats', { params: { search, filter, sessionId: selectedSessionId } });
      return res.data;
    },
    enabled: !!selectedSessionId,
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
    enabled: !!selectedChat?.id && !!selectedSessionId,
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
      const prevScrollHeight = el.scrollHeight;
      fetchNextPage().then(() => {
        // Preserve scroll position after older messages are prepended
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
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
    enabled: !!selectedSessionId,
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['wa-sync-status', selectedSessionId],
    queryFn: async () => (await api.get('/whatsapp/sync/status', { params: { sessionId: selectedSessionId } })).data,
    enabled: !!selectedSessionId,
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
  const [isChatListVisible, setIsChatListVisible] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const connected = status === 'CONNECTED' || status === 'AUTHENTICATED';

  if (!sessionsLoading && sessions.length === 0) {
    return (
      <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
          <div className="relative flex size-24 items-center justify-center rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
            <AlertCircle size={48} className="text-emerald-500" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-white mb-3">WhatsApp Hesabı Bağlı Değil</h1>
        <p className="text-slate-400 max-w-md mb-8 font-medium leading-relaxed">
          Mesajlaşmaya başlamak için önce bir WhatsApp hesabı bağlamanız gerekiyor. Hesap yönetimi sayfasından yeni bir hesap ekleyebilirsiniz.
        </p>
        <Link to="/whatsapp/accounts">
          <Button size="lg" className="h-14 px-10 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-3">
            <LayoutDashboard size={20} />
            Hesapları Yönet
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-104px)] flex-col gap-4 p-1">
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle Button */}
        <Button 
          variant="outline" 
          onClick={() => setIsChatListVisible(!isChatListVisible)}
          className={cn(
            "h-14 w-14 rounded-3xl border-white/5 bg-[#0c1220]/60 backdrop-blur-xl shadow-2xl transition-all active:scale-90 flex items-center justify-center shrink-0",
            !isChatListVisible ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-slate-400 hover:text-white"
          )}
          title={isChatListVisible ? "Sohbet Listesini Gizle" : "Sohbet Listesini Göster"}
        >
          <LayoutDashboard size={24} />
        </Button>

        <div className="flex-1">
          <WhatsAppHeader
            sessionInfo={sessionInfo}
            connected={connected}
            socketConnected={!!socket?.connected}
            onSync={() => syncMutation.mutate()} 
            onLogout={() => logoutMutation.mutate(undefined)} 
            onRestart={() => connectMutation.mutate(undefined)}
            syncPending={syncMutation.isPending}
            logoutPending={logoutMutation.isPending}
            restartPending={connectMutation.isPending}
            isSimpleView={true}
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSessionChange={(id) => {
              setSelectedSessionId(id);
              localStorage.setItem('wa_selected_session_id', id);
            }}
          />
        </div>

        {/* Right Panel Trigger (Sheet) */}
        <Sheet>
          <SheetTrigger>
            <Button variant="outline" className="h-14 w-14 rounded-3xl border-white/5 bg-[#0c1220]/60 backdrop-blur-xl shadow-2xl hover:bg-white/10 transition-all active:scale-90 flex items-center justify-center shrink-0">
              <Sparkles className="size-6 text-amber-500" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] bg-[#0c1220]/95 backdrop-blur-2xl border-white/5 p-0 sm:max-w-[400px]">
            <div className="h-full flex flex-col p-6">
              <SheetTitle className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                Copilot & Ayarlar
              </SheetTitle>
              <RightSidebar
                showRightPanel={true}
                activeRightTab={activeRightTab}
                setActiveRightTab={setActiveRightTab}
                connected={connected}
                selectedChat={selectedChat}
                chatNotes={chatNotes}
                updateNotes={updateNotes}
                suggestReply={(context) => suggestReplyMutation.mutate(context)}
                suggestReplyPending={suggestReplyMutation.isPending}
                convertLead={() => convertLeadMutation.mutate()}
                convertLeadPending={convertLeadMutation.isPending}
                antiBanMode={antiBanMode}
                setAntiBanMode={setAntiBanMode}
                antiBanAudit={antiBanAudit}
                customDelayMin={customDelayMin}
                setCustomDelayMin={setCustomDelayMin}
                customDelayMax={customDelayMax}
                setCustomDelayMax={setCustomDelayMax}
                dailyWarmingLimit={dailyWarmingLimit}
                setDailyWarmingLimit={setDailyWarmingLimit}
                metrics={metrics}
                newPhone={newPhone}
                setNewPhone={setNewPhone}
                startChat={() => startChatMutation.mutate()}
                startChatPending={startChatMutation.isPending}
                isSheet={true}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <SyncProgressBar syncStatus={syncStatus} />

      {/* Main Container Layout split into 2 Column View (dynamic grid) */}
      <div className={cn(
        "grid min-h-0 flex-1 gap-4 transition-all duration-500",
        isChatListVisible ? "grid-cols-1 md:grid-cols-[330px_minmax(0,1fr)]" : "grid-cols-1"
      )}>

        {/* LEFT COLUMN: Chat list */}
        <section className={cn(isChatListVisible ? 'flex' : 'hidden', 'min-h-0 flex-col')}>
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            setSelectedChatId={setSelectedChatId}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            chatsLoading={chatsLoading}
            connected={connected}
            chatTags={chatTags}
            AVAILABLE_TAGS={AVAILABLE_TAGS}
          />
        </section>

        {/* MIDDLE COLUMN: Message history & details (Now fills remaining space) */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm shadow-xl backdrop-blur-md relative overflow-hidden">
          {selectedChat ? (
            <>
              <ChatHeader
                selectedChat={selectedChat}
                messageSearchQuery={messageSearchQuery}
                setMessageSearchQuery={setMessageSearchQuery}
                searchedMsgIds={searchedMsgIds}
                highlightedMsgIndex={highlightedMsgIndex}
                navigateSearchResult={navigateSearchResult}
                AVAILABLE_TAGS={AVAILABLE_TAGS}
                chatTags={chatTags}
                toggleTag={toggleTag}
              />

              <MessageList
                allMessages={allMessages}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
                messageSearchQuery={messageSearchQuery}
                searchedMsgIds={searchedMsgIds}
                highlightedMsgIndex={highlightedMsgIndex}
                messagesContainerRef={messagesContainerRef}
                messagesEndRef={messagesEndRef}
                handleScroll={handleScroll}
                scheduledMessages={scheduledMessages}
                selectedChatId={selectedChat.id}
                cancelScheduledMessage={cancelScheduledMessage}
              />

              <MessageInput
                messageText={messageText}
                setMessageText={setMessageText}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isSchedulerOpen={isSchedulerOpen}
                setIsSchedulerOpen={setIsSchedulerOpen}
                scheduleTime={scheduleTime}
                setScheduleTime={setScheduleTime}
                scheduleText={scheduleText}
                setScheduleText={setScheduleText}
                scheduleMessage={scheduleMessage}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                handleTemplateChange={handleTemplateChange}
                suggestReply={(context) => suggestReplyMutation.mutate(context)}
                suggestReplyPending={suggestReplyMutation.isPending}
                handleSend={handleSend}
                sendPending={sendMutation.isPending}
                fileInputRef={fileInputRef}
                connected={connected}
              />
            </>
          ) : !connected ? (
            <WhatsAppConnector
              status={status}
              qrCode={qrCode}
              connectMutation={connectMutation}
              selectedSessionId={selectedSessionId}
              lastErrorMessage={lastErrorMessage}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <div className="max-w-xs animate-in fade-in">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/5 text-slate-300">
                  <MessageSquare size={26} />
                </div>
                <h4 className="text-sm font-black text-slate-100">Sohbet Seçilmedi</h4>
                <p className="mt-1 text-xs font-semibold text-slate-500">Mesajlaşma geçmişini görüntülemek için bir sohbet seçin.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

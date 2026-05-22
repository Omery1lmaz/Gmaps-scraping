import React, { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, waApi } from '../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Layers,
  UserPlus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  LogOut,
  Loader2,
  RefreshCcw,
  Wifi,
  WifiOff,
  Smartphone,
  Phone,
  Shield,
  PlugZap,
  X,
  Check,
  QrCode,
  MessageCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../../lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { CreateSessionModal } from '../../features/whatsapp/components/Modals/CreateSessionModal';
import { LimitModal } from '../../features/whatsapp/components/Modals/LimitModal';
import { ProPlanRestriction } from '../../features/whatsapp/components/ProPlanRestriction';

const WA_ENGINE_URL = import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode; pulse?: boolean }> = {
    'CONNECTED': { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Bağlı', icon: <CheckCircle2 size={13} />, pulse: true },
    'AUTHENTICATED': { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Doğrulandı', icon: <Shield size={13} />, pulse: true },
    'QR_READY': { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'QR Bekliyor', icon: <QrCode size={13} />, pulse: true },
    'INITIALIZING': { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Başlatılıyor', icon: <Loader2 size={13} className="animate-spin" /> },
    'DISCONNECTED': { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', label: 'Bağlı Değil', icon: <WifiOff size={13} /> },
    'ERROR': { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Hata', icon: <AlertCircle size={13} /> },
  };
  const c = config[status] || config['DISCONNECTED'];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border tracking-wider uppercase', c.bg, c.color)}>
      {c.pulse && <span className={cn('size-1.5 rounded-full animate-pulse', status === 'CONNECTED' || status === 'AUTHENTICATED' ? 'bg-emerald-400' : 'bg-amber-400')} />}
      {c.icon}
      {c.label}
    </span>
  );
}

export function WhatsAppAccountsPage() {
  const t = useT();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || '';

  // PRO PLAN RESTRICTION
  if (user && user.plan === 'free') {
    return <ProPlanRestriction />;
  }

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  // Inline editing
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Expanded card for QR code
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Socket & real-time state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, string>>({});
  const [sessionQrs, setSessionQrs] = useState<Record<string, string | null>>({});
  const [sessionInfos, setSessionInfos] = useState<Record<string, any>>({});
  const [sessionErrors, setSessionErrors] = useState<Record<string, string | null>>({});

  // Load sessions
  const { data: sessions = [], refetch: refetchSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['wa-sessions'],
    queryFn: async () => (await api.get('/whatsapp/sessions')).data,
    refetchInterval: 12000,
  });

  const planLimits: Record<string, number> = { 'free': 0, 'starter': 1, 'pro': 3, 'enterprise': 10 };
  const currentLimit = planLimits[user?.plan || 'starter'] || 1;

  // Sync session statuses from API data
  useEffect(() => {
    if (sessions && sessions.length > 0) {
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
    }
  }, [sessions]);

  // Fetch individual session status
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

  // Socket connection for real-time updates
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
      const sId = data.sessionId || userId;
      setSessionQrs(prev => ({ ...prev, [sId]: data.qr }));
      setSessionStatuses(prev => ({ ...prev, [sId]: 'QR_READY' }));
      setSessionErrors(prev => ({ ...prev, [sId]: null }));
      // Auto-expand the card that received QR
      setExpandedSessionId(sId);
    });

    newSocket.on('authenticated', (data: { sessionId?: string }) => {
      const sId = data.sessionId || userId;
      setSessionStatuses(prev => ({ ...prev, [sId]: 'AUTHENTICATED' }));
      setSessionQrs(prev => ({ ...prev, [sId]: null }));
    });

    newSocket.on('ready', (data: any) => {
      const sId = data.sessionId || userId;
      setSessionStatuses(prev => ({ ...prev, [sId]: 'CONNECTED' }));
      setSessionInfos(prev => ({ ...prev, [sId]: data }));
      setSessionQrs(prev => ({ ...prev, [sId]: null }));
      setSessionErrors(prev => ({ ...prev, [sId]: null }));
      setExpandedSessionId(null);
      refetchSessions();
      toast.success('WhatsApp başarıyla bağlandı!');
    });

    newSocket.on('disconnected', (data: { sessionId?: string }) => {
      const sId = data.sessionId || userId;
      setSessionStatuses(prev => ({ ...prev, [sId]: 'DISCONNECTED' }));
      setSessionInfos(prev => {
        const next = { ...prev };
        delete next[sId];
        return next;
      });
      setSessionQrs(prev => ({ ...prev, [sId]: null }));
      refetchSessions();
    });

    newSocket.on('wa_error', (data: any) => {
      const sId = data.sessionId || userId;
      const message = data?.message || 'WhatsApp hatası oluştu';
      setSessionStatuses(prev => ({ ...prev, [sId]: 'ERROR' }));
      setSessionErrors(prev => ({ ...prev, [sId]: message }));
      toast.error(message);
    });

    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token, sessions.length]);

  // --- Mutations ---

  const createSessionMutation = useMutation({
    mutationFn: async (sessionName: string) => (await api.post('/whatsapp/sessions', { sessionName })).data,
    onSuccess: () => {
      toast.success('Yeni WhatsApp hesabı başarıyla eklendi');
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

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => (await api.delete(`/whatsapp/sessions/${sessionId}`)).data,
    onSuccess: () => {
      toast.success('Hesap başarıyla kaldırıldı');
      refetchSessions();
    },
    onError: (error: any) => {
      toast.error('Hesap kaldırılırken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const connectMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await waApi.post(`/connect/${sessionId}?force=1`);
      return response.data;
    },
    onMutate: () => {
      toast.info('Yeni karekod oluşturuluyor, lütfen bekleyin...');
    },
    onSuccess: () => {
      toast.success('Bağlantı motoru başlatıldı, karekod üretiliyor...');
      refetchSessions();
    },
    onError: (error: any) => {
      toast.error('Karekod üretilirken hata oluştu: ' + (error.response?.data?.error || error.message));
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await waApi.post(`/logout/${sessionId}`);
      return response.data;
    },
    onMutate: () => {
      toast.info('Bağlantı kesiliyor...');
    },
    onSuccess: (_, sessionId) => {
      setSessionStatuses(prev => ({ ...prev, [sessionId]: 'DISCONNECTED' }));
      setSessionInfos(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      setSessionQrs(prev => ({ ...prev, [sessionId]: null }));
      toast.success('WhatsApp bağlantısı başarıyla kesildi');
      refetchSessions();
    },
    onError: (error: any) => {
      toast.error('Bağlantı kesilirken hata: ' + (error.response?.data?.error || error.message));
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
      toast.error('Hesap adı güncellenirken hata: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleRename = (sessionId: string) => {
    if (!editName.trim()) {
      toast.error('Lütfen geçerli bir isim girin');
      return;
    }
    renameSessionMutation.mutate({ sessionId, sessionName: editName });
  };

  const handleAddNewSessionClick = () => {
    if (sessions.length >= currentLimit) {
      setIsLimitModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  // --- Stats ---
  const stats = useMemo(() => {
    const connected = sessions.filter((s: any) => ['CONNECTED', 'AUTHENTICATED'].includes(sessionStatuses[s._id] || s.status)).length;
    const error = sessions.filter((s: any) => (sessionStatuses[s._id] || s.status) === 'ERROR').length;
    const pending = sessions.filter((s: any) => ['QR_READY', 'INITIALIZING'].includes(sessionStatuses[s._id] || s.status)).length;
    return { connected, error, pending, total: sessions.length };
  }, [sessions, sessionStatuses]);

  // --- Empty State ---
  if (sessions.length === 0 && !sessionsLoading) {
    return (
      <>
        <div className="min-h-[80vh] flex items-center justify-center p-6 bg-transparent">
          <div className="max-w-2xl w-full relative">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            
            <div className="relative bg-[#0c1220]/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl overflow-hidden group text-center space-y-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px] pointer-events-none" />
              
              <div className="flex flex-col items-center space-y-5">
                <div className="bg-gradient-to-tr from-emerald-500 to-green-600 p-6 rounded-3xl shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform duration-500">
                  <Smartphone size={44} className="text-black animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                    WhatsApp <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Hesap Yönetimi</span>
                  </h2>
                  <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
                    İlk WhatsApp hesabınızı ekleyerek bağlantı kurun. Birden fazla hesap ekleyerek tüm hatlarınızı tek panelden yönetin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
                {[
                  { title: 'Çoklu Oturum', desc: 'Birden fazla WhatsApp hesabını aynı anda bağlı tutun ve yönetin.' },
                  { title: 'QR ile Bağlantı', desc: 'Telefonunuzla QR kodu okutarak saniyeler içinde bağlanın.' },
                  { title: 'Canlı Durum Takibi', desc: 'Tüm hesaplarınızın bağlantı durumunu anlık olarak izleyin.' }
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
                  İLK HESABI EKLE
                </Button>
              </div>
            </div>
          </div>
        </div>
        <CreateSessionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          newSessionName={newSessionName}
          setNewSessionName={setNewSessionName}
          onCreateSession={(name) => createSessionMutation.mutate(name)}
          isPending={createSessionMutation.isPending}
        />
        <LimitModal
          isOpen={isLimitModalOpen}
          onClose={() => setIsLimitModalOpen(false)}
          userPlan={user?.plan}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm px-6 py-4 shadow-xl">
        <div className="min-w-0">
          <h2 className="flex items-center gap-3 text-2xl font-black text-white">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Layers size={22} />
            </span>
            <span className="text-gradient-tw">Hesap Yönetimi</span>
          </h2>
          <p className="mt-1 text-xs font-black text-slate-500 flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', socket?.connected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500')} />
            Soket: <span className={cn(socket?.connected ? 'text-emerald-400' : 'text-rose-400')}>{socket?.connected ? 'Bağlı' : 'Bağlı Değil'}</span>
            <span className="text-slate-600 mx-1">•</span>
            {sessions.length} / {currentLimit === 10 ? '∞' : currentLimit} hesap
          </p>
        </div>
        <Button
          onClick={handleAddNewSessionClick}
          className="h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs rounded-xl px-5 gap-2 transition active:scale-95 duration-200 shadow-lg shadow-emerald-500/10"
        >
          <UserPlus size={15} />
          Yeni Hesap Ekle
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-[#0c1220]/60 p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-slate-500/10 rounded-lg"><Layers className="size-5 text-slate-400" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Toplam Hesap</p>
            <p className="text-2xl font-black text-white">{stats.total}</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0c1220]/60 p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="size-5 text-emerald-500" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aktif Bağlantı</p>
            <p className="text-2xl font-black text-emerald-400">{stats.connected}</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0c1220]/60 p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-lg"><Clock className="size-5 text-amber-500" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">QR Bekleyen</p>
            <p className="text-2xl font-black text-amber-400">{stats.pending}</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0c1220]/60 p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-lg"><AlertCircle className="size-5 text-rose-500" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hatalı</p>
            <p className="text-2xl font-black text-rose-400">{stats.error}</p>
          </div>
        </div>
      </div>

      {/* Session Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sessions.map((session: any) => {
          const sessStatus = sessionStatuses[session._id] || session.status || 'DISCONNECTED';
          const sessInfo = sessionInfos[session._id] || (sessStatus === 'CONNECTED' ? { phoneNumber: session.phoneNumber, pushName: session.pushName } : null);
          const sessQr = sessionQrs[session._id] || null;
          const sessError = sessionErrors[session._id] || null;
          const isEditing = editingSessionId === session._id;
          const isExpanded = expandedSessionId === session._id;
          const isConnected = sessStatus === 'CONNECTED' || sessStatus === 'AUTHENTICATED';

          return (
            <div
              key={session._id}
              className={cn(
                "group relative flex flex-col rounded-2xl border transition-all duration-300 shadow-lg overflow-hidden",
                isConnected
                  ? "border-emerald-500/30 bg-gradient-to-br from-[#0c1220]/80 to-emerald-500/5"
                  : sessStatus === 'QR_READY'
                  ? "border-amber-500/30 bg-gradient-to-br from-[#0c1220]/80 to-amber-500/5"
                  : sessStatus === 'ERROR'
                  ? "border-rose-500/30 bg-gradient-to-br from-[#0c1220]/80 to-rose-500/5"
                  : "border-white/5 bg-[#0c1220]/60 hover:border-white/15"
              )}
            >
              {/* Card Header */}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "flex items-center justify-center size-11 rounded-xl font-black text-sm shrink-0 transition-colors duration-300",
                      isConnected
                        ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-slate-800/80 text-slate-400 border border-white/5"
                    )}>
                      {session.sessionName?.charAt(0).toUpperCase() || 'W'}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-white/10 rounded-lg"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(session._id);
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRename(session._id)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingSessionId(null)}
                            className="p-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{session.sessionName || 'WhatsApp Hesabı'}</span>
                            <button
                              onClick={() => { setEditingSessionId(session._id); setEditName(session.sessionName || ''); }}
                              className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300 transition opacity-0 group-hover:opacity-100"
                              title="Yeniden adlandır"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            {sessInfo?.phoneNumber ? (
                              <>
                                <Phone size={10} className="text-slate-500" />
                                +{sessInfo.phoneNumber}
                              </>
                            ) : (
                              'Numara bağlı değil'
                            )}
                            {sessInfo?.pushName && (
                              <span className="text-slate-400 ml-1">• {sessInfo.pushName}</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={sessStatus} />
                </div>

                {/* Error message */}
                {sessError && sessStatus === 'ERROR' && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/15">
                    <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-semibold text-rose-300 leading-relaxed">{sessError}</p>
                  </div>
                )}

                {/* Last connected info */}
                {isConnected && sessInfo?.lastConnected && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <Clock size={10} />
                    Son bağlantı: {new Date(sessInfo.lastConnected).toLocaleString('tr-TR')}
                  </div>
                )}
              </div>

              {/* QR Code Section (Expandable) */}
              {(isExpanded || sessStatus === 'QR_READY') && sessQr && (
                <div className="px-5 pb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col items-center p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                    <QRCodeSVG
                      value={sessQr}
                      size={180}
                      level="H"
                      includeMargin={true}
                      className="rounded-2xl border border-white/10 bg-white p-2 shadow-2xl"
                    />
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                      <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                      Karekod Okutulmayı Bekliyor
                    </div>
                    <div className="w-full space-y-2 text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nasıl Bağlanılır?</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          'WhatsApp uygulamasını açın',
                          'Ayarlar → Bağlı Cihazlar',
                          'Cihaz Bağla → QR Kodu Taratın',
                        ].map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <span className="flex size-4 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-black">
                              {i + 1}
                            </span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Initializing state */}
              {sessStatus === 'INITIALIZING' && (
                <div className="px-5 pb-4">
                  <div className="flex flex-col items-center p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                    <Loader2 className="size-10 animate-spin text-emerald-500" />
                    <p className="text-xs font-black text-slate-300">Bağlantı Başlatılıyor</p>
                    <p className="text-[10px] font-medium text-slate-500 text-center leading-relaxed">
                      Güvenli Chromium oturumu oluşturuluyor, lütfen bekleyin...
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-5 pt-0 mt-auto">
                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => logoutMutation.mutate(session._id)}
                        disabled={logoutMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold rounded-xl bg-slate-700/40 text-slate-300 hover:bg-slate-700/70 transition duration-200 disabled:opacity-50"
                      >
                        <LogOut size={12} />
                        Bağlantıyı Kes
                      </button>
                      <button
                        onClick={() => { setEditingSessionId(session._id); setEditName(session.sessionName || ''); }}
                        className="py-2.5 px-3 text-[11px] font-bold rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition duration-200"
                      >
                        <Edit2 size={12} />
                      </button>
                    </>
                  ) : sessStatus === 'QR_READY' ? (
                    <>
                      <button
                        onClick={() => connectMutation.mutate(session._id)}
                        disabled={connectMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition duration-200 disabled:opacity-50"
                      >
                        <RefreshCcw size={12} className={connectMutation.isPending ? 'animate-spin' : ''} />
                        Yeni QR Üret
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Bu hesabı kaldırmak istediğinize emin misiniz?')) {
                            deleteSessionMutation.mutate(session._id);
                          }
                        }}
                        className="py-2.5 px-3 text-[11px] font-bold rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition duration-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setExpandedSessionId(session._id);
                          connectMutation.mutate(session._id);
                        }}
                        disabled={connectMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition duration-200 disabled:opacity-50"
                      >
                        {connectMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <PlugZap size={12} />
                        )}
                        Bağlan
                      </button>
                      <button
                        onClick={() => { setEditingSessionId(session._id); setEditName(session.sessionName || ''); }}
                        className="py-2.5 px-3 text-[11px] font-bold rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition duration-200"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Bu hesabı kaldırmak istediğinize emin misiniz?')) {
                            deleteSessionMutation.mutate(session._id);
                          }
                        }}
                        className="py-2.5 px-3 text-[11px] font-bold rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition duration-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add New Card */}
        {sessions.length < currentLimit && (
          <button
            onClick={handleAddNewSessionClick}
            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed border-white/10 hover:border-emerald-500/30 bg-[#0c1220]/30 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer group min-h-[200px]"
          >
            <div className="size-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-300">
              <UserPlus size={24} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-400 group-hover:text-emerald-400 transition-colors">Yeni Hesap Ekle</p>
              <p className="text-[10px] text-slate-600 font-medium mt-1">
                {currentLimit === 10 ? '∞' : currentLimit - sessions.length} hesap daha ekleyebilirsiniz
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Modals */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        newSessionName={newSessionName}
        setNewSessionName={setNewSessionName}
        onCreateSession={(name) => createSessionMutation.mutate(name)}
        isPending={createSessionMutation.isPending}
      />
      <LimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        userPlan={user?.plan}
      />
    </div>
  );
}

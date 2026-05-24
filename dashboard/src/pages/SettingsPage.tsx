import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCalendarConnections, 
  getGoogleAuthUrl, 
  connectGoogleCalendar, 
  deleteCalendarConnection,
  getCalendlyAuthUrl,
  connectCalendly,
  getCalendlyIntegration,
  disconnectCalendly,
  getCalendlyEventTypes,
  selectCalendlyEventType,
  syncCalendly
} from '../lib/api';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Settings2, 
  Link2, 
  Copy, 
  Check, 
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '../lib/i18n';
import { useLocation, useNavigate } from '../lib/router';
import { Button } from '../components/ui/button';

export function SettingsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingCalendly, setIsConnectingCalendly] = useState(false);
  const [copied, setCopied] = useState(false);

  // Google connections query
  const { data: connections, isLoading: loadingGoogle } = useQuery({
    queryKey: ['calendar-connections'],
    queryFn: getCalendarConnections,
  });

  // Calendly integration query
  const { data: calendlyInt, isLoading: loadingCalendly } = useQuery({
    queryKey: ['calendly-integration'],
    queryFn: getCalendlyIntegration,
  });

  // Calendly Event Types query
  const { data: eventTypes, isLoading: loadingEventTypes } = useQuery({
    queryKey: ['calendly-event-types', calendlyInt?.userId],
    queryFn: getCalendlyEventTypes,
    enabled: !!calendlyInt,
  });

  // Automated OAuth Flow Handler
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleCode = params.get('google_code');
    const calendlyCode = params.get('calendly_code');
    const error = params.get('error');

    if (googleCode) {
      handleGoogleConnect(googleCode);
    } else if (calendlyCode) {
      handleCalendlyConnect(calendlyCode);
    } else if (error) {
      toast.error(t('settings_calendar_error', 'Bağlantı hatası: ') + error);
      navigate('/settings', { replace: true });
    }
  }, [location.search]);

  const handleGoogleConnect = async (code: string) => {
    setIsConnectingGoogle(true);
    const toastId = toast.loading(t('settings_calendar_connecting', 'Google Takvim bağlanıyor...'));
    try {
      await connectGoogleCalendar(code);
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast.success(t('settings_calendar_connected', 'Google Takvim başarıyla bağlandı!'), { id: toastId });
      navigate('/settings', { replace: true });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message;
      toast.error(t('settings_calendar_error', 'Bağlantı hatası: ') + errorMessage, { id: toastId, duration: 5000 });
      navigate('/settings', { replace: true });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleCalendlyConnect = async (code: string) => {
    setIsConnectingCalendly(true);
    const toastId = toast.loading(t('settings_calendly_connecting', 'Calendly bağlanıyor...'));
    try {
      await connectCalendly(code);
      queryClient.invalidateQueries({ queryKey: ['calendly-integration'] });
      toast.success(t('settings_calendly_connected', 'Calendly hesabı başarıyla bağlandı!'), { id: toastId });
      navigate('/settings', { replace: true });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message;
      toast.error(t('settings_calendly_error', 'Bağlantı hatası: ') + errorMessage, { id: toastId, duration: 5000 });
      navigate('/settings', { replace: true });
    } finally {
      setIsConnectingCalendly(false);
    }
  };

  // Google Connect mutation
  const googleConnectMutation = useMutation({
    mutationFn: getGoogleAuthUrl,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast.error(t('settings_calendar_auth_error', 'Yetkilendirme URL\'i alınamadı: ') + err.message);
    }
  });

  // Calendly Connect mutation
  const calendlyConnectMutation = useMutation({
    mutationFn: getCalendlyAuthUrl,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast.error(t('settings_calendly_auth_error', 'Calendly yetkilendirme URL\'i alınamadı: ') + err.message);
    }
  });

  const deleteGoogleMutation = useMutation({
    mutationFn: deleteCalendarConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast.success(t('settings_calendar_disconnected', 'Takvim bağlantısı kaldırıldı.'));
    },
  });

  const disconnectCalendlyMutation = useMutation({
    mutationFn: disconnectCalendly,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendly-integration'] });
      toast.success(t('settings_calendly_disconnected', 'Calendly bağlantısı kaldırıldı.'));
    },
    onError: (err: any) => {
      toast.error('Bağlantı kaldırılırken hata oluştu: ' + err.message);
    }
  });

  const [isSelectingEvent, setIsSelectingEvent] = useState(false);
  const handleSelectEventType = async (uri: string) => {
    setIsSelectingEvent(true);
    const toastId = toast.loading('Varsayılan etkinlik türü kaydediliyor...');
    try {
      await selectCalendlyEventType(uri);
      queryClient.invalidateQueries({ queryKey: ['calendly-integration'] });
      toast.success('Varsayılan etkinlik türü başarıyla güncellendi!', { id: toastId });
    } catch (err: any) {
      toast.error('Seçim kaydedilemedi: ' + err.message, { id: toastId });
    } finally {
      setIsSelectingEvent(false);
    }
  };

  const [isSyncingCalendly, setIsSyncingCalendly] = useState(false);
  const handleSyncCalendly = async () => {
    setIsSyncingCalendly(true);
    const toastId = toast.loading('Calendly randevuları eşitleniyor...');
    try {
      const res = await syncCalendly();
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success(`${res.count} yeni randevu başarıyla eşitlendi!`, { id: toastId });
      refetchCalendly();
    } catch (e: any) {
      toast.error('Randevu eşitleme hatası: ' + e.message, { id: toastId });
    } finally {
      setIsSyncingCalendly(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Özel randevu değişkeni panoya kopyalandı!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080b10] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Premium Header */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-[#0c1220] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
            <div className="space-y-1 z-10">
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Settings2 className="text-emerald-500 size-8 animate-pulse" />
                {t('settings_title', 'Ayarlar')}
              </h1>
              <p className="text-slate-400 font-bold text-sm">
                {t('settings_subtitle', 'Hesabınızı ve entegrasyonlarınızı en üst düzeyde yönetin.')}
              </p>
            </div>
            <div className="flex items-center gap-4 z-10">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sistem Durumu</p>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                  <span className="size-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Aktif ve Güvenli
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          
          {/* Calendly Integration Card (PREMIUM FIRST) */}
          <div className="bg-[#0c1220] border-2 border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl relative group/card transition-all duration-300 hover:border-emerald-500/40">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover/card:bg-emerald-500/10 transition-colors" />
            
            <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-br from-emerald-500/5 to-transparent relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5 shrink-0">
                  <Link2 size={28} className="animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">
                      Calendly Entegrasyonu
                    </h2>
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                      Önerilen
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    AI mesajlarında ve WhatsApp dizilerinde kişiselleştirilmiş randevu linklerinizi otomatikleştirin.
                  </p>
                </div>
              </div>
              
              {!calendlyInt ? (
                <Button
                  onClick={() => calendlyConnectMutation.mutate()}
                  disabled={calendlyConnectMutation.isPending || isConnectingCalendly}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 h-12 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 group active:scale-95 shrink-0"
                >
                  {calendlyConnectMutation.isPending || isConnectingCalendly ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Zap size={20} className="group-hover:animate-bounce text-emerald-100" />
                  )}
                  Calendly Bağla
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleSyncCalendly}
                    disabled={isSyncingCalendly}
                    className="bg-[#080b10] hover:bg-zinc-900 border border-white/5 text-slate-300 font-bold px-4 h-12 rounded-2xl transition-all flex items-center gap-2 active:scale-95"
                  >
                    <RefreshCw size={16} className={isSyncingCalendly ? 'animate-spin' : ''} />
                    Şimdi Eşitle
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Calendly entegrasyonunu kaldırmak istediğinize emin misiniz?')) {
                        disconnectCalendlyMutation.mutate();
                      }
                    }}
                    disabled={disconnectCalendlyMutation.isPending}
                    className="w-12 h-12 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all p-0 border border-white/5"
                  >
                    {disconnectCalendlyMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  </Button>
                </div>
              )}
            </div>

            <div className="p-8 space-y-6 relative z-10">
              {loadingCalendly ? (
                <div className="h-20 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
              ) : !calendlyInt ? (
                <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/10">
                    <Link2 size={32} />
                  </div>
                  <h3 className="text-base font-black text-white mb-1">Calendly Hesabı Bağlı Değil</h3>
                  <p className="text-slate-550 font-bold text-xs max-w-xs mx-auto">
                    Toplantı linklerinizi AI outreach şablonlarında dinamik kullanmak için hesabınızı bağlayın.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#080b10] rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">Hesap Bağlı</span>
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                            {calendlyInt.syncStatus === 'synced' ? 'Eşitlendi' : 'Aktif'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 truncate max-w-xs">
                          {calendlyInt.schedulingUrl}
                        </p>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Son Eşitleme</p>
                      <p className="text-xs font-bold text-slate-300 mt-0.5">
                        {calendlyInt.connectedAt ? new Date(calendlyInt.connectedAt).toLocaleString('tr-TR') : 'Şimdi'}
                      </p>
                    </div>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Event Type Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        Varsayılan Etkinlik Türü
                        {loadingEventTypes && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                      </label>
                      <div className="relative">
                        <select
                          disabled={loadingEventTypes || isSelectingEvent}
                          value={calendlyInt.selectedEventType?.uri || ''}
                          onChange={(e) => handleSelectEventType(e.target.value)}
                          className="w-full h-12 bg-white/5 border border-white/5 rounded-xl px-4 text-xs font-bold text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/50 hover:bg-white/10 transition-all pr-10"
                        >
                          <option value="" disabled className="bg-[#0c1220]">Bir görüşme tipi seçin</option>
                          {eventTypes?.map((et: any) => (
                            <option key={et.uri} value={et.uri} className="bg-[#0c1220] py-2">
                              {et.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 size-4 text-slate-500 pointer-events-none" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-550 leading-relaxed">
                        AI asistanı veya sıralı WhatsApp kampanyalarında bu etkinlik türüne ait scheduling linki gönderilir.
                      </p>
                    </div>

                    {/* Booking Link Variable Helper */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                        Mesaj Değişkeni Kodu
                      </label>
                      <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/5 rounded-xl h-12">
                        <code className="text-emerald-400 text-xs font-black select-all flex-1 tracking-wider">
                          {"{{booking_link}}"}
                        </code>
                        <Button
                          variant="ghost"
                          onClick={() => copyToClipboard('{{booking_link}}')}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-lg"
                          title="Kopyala"
                        >
                          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </Button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-550 leading-relaxed">
                        WhatsApp şablonlarına bu kodu ekleyerek lead'lerinize özel takvim randevu bağlantılarınızı dinamik yerleştirin.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Disclaimer Security Footer */}
            <div className="p-6 bg-white/5 border-t border-white/5">
              <div className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={24} />
                <div>
                  <h4 className="text-sm font-black text-white mb-1 uppercase tracking-wide">
                    Güvenli OAuth Entegrasyonu
                  </h4>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                    Calendly hesabınız OAuth 2.0 protokolü ile tamamen şifreli bağlanır. WPAIFlow şifrelerinizi asla saklamaz ve sadece randevu listeleme ve planlama yetkilerine erişir.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legacy Calendar Integrations Card (Google Calendar) */}
          <div className="bg-[#0c1220] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-br from-white/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5 shrink-0">
                  <Calendar size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Google Takvim Entegrasyonu
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    Google Takvim randevu ve müsaitliklerinizi senkronize edin.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => googleConnectMutation.mutate()}
                disabled={googleConnectMutation.isPending || isConnectingGoogle}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 h-12 rounded-2xl transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 group active:scale-95 shrink-0"
              >
                {googleConnectMutation.isPending || isConnectingGoogle ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Zap size={20} className="group-hover:animate-pulse" />
                )}
                Takvim Bağla
              </Button>
            </div>

            <div className="p-8">
              {loadingGoogle ? (
                <div className="space-y-4">
                  {[1].map(i => (
                    <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
                  ))}
                </div>
              ) : !connections || connections.length === 0 ? (
                <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                  <div className="w-16 h-16 bg-slate-800/50 text-slate-550 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={28} />
                  </div>
                  <h3 className="text-base font-black text-white mb-1">Bağlantı Yok</h3>
                  <p className="text-slate-550 font-bold text-xs max-w-xs mx-auto">
                    Henüz bir Google Takvimi bağlanmamış.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((conn: any) => (
                    <div 
                      key={conn.email}
                      className="group flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-300"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-[#080b10] rounded-2xl shadow-inner flex items-center justify-center border border-white/5 group-hover:border-amber-500/30 transition-colors">
                          <img 
                            src={conn.provider === 'google' ? 'https://www.google.com/favicon.ico' : 'https://www.microsoft.com/favicon.ico'} 
                            alt={conn.provider}
                            className="w-8 h-8"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-white text-base uppercase tracking-tight">{conn.provider}</span>
                            {conn.isActive ? (
                              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                <CheckCircle2 size={12} /> AKTİF
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[10px] text-rose-400 font-black bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                                <XCircle size={12} /> PASİF
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-400 mt-1">{conn.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (confirm(t('settings_confirm_disconnect', 'Bu bağlantıyı kaldırmak istediğinize emin misiniz?'))) {
                            deleteGoogleMutation.mutate(conn.provider);
                          }
                        }}
                        className="w-12 h-12 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all p-0 border border-white/5"
                      >
                        <Trash2 size={22} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats/Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c1220] border border-white/5 p-6 rounded-3xl flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <Sparkles size={24} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Akıllı Senkronizasyon</h4>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Randevularınız saniyeler içinde WPAIFlow lead hattı ve pipeline ile otomatik senkronize edilir.</p>
            </div>
            <div className="bg-[#0c1220] border border-white/5 p-6 rounded-3xl flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center border border-purple-500/20">
                <Zap size={24} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Oto-Pilot Görüşme</h4>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Sequencelar ve yapay zeka üzerinden müşterilerinizi otomatik takviminize yönlendirin.</p>
            </div>
            <div className="bg-[#0c1220] border border-white/5 p-6 rounded-3xl flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">%100 Uyumlu</h4>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Calendly API v2 altyapısı ile en yeni özellikleri ve webhook standartlarını destekler.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

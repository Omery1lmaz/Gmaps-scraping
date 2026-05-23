import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCalendarConnections, getGoogleAuthUrl, connectGoogleCalendar, deleteCalendarConnection } from '../lib/api';
import { Calendar, CheckCircle2, XCircle, Trash2, ShieldCheck, Zap, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '../lib/i18n';
import { useLocation, useNavigate } from '../lib/router';
import { Button } from '../components/ui/button';

export function SettingsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: connections, isLoading } = useQuery({
    queryKey: ['calendar-connections'],
    queryFn: getCalendarConnections,
  });

  // Automated OAuth Flow Handler
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleCode = params.get('google_code');
    const error = params.get('error');

    if (googleCode) {
      handleAutoConnect(googleCode);
    } else if (error) {
      toast.error(t('settings_calendar_error', 'Bağlantı hatası: ') + error);
      navigate('/settings', { replace: true });
    }
  }, [location.search]);

  const handleAutoConnect = async (code: string) => {
    setIsConnecting(true);
    const toastId = toast.loading(t('settings_calendar_connecting', 'Google Takvim bağlanıyor...'));
    console.log('Attempting to connect with code:', code);
    
    try {
      const response = await connectGoogleCalendar(code);
      console.log('Connection response:', response);
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast.success(t('settings_calendar_connected', 'Google Takvim başarıyla bağlandı!'), { id: toastId });
      navigate('/settings', { replace: true });
    } catch (err: any) {
      console.error('Connection error:', err);
      const errorMessage = err.response?.data?.error || err.message;
      toast.error(t('settings_calendar_error', 'Bağlantı hatası: ') + errorMessage, { id: toastId, duration: 5000 });
      navigate('/settings', { replace: true });
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMutation = useMutation({
    mutationFn: getGoogleAuthUrl,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url; // Use same window for cleaner flow
      }
    },
    onError: (err: any) => {
      toast.error(t('settings_calendar_auth_error', 'Yetkilendirme URL\'i alınamadı: ') + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCalendarConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast.success(t('settings_calendar_disconnected', 'Takvim bağlantısı kaldırıldı.'));
    },
  });

  return (
    <div className="min-h-screen bg-[#080b10] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-[#0c1220] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
            <div className="space-y-1 z-10">
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Settings2 className="text-amber-500 size-8" />
                {t('settings_title', 'Ayarlar')}
              </h1>
              <p className="text-slate-400 font-bold text-sm">
                {t('settings_subtitle', 'Hesabınızı ve entegrasyonlarınızı en üst düzeyde yönetin.')}
              </p>
            </div>
            <div className="flex items-center gap-4 z-10">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sistem Durumu</p>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                  <span className="size-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Aktif ve Güvenli
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Calendar Integrations Card */}
          <div className="bg-[#0c1220] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-br from-white/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
                  <Calendar size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {t('settings_integrations_title', 'Takvim Entegrasyonları')}
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    {t('settings_integrations_desc', 'Toplantılarınızı otomatik olarak senkronize edin.')}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending || isConnecting}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 h-12 rounded-2xl transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 group active:scale-95"
              >
                {connectMutation.isPending || isConnecting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Zap size={20} className="group-hover:animate-pulse" />
                )}
                {t('settings_connect_btn', 'Yeni Bağlantı Kur')}
              </Button>
            </div>

            <div className="p-8">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
                  ))}
                </div>
              ) : !connections || connections.length === 0 ? (
                <div className="text-center py-16 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                  <div className="w-20 h-20 bg-slate-800/50 text-slate-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={40} />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2">Bağlantı Yok</h3>
                  <p className="text-slate-500 font-bold text-sm max-w-xs mx-auto">
                    {t('settings_no_connections', 'Henüz bir takvim bağlı değil. Hemen bir bağlantı kurarak başlayın.')}
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
                                <CheckCircle2 size={12} /> {t('status_active', 'AKTİF')}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[10px] text-rose-400 font-black bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                                <XCircle size={12} /> {t('status_inactive', 'PASİF')}
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
                            deleteMutation.mutate(conn.provider);
                          }
                        }}
                        className="w-12 h-12 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all p-0"
                      >
                        <Trash2 size={22} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-white/5 border-t border-white/5">
              <div className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={24} />
                <div>
                  <h4 className="text-sm font-black text-white mb-1 uppercase tracking-wide">
                    {t('settings_security_title', 'Ultra Güvenli Bağlantı')}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                    {t('settings_security_desc', 'Verileriniz Google OAuth 2.0 üzerinden askeri düzeyde şifreleme ile aktarılır. Şifreleriniz asla sistemimizde saklanmaz ve sadece yetki verdiğiniz verilere erişilir.')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats/Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c1220] border border-white/5 p-6 rounded-3xl flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <Sparkles size={24} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Akıllı Senkronizasyon</h4>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Toplantılarınız saniyeler içinde tüm cihazlarınızda güncellenir.</p>
            </div>
            <div className="bg-[#0c1220] border border-white/5 p-6 rounded-3xl flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center border border-purple-500/20">
                <Zap size={24} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Oto-Pilot Randevu</h4>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Sequencelar üzerinden otomatik randevu talepleri oluşturun.</p>
            </div>
            <div className="bg-[#0c1220] border border-white/5 p-6 rounded-3xl flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">%100 Uyumlu</h4>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Google ve Microsoft ekosistemleri ile tam entegre çalışır.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Missing import fix
import { Settings2 } from 'lucide-react';

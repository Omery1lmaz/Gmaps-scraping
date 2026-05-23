import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMeetings, getCalendarEvents, syncCalendar } from '../lib/api';
import { Calendar as CalendarIcon, Clock, MapPin, Video, ExternalLink, Plus, RefreshCw, Sparkles, Filter, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useT } from '../lib/i18n';
import { Button } from '../components/ui/button';

export function CalendarPage() {
  const t = useT();
  const [view, setView] = useState<'internal' | 'external'>('internal');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const { data: meetings, isLoading: loadingMeetings, refetch: refetchMeetings } = useQuery({
    queryKey: ['meetings'],
    queryFn: getMeetings,
  });

  const { data: externalEvents, isLoading: loadingExternal, refetch: refetchExternal } = useQuery({
    queryKey: ['external-events'],
    queryFn: getCalendarEvents,
    enabled: view === 'external',
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Google Takvim ile senkronize ediliyor...');
    try {
      const res = await syncCalendar();
      toast.success(`${res.count} yeni etkinlik senkronize edildi!`, { id: toastId });
      refetchMeetings();
    } catch (e: any) {
      toast.error('Senkronizasyon hatası: ' + e.message, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const isLoading = view === 'internal' ? loadingMeetings : loadingExternal;
  const events = view === 'internal' ? meetings : externalEvents;

  return (
    <div className="min-h-screen bg-[#080b10] p-6 lg:p-8 space-y-8">
      {/* Premium Header */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
        <div className="relative bg-[#0c1220] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="flex items-center gap-5 z-10">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-2xl">
              <CalendarIcon size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {t('calendar_title', 'Takvim Merkezi')}
                <Sparkles className="size-4 text-amber-500 animate-pulse" />
              </h1>
              <p className="text-slate-400 font-bold text-sm">
                {t('calendar_subtitle', 'Tüm toplantı ve etkinliklerinizi tek bir premium panelden yönetin.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10">
            <div className="bg-[#080b10] p-1.5 rounded-2xl border border-white/5 flex items-center shadow-inner">
              <button
                onClick={() => setView('internal')}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'internal'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                PLATFORM
              </button>
              <button
                onClick={() => setView('external')}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'external'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                GOOGLE
              </button>
            </div>

            <div className="h-10 w-px bg-white/5 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
               <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl hover:bg-amber-500/20 transition-all shadow-sm flex items-center gap-2"
                  title="Google ile Eşitle"
                >
                  <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                  <span className="text-[10px] font-black hidden lg:block uppercase tracking-widest">Eşitle</span>
                </button>
               <button 
                  onClick={() => view === 'internal' ? refetchMeetings() : refetchExternal()}
                  className="p-2.5 bg-[#0c1220] border border-white/5 text-slate-400 rounded-xl hover:text-white hover:bg-white/5 transition-all shadow-sm"
                  title="Yenile"
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
                <div className="bg-[#0c1220] p-1 rounded-xl border border-white/5 flex items-center">
                  <button onClick={() => setLayout('grid')} className={`p-1.5 rounded-lg transition-all ${layout === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500'}`}><LayoutGrid size={16}/></button>
                  <button onClick={() => setLayout('list')} className={`p-1.5 rounded-lg transition-all ${layout === 'list' ? 'bg-white/10 text-white' : 'text-slate-500'}`}><List size={16}/></button>
                </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className={`grid ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-white/5 animate-pulse rounded-3xl border border-white/5 shadow-2xl" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <div className="bg-[#0c1220] border border-white/5 border-dashed rounded-[2.5rem] p-20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-30" />
          <div className="relative z-10">
            <div className="w-24 h-24 bg-amber-500/10 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-amber-500/20">
              <CalendarIcon size={48} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
              {t('calendar_empty_title', 'Ajandanız Şimdilik Boş')}
            </h3>
            <p className="text-slate-500 font-bold text-base max-w-md mx-auto mb-10 leading-relaxed">
              {t('calendar_empty_desc', 'Henüz planlanmış bir toplantınız bulunmuyor. Yeni bir lead ile görüşme ayarlayarak başlayabilirsiniz.')}
            </p>
            <Button className="bg-white text-black hover:bg-slate-200 font-black px-8 h-12 rounded-2xl transition-all shadow-xl active:scale-95">
              <Plus className="mr-2" size={20} /> Randevu Oluştur
            </Button>
          </div>
        </div>
      ) : (
        <div className={`grid ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
          {events.map((event: any) => (
            <div 
              key={event.id || event._id}
              className="group bg-[#0c1220] border border-white/5 hover:border-amber-500/30 rounded-3xl p-6 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(245,158,11,0.1)] relative overflow-hidden flex flex-col"
            >
              {/* Card Accent Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-colors duration-500" />
              
              <div className="flex justify-between items-start mb-6 z-10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{view === 'internal' ? (event.status || 'PENDING') : 'GOOGLE CLOUD'}</span>
                  </div>
                  <h3 className="text-lg font-black text-white group-hover:text-amber-500 transition-colors line-clamp-1 tracking-tight">
                    {event.title || event.summary}
                  </h3>
                </div>
                <div className="w-10 h-10 bg-[#080b10] rounded-xl flex items-center justify-center border border-white/5 group-hover:border-amber-500/30 transition-all">
                   {view === 'internal' ? <CalendarIcon size={18} className="text-slate-500 group-hover:text-amber-500" /> : <img src="https://www.google.com/favicon.ico" className="w-5 h-5 opacity-70 group-hover:opacity-100" />}
                </div>
              </div>

              <div className="space-y-4 mb-8 z-10 flex-1">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
                    <Clock size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    {event.date || event.start?.dateTime ? format(new Date(event.date || event.start?.dateTime), 'PPP p', { locale: tr }) : 'Tarih Belirtilmemiş'}
                  </span>
                </div>

                {(event.location || event.meetingLink) && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                    <div className={`w-8 h-8 ${event.meetingLink?.includes('zoom') || event.meetingLink?.includes('google') ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'} rounded-lg flex items-center justify-center shrink-0`}>
                      {event.meetingLink?.includes('zoom') || event.meetingLink?.includes('google') ? <Video size={16} /> : <MapPin size={16} />}
                    </div>
                    <span className="text-xs font-bold text-slate-300 truncate">{event.location || event.meetingLink}</span>
                  </div>
                )}

                {event.notes && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 italic">
                    <p className="text-xs font-bold text-slate-500 line-clamp-2 leading-relaxed">
                      "{event.notes}"
                    </p>
                  </div>
                )}
              </div>

              <div className="z-10 pt-2">
                {event.htmlLink ? (
                  <a 
                    href={event.htmlLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full h-11 bg-white/5 hover:bg-amber-500 text-slate-300 hover:text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all duration-300 border border-white/5 hover:border-amber-400 group/btn"
                  >
                    <ExternalLink size={16} className="group-hover/btn:scale-110 transition-transform" /> 
                    GOOGLE TAKVİMDE AÇ
                  </a>
                ) : (
                  <Button variant="outline" className="w-full h-11 bg-white/5 border-white/10 text-slate-400 hover:text-white font-black text-[10px] uppercase rounded-2xl tracking-widest">
                    Detayları Görüntüle
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

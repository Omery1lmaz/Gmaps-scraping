import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useT } from '../../../../lib/i18n';
import { Progress } from '../../../../components/ui/progress';

export function SyncProgressBar({ syncStatus }: { syncStatus: any }) {
  const t = useT();
  const [visible, setVisible] = useState(true);

  // Reset visibility state when syncStatus changes to COMPLETED
  useEffect(() => {
    if (syncStatus?.status === 'COMPLETED') {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [syncStatus?.status]);

  if (!syncStatus || syncStatus.status === 'IDLE' || syncStatus.status === 'COMPLETED') {
    if (syncStatus?.status === 'COMPLETED' && visible) {
      return (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-xs font-black text-emerald-400 shadow-2xl animate-in slide-in-from-top-2 duration-500 uppercase tracking-widest">
          <span className="flex items-center gap-2"><CheckCircle2 className="size-4" /> {t('wp_sync_done')}</span>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500 text-black rounded-lg px-2.5 py-1 text-[10px]">{syncStatus.totalMessages || 0} {t('wp_total_msgs')}</span>
            <button 
              onClick={() => setVisible(false)} 
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/5"
            >
              <X className="size-3.5" />
            </button>
          </div>
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
    <div className="rounded-2xl border border-white/5 bg-white/5 px-6 py-5 shadow-2xl space-y-4 animate-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs font-black text-emerald-400 uppercase tracking-widest">
          <Loader2 className="size-4 animate-spin text-emerald-500" />
          <span>{syncStatus.status}: {syncedChats}/{totalChats} SOHBET TARANIYOR</span>
        </div>
        <span className="bg-emerald-500 text-black rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">{totalMessages} MESAJ</span>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <span>Genel İlerleme</span>
          <span>{Math.round(chatProgress)}%</span>
        </div>
        <Progress value={chatProgress} className="h-2.5 bg-white/5 overflow-hidden rounded-full" />
      </div>

      {/* Current chat progress */}
      {syncStatus.lastChatName && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <span className="truncate flex-1 mr-4">İşleniyor: {syncStatus.lastChatName}</span>
            <span className="shrink-0">{syncStatus.syncedMessagesInChat || 0}/{syncStatus.totalMessagesInChat || '?'} mesaj</span>
          </div>
          <Progress value={inChatProgress} className="h-1.5 bg-white/5 overflow-hidden rounded-full" />
        </div>
      )}
    </div>
  );
}

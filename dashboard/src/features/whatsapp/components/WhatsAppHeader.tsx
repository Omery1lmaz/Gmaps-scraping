
import React from 'react';
import { MessageCircle, CheckCircle2, AlertCircle, RefreshCcw, LogOut, ChevronDown, Smartphone } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';
import { useT } from '../../../lib/i18n';

interface WhatsAppHeaderProps {
  sessionInfo: any;
  connected: boolean;
  socketConnected: boolean;
  onSync: () => void;
  onLogout: () => void;
  onRestart?: () => void;
  syncPending: boolean;
  logoutPending: boolean;
  restartPending?: boolean;
  isSimpleView?: boolean;
  sessions?: any[];
  selectedSessionId?: string | null;
  onSessionChange?: (id: string) => void;
}

export function WhatsAppHeader({
  sessionInfo,
  connected,
  socketConnected,
  onSync,
  onLogout,
  onRestart,
  syncPending,
  logoutPending,
  restartPending = false,
  isSimpleView = false,
  sessions = [],
  selectedSessionId,
  onSessionChange
}: WhatsAppHeaderProps) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/5 bg-[#0c1220]/60 backdrop-blur-xl px-8 py-5 shadow-2xl relative overflow-hidden group">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-500" />
      
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 text-emerald-500 shadow-inner">
          <MessageCircle size={28} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
        </div>
        
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="text-gradient-tw">{isSimpleView ? t('wp_chat') : t('wp_control_center')}</span>
            {socketConnected ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-black text-rose-400 uppercase tracking-widest">
                <span className="size-1 rounded-full bg-rose-500" />
                Offline
              </span>
            )}
          </h2>

          <div className="mt-1.5 flex items-center flex-wrap gap-x-4 gap-y-1">
            {/* Account Switcher / Status */}
            {sessions.length > 0 ? (
              <div className="flex items-center gap-2 group/select bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-3 py-1.5 transition-all cursor-pointer relative min-w-[160px]">
                <Smartphone size={12} className={cn(connected ? "text-emerald-500" : "text-slate-400")} />
                <select
                  value={selectedSessionId || ''}
                  onChange={(e) => onSessionChange?.(e.target.value)}
                  className="bg-transparent text-[11px] font-black text-slate-200 outline-none border-none cursor-pointer appearance-none pr-6 w-full"
                >
                  {sessions.map((s: any) => (
                    <option key={s._id} value={s._id} className="bg-slate-900 text-white">
                      {s.sessionName} {s.status === 'CONNECTED' ? '🟢' : '🔴'}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="text-slate-500 absolute right-2 pointer-events-none group-hover/select:text-white transition-colors" />
              </div>
            ) : (
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                <span className={cn('size-1.5 rounded-full', connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500')} />
                {t('wp_active_account')}: <span className="text-slate-100 font-black">{sessionInfo?.pushName || t('wp_connected_label')}</span>
              </p>
            )}
            {sessionInfo?.phoneNumber && (
              <span className="text-[10px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded-lg">
                +{sessionInfo.phoneNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {connected ? (
          <Badge className="border-none bg-emerald-500/10 text-emerald-400 px-4 py-2 text-[10px] font-black tracking-widest uppercase rounded-xl">
            <CheckCircle2 className="mr-2 size-3.5" /> {t('wp_active')}
          </Badge>
        ) : (
          <Badge className="border-none bg-rose-500/10 text-rose-400 px-4 py-2 text-[10px] font-black tracking-widest uppercase rounded-xl">
            <AlertCircle className="mr-2 size-3.5" /> {t('wp_disconnected')}
          </Badge>
        )}
        
        <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/5">
          {connected && (
            <Button 
              variant="outline" 
              className="h-11 rounded-2xl text-[10px] font-black border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300 transition-all active:scale-95 duration-200 uppercase tracking-wider" 
              onClick={onSync} 
              disabled={syncPending}
              title={t('wp_sync_history_title')}
            >
              <RefreshCcw className={cn('size-4', syncPending && 'animate-spin', !isSimpleView && 'mr-2')} /> 
              {!isSimpleView && t('wp_sync_history')}
            </Button>
          )}

          <Button 
            variant="outline" 
            className="h-11 rounded-2xl text-[10px] font-black border-white/5 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-emerald-500 transition-all active:scale-95 duration-200 uppercase tracking-wider" 
            onClick={onRestart} 
            disabled={restartPending}
            title={t('wp_restart_title')}
          >
            <RefreshCcw className={cn('size-4', restartPending && 'animate-spin', !isSimpleView && 'mr-2')} /> 
            {!isSimpleView && t('wp_restart')}
          </Button>

          {connected && (
            <Button
              variant="ghost"
              className="h-11 rounded-2xl text-[10px] font-black text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all active:scale-95 duration-200 uppercase tracking-wider"
              onClick={onLogout}
              disabled={logoutPending}
              title="Bağlantıyı Kes"
            >
              <LogOut className={cn('size-4', !isSimpleView && 'mr-2')} /> 
              {!isSimpleView && (logoutPending ? t('wp_disconnecting') : t('wp_disconnect'))}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

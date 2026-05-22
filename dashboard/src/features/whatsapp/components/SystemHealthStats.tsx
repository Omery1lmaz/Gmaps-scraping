import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useT } from '../../../lib/i18n';

interface SystemHealthStatsProps {
  sessions: any[];
  sessionStatuses: Record<string, string>;
}

export function SystemHealthStats({ sessions, sessionStatuses }: SystemHealthStatsProps) {
  const t = useT();

  return (
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
  );
}

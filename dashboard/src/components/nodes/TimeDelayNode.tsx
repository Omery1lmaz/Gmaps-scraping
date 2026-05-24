import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Clock, MessageSquare, Sparkles, HelpCircle, Target, AlertCircle, Heart, Smile, GitFork, Compass, Send, CheckCircle2, Settings2 
} from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useWorkflowStore } from '../../stores/workflowStore';

const ICON_MAP: any = {
  messagesquare: MessageSquare,
  sparkles: Sparkles,
  helpcircle: HelpCircle,
  clock: Clock,
  target: Target,
  alertcircle: AlertCircle,
  heart: Heart,
  smile: Smile,
  gitfork: GitFork,
  compass: Compass,
  send: Send,
  checkcircle: CheckCircle2
};

const ACCENT_COLORS: any = {
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', handle: '#3b82f6' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', handle: '#10b981' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', handle: '#f59e0b' },
  purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', handle: '#a855f7' },
  rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400', handle: '#f43f5e' },
  indigo: { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400', handle: '#6366f1' },
  pink: { border: 'border-pink-500/30', bg: 'bg-pink-500/10', text: 'text-pink-400', handle: '#ec4899' },
  slate: { border: 'border-zinc-800', bg: 'bg-zinc-800/30', text: 'text-zinc-400', handle: '#64748b' }
};

export const TimeDelayNode = React.memo(({ data, id }: any) => {
  const t = useT();
  const { setSelectedNodeForSettings } = useWorkflowStore();

  const waitType = data.waitType || 'duration';
  const hours = data.delayHours !== undefined ? data.delayHours : 24;

  const getDelayDisplay = () => {
    if (waitType === 'until_time') return `Saat: ${data.untilTime || '09:00'}`;
    if (waitType === 'weekdays') return 'Hafta İçi';
    
    if (hours < 1) return `${Math.round(hours * 60)} Dakika`;
    if (hours >= 24 && hours % 24 === 0) return `${Math.round(hours / 24)} Gün`;
    return `${hours} Saat`;
  };

  // Dynamic customization
  const colorKey = data.customColor || 'amber';
  const colorStyles = ACCENT_COLORS[colorKey] || ACCENT_COLORS.amber;
  const IconComponent = data.customIcon ? (ICON_MAP[data.customIcon.toLowerCase()] || Clock) : Clock;

  return (
    <div className={`px-4 py-3 shadow-lg rounded-2xl bg-[#090d12]/95 border-2 ${colorStyles.border} min-w-[210px] relative select-none group/node`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
      
      {/* Settings Icon - Absolute positioned on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeForSettings({ id, type: 'timeDelay', data } as any);
        }}
        className="absolute -right-2 -top-2 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 shadow-xl opacity-0 group-hover/node:opacity-100 transition-opacity z-20"
        title={t('vsb_node_settings')}
      >
        <Settings2 size={12} />
      </button>

      {data.activeCount !== undefined && data.activeCount > 0 && (
        <div className="absolute -top-3 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[9px] animate-pulse shadow-sm flex items-center gap-1 border border-white">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
          </span>
          {data.activeCount} {t('tdn_pending')}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg ${colorStyles.bg} p-1 ${colorStyles.text}`}>
            <IconComponent size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('tdn_logic')}</p>
            <h4 className="text-xs font-bold text-slate-100">{data.customLabel || t('tdn_delay')}</h4>
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">BEKLEME SÜRESİ</p>
        <p className="text-xs font-black text-amber-500">{getDelayDisplay()}</p>
      </div>

      {data.customDescription && (
        <div className="mt-3 pt-2 text-[9px] font-bold text-slate-400 border-t border-white/5 italic leading-tight max-w-[170px] truncate" title={data.customDescription}>
          * {data.customDescription}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
    </div>
  );
});

TimeDelayNode.displayName = 'TimeDelayNode';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useT } from '../../lib/i18n';
import { 
  GitFork, MessageSquare, Sparkles, HelpCircle, Clock, Target, AlertCircle, Heart, Smile, Compass, Send, CheckCircle2 
} from 'lucide-react';

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
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-505/10', text: 'text-blue-400', handle: '#3b82f6' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', handle: '#10b981' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', handle: '#f59e0b' },
  purple: { border: 'border-purple-500/30', bg: 'bg-purple-505/10', text: 'text-purple-400', handle: '#a855f7' },
  rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400', handle: '#f43f5e' },
  indigo: { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400', handle: '#6366f1' },
  pink: { border: 'border-pink-500/30', bg: 'bg-pink-505/10', text: 'text-pink-400', handle: '#ec4899' },
  slate: { border: 'border-zinc-800', bg: 'bg-zinc-800/30', text: 'text-zinc-400', handle: '#64748b' }
};

export function ConditionNode({ data, id }: any) {
  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    data.conditionType = e.target.value;
  };

  const t = useT();

  // Dynamic customization
  const colorKey = data.customColor || 'purple';
  const colorStyles = ACCENT_COLORS[colorKey] || ACCENT_COLORS.purple;
  const IconComponent = data.customIcon ? (ICON_MAP[data.customIcon.toLowerCase()] || GitFork) : GitFork;

  return (
    <div className={`px-4 py-3 shadow-lg rounded-2xl bg-[#090d12]/95 border-2 ${colorStyles.border} min-w-[200px] relative select-none`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg ${colorStyles.bg} p-1 ${colorStyles.text}`}>
          <IconComponent size={16} />
        </div>
        <div>
<p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('cn_check')}</p>
<h4 className="text-xs font-bold text-slate-100">{data.customLabel || t('cn_response_check')}</h4>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase">{t('cn_condition_type')}</label>
        <select 
          value={data.conditionType || 'hasReplied'} 
          onChange={handleConditionChange}
          className="w-full rounded-xl font-bold text-xs bg-zinc-900 border border-zinc-800 h-8 px-2 appearance-none focus:outline-none focus:border-purple-500 text-slate-100 cursor-pointer"
        >
          <option value="hasReplied" className="text-xs bg-zinc-900">{t('cn_responded')}</option>
          <option value="hasOpened" className="text-xs bg-zinc-900">{t('cn_opened')}</option>
        </select>
      </div>

      <div className="flex justify-between mt-4 relative text-[9px] font-black text-slate-400 uppercase">
        <span className="text-emerald-600 pl-1">{t('cn_yes')}</span>
        <span className="text-rose-500 pr-1">{t('cn_no')}</span>
      </div>

      {/* YES Branch Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ background: '#10b981', left: '25%', width: 10, height: 10 }}
      />

      {/* NO Branch Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ background: '#f43f5e', left: '75%', width: 10, height: 10 }}
      />

      {/* Description Annotations */}
      {data.customDescription && (
        <div className="mt-2.5 pt-2 text-[9px] font-bold text-slate-400 border-t border-slate-100 italic leading-tight max-w-[170px] truncate" title={data.customDescription}>
          * {data.customDescription}
        </div>
      )}
    </div>
  );
}

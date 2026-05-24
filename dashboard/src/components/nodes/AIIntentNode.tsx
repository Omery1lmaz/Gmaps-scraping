import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useT } from '../../lib/i18n';
import { 
  BrainCircuit, MessageSquare, Sparkles, HelpCircle, Clock, Target, AlertCircle, Heart, Smile, Compass, Send, CheckCircle2, 
  Banknote, ThumbsDown, Calendar, Info, HelpCircle as HelpIcon, Settings2
} from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';

const ICON_MAP: any = {
  price: Banknote,
  reject: ThumbsDown,
  meeting: Calendar,
  more_info: Info,
  other: HelpIcon
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

const INTENTS = [
  { id: 'price', label: 'Price / Offer', color: '#f59e0b', icon: Banknote },
  { id: 'reject', label: 'Reject / Not Interested', color: '#f43f5e', icon: ThumbsDown },
  { id: 'meeting', label: 'Meeting / Appointment', color: '#a855f7', icon: Calendar },
  { id: 'more_info', label: 'More Info', color: '#3b82f6', icon: Info },
  { id: 'other', label: 'Other / Neutral', color: '#64748b', icon: HelpIcon },
];

export const AIIntentNode = React.memo(({ data, id }: any) => {
  const t = useT();
  const { setSelectedNodeForSettings } = useWorkflowStore();

  // Dynamic customization
  const colorKey = data.customColor || 'indigo';
  const colorStyles = ACCENT_COLORS[colorKey] || ACCENT_COLORS.indigo;
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-2xl bg-[#090d12]/95 border-2 ${colorStyles.border} min-w-[220px] relative select-none group/node`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
      
      {/* Settings Icon - Absolute positioned on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeForSettings({ id, type: 'aiIntent', data } as any);
        }}
        className="absolute -right-2 -top-2 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 shadow-xl opacity-0 group-hover/node:opacity-100 transition-opacity z-20"
        title={t('vsb_node_settings')}
      >
        <Settings2 size={12} />
      </button>
      
      <div className="flex items-center gap-2 mb-3">
        <div className={`rounded-lg ${colorStyles.bg} p-1 ${colorStyles.text}`}>
          <BrainCircuit size={16} className="animate-pulse" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">AI ANALİZ</p>
          <h4 className="text-xs font-bold text-slate-100">{data.customLabel || t('vsb_node_ai_intent', 'AI Niyet Analizi')}</h4>
        </div>
      </div>

      <div className="space-y-2">
        {INTENTS.map((intent) => (
          <div key={intent.id} className="flex items-center justify-between text-[10px] font-bold text-slate-300 bg-zinc-900/50 rounded-lg px-2 py-1.5 border border-zinc-800/50 relative">
            <div className="flex items-center gap-1.5">
              <intent.icon size={12} style={{ color: intent.color }} />
              <span>{intent.label}</span>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={intent.id}
              style={{ background: intent.color, width: 8, height: 8, right: -4 }}
            />
          </div>
        ))}
      </div>

      {/* Description Annotations */}
      {data.customDescription && (
        <div className="mt-2.5 pt-2 text-[9px] font-bold text-slate-400 border-t border-white/5 italic leading-tight max-w-[190px] truncate" title={data.customDescription}>
          * {data.customDescription}
        </div>
      )}
    </div>
  );
});

AIIntentNode.displayName = 'AIIntentNode';

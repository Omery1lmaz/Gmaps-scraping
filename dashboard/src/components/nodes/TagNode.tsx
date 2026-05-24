import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useT } from '../../lib/i18n';
import { 
  Tag, MessageSquare, Sparkles, HelpCircle, Clock, Target, AlertCircle, Heart, Smile, Compass, Send, CheckCircle2, Settings2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTags } from '../../lib/api';
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
  tag: Tag,
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

export const TagNode = React.memo(({ data, id }: any) => {
  const t = useT();
  const { setSelectedNodeForSettings } = useWorkflowStore();
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags
  });

  const selectedTag = tags.find((tag: any) => tag.id === data.tagId);

  // Dynamic customization
  const colorKey = data.customColor || 'emerald';
  const colorStyles = ACCENT_COLORS[colorKey] || ACCENT_COLORS.emerald;
  const IconComponent = data.customIcon ? (ICON_MAP[data.customIcon.toLowerCase()] || Tag) : Tag;

  return (
    <div className={`px-4 py-3 shadow-lg rounded-2xl bg-[#090d12]/95 border-2 ${colorStyles.border} min-w-[200px] relative select-none group/node`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
      
      {/* Settings Icon - Absolute positioned on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeForSettings({ id, type: 'tag', data } as any);
        }}
        className="absolute -right-2 -top-2 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 shadow-xl opacity-0 group-hover/node:opacity-100 transition-opacity z-20"
        title={t('vsb_node_settings')}
      >
        <Settings2 size={12} />
      </button>
      
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg ${colorStyles.bg} p-1 ${colorStyles.text}`}>
          <IconComponent size={16} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">İŞLEM</p>
          <h4 className="text-xs font-bold text-slate-100">{data.customLabel || t('vsb_node_tag', 'Otomatik Etiketle')}</h4>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">UYGULANACAK ETİKET</p>
        <div className="flex items-center gap-2">
          {selectedTag ? (
            <>
               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedTag.color || '#10b981' }} />
               <span className="text-xs font-bold text-slate-200">{selectedTag.name}</span>
            </>
          ) : (
            <span className="text-xs font-bold text-slate-500">Etiket Seçilmedi</span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />

      {/* Description Annotations */}
      {data.customDescription && (
        <div className="mt-2.5 pt-2 text-[9px] font-bold text-slate-400 border-t border-white/5 italic leading-tight max-w-[170px] truncate" title={data.customDescription}>
          * {data.customDescription}
        </div>
      )}
    </div>
  );
});

TagNode.displayName = 'TagNode';

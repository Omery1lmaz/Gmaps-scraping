import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Calendar, Clock, X, Settings2 } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useWorkflowStore } from '../../stores/workflowStore';

export const MeetingNode = React.memo(({ data, id, selected }: any) => {
  const t = useT();
  const { title, duration } = data;
  const { setSelectedNodeForSettings, setNodes, nodes } = useWorkflowStore();

  return (
    <div className={`group relative min-w-[260px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl transition-all duration-300 border-2 ${
      selected ? 'border-amber-500 scale-[1.02] shadow-amber-500/20' : 'border-slate-100 dark:border-slate-800'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-500/5 rounded-t-3xl">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500 text-white p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-none uppercase">
              {t('vsb_node_meeting_title', 'Toplantı Planla')}
            </h3>
            <span className="text-[10px] font-bold text-amber-600 tracking-widest mt-1 block">CALENDAR</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNodeForSettings({ id, type: 'meeting', data } as any);
            }}
            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title={t('vsb_node_settings')}
          >
            <Settings2 size={16} />
          </button>
          <button
            onClick={() => {
              setNodes(nodes.filter(n => n.id !== id));
            }}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
           <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{t('vsb_node_meeting_subject', 'Toplantı Konusu')}</p>
           <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{title || 'Konu Belirtilmedi'}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex justify-between items-center">
           <p className="text-[9px] font-black text-slate-400 uppercase">{t('vsb_node_meeting_duration', 'Süre')}</p>
           <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <Clock size={12} />
              {duration || 60} dk
           </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-amber-500 border-2 border-white dark:border-slate-900 !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-amber-500 border-2 border-white dark:border-slate-900 !-bottom-1.5"
      />
    </div>
  );
});

MeetingNode.displayName = 'MeetingNode';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Settings2 } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useWorkflowStore } from '../../stores/workflowStore';

export const TriggerNode = React.memo(({ data, id }: any) => {
  const t = useT();
  const { setSelectedNodeForSettings } = useWorkflowStore();

  return (
    <div className="px-4 py-3 shadow-md rounded-2xl bg-emerald-500 border-2 border-emerald-600 text-white min-w-[150px] relative group/node">
      {/* Settings Icon - Absolute positioned on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeForSettings({ id, type: 'trigger', data } as any);
        }}
        className="absolute -right-2 -top-2 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 shadow-xl opacity-0 group-hover/node:opacity-100 transition-opacity z-20"
        title={t('vsb_node_settings')}
      >
        <Settings2 size={12} />
      </button>

      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-emerald-600 p-1">
          <Play size={16} className="fill-white" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-85">{t('tr_trigger')}</p>
          <h4 className="text-xs font-bold">{t('tr_person_entered')}</h4>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ background: '#047857', width: 8, height: 8 }}
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';

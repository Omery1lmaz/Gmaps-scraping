import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useT } from '../../lib/i18n';

export function TriggerNode() {
  const t = useT();

  return (
    <div className="px-4 py-3 shadow-md rounded-2xl bg-emerald-500 border-2 border-emerald-600 text-white min-w-[150px] relative">
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
}

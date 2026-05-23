import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Calendar, Clock, X } from 'lucide-react';
import { useT } from '../../lib/i18n';

export function MeetingNode({ data, selected }: any) {
  const t = useT();
  const { title, duration, onUpdate, onDelete } = data;

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
        <button
          onClick={() => onDelete?.()}
          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">
            {t('vsb_node_meeting_subject', 'Toplantı Konusu')}
          </label>
          <input
            type="text"
            value={title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Örn: Demo Toplantısı"
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">
            {t('vsb_node_meeting_duration', 'Süre (Dakika)')}
          </label>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <select
              value={duration || 60}
              onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
              className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
            >
              <option value={15}>15 dk</option>
              <option value={30}>30 dk</option>
              <option value={45}>45 dk</option>
              <option value={60}>60 dk</option>
              <option value={90}>90 dk</option>
              <option value={120}>120 dk</option>
            </select>
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
}

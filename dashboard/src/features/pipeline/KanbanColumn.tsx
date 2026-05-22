import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanItem } from './KanbanItem';

interface KanbanColumnProps {
  id: string;
  title: string;
  items: any[];
}

const STAGE_LABELS: Record<string, string> = {
  NEW: 'YENİ',
  CONTACTED: 'İLETİŞİME GEÇİLDİ',
  FOLLOW_UP: 'TAKİP EDİLİYOR',
  MEETING_BOOKED: 'TOPLANTI AYARLANDI',
  CLOSED: 'KAZANILDI',
  REJECTED: 'REDDEDİLDİ'
};

export function KanbanColumn({ id, title, items }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  const displayTitle = STAGE_LABELS[id] || title;

  return (
    <div className="flex flex-col w-80 shrink-0 bg-[#0c1220]/50 rounded-2xl border border-white/5 p-4 space-y-4 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">{displayTitle}</h3>
        <span className="text-[11px] font-black text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full tabular-nums">
          {items.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-3">
        <SortableContext id={id} items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <KanbanItem key={item.id} id={item.id} lead={item} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="h-24 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Boş
          </div>
        )}
      </div>
    </div>
  );
}

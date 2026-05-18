import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanItem } from './KanbanItem';

interface KanbanColumnProps {
  id: string;
  title: string;
  items: any[];
}

export function KanbanColumn({ id, title, items }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col w-80 shrink-0 bg-slate-100/50 rounded-2xl border border-slate-200/60 p-4 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
        <span className="text-[11px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full tabular-nums">
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
          <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] font-bold text-slate-300 uppercase tracking-widest">
            Boş
          </div>
        )}
      </div>
    </div>
  );
}

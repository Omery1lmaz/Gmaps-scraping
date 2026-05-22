import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '../../components/ui/card';
import { Building2, Phone, MessageSquare, Star, Tag as TagIcon } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../lib/store';

interface KanbanItemProps {
  id: string;
  lead: any;
  isOverlay?: boolean;
}

export function KanbanItem({ id, lead, isOverlay }: KanbanItemProps) {
  const { setSelectedLeadId } = useUIStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (!lead) return null;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => setSelectedLeadId(lead.id)}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isOverlay && "z-50"
      )}
    >
      <Card className={cn(
        "border border-white/5 bg-[#080b10]/80 hover:bg-white/5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group overflow-hidden backdrop-blur-md",
        isOverlay && "shadow-xl ring-2 ring-emerald-500/20"
      )}>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 truncate flex-1">{lead.businessName}</h4>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="size-3 fill-current" />
                <span className="text-[10px] font-black">{lead.rating}</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{lead.category}</p>
          </div>

          <div className="flex flex-wrap gap-1">
            {lead.tags?.slice(0, 2).map((tag: any) => (
              <div 
                key={tag.id}
                style={{ backgroundColor: tag.color + '15', color: tag.color }}
                className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-transparent"
              >
                {tag.name}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              {lead.phone && (
                <div className="flex items-center gap-1 text-slate-400">
                  <Phone className="size-3" />
                  <span className="text-[10px] font-bold">Var</span>
                </div>
              )}
              {lead._count?.notes > 0 && (
                <div className="flex items-center gap-1 text-emerald-500">
                  <MessageSquare className="size-3" />
                  <span className="text-[10px] font-bold">{lead._count.notes}</span>
                </div>
              )}
            </div>
            {lead.assignedTo && (
              <img src={lead.assignedTo.avatar} className="size-5 rounded-full ring-2 ring-white shadow-sm" alt="" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

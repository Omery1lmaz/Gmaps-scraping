import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeads, updateLead } from '../../lib/api';
import { KanbanColumn } from './KanbanColumn';
import { KanbanItem } from './KanbanItem';
import { AddLeadsSheet } from './AddLeadsSheet';
import { toast } from 'sonner';

type LeadStatus = 'NEW' | 'CONTACTED' | 'FOLLOW_UP' | 'MEETING_BOOKED' | 'CLOSED' | 'REJECTED';

const STAGES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'FOLLOW_UP',
  'MEETING_BOOKED',
  'CLOSED',
  'REJECTED'
];

interface KanbanBoardProps {
  isAddOpen?: boolean;
  setIsAddOpen?: (open: boolean) => void;
}

export function KanbanBoard({ isAddOpen, setIsAddOpen }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<Record<LeadStatus, any[]>>({
    NEW: [],
    CONTACTED: [],
    FOLLOW_UP: [],
    MEETING_BOOKED: [],
    CLOSED: [],
    REJECTED: []
  });

  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads({ inPipeline: true, limit: 1000 }),
  });
  const leads = (leadsResponse?.leads ?? []).map((lead: any) => ({
    ...lead,
    id: lead._id || lead.id
  }));

  useEffect(() => {
    if (leads) {
      const newItems: any = {
        NEW: [],
        CONTACTED: [],
        FOLLOW_UP: [],
        MEETING_BOOKED: [],
        CLOSED: [],
        REJECTED: []
      };
      leads.forEach((lead: any) => {
        if (newItems[lead.status]) {
          newItems[lead.status].push(lead);
        }
      });
      setItems(newItems);
    }
  }, [leads]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: LeadStatus }) => updateLead(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: string) => {
    if (id in items) return id as LeadStatus;
    return Object.keys(items).find((key) => 
      items[key as LeadStatus].find((item) => item.id === id)
    ) as LeadStatus;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || active.id === overId) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(overId as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      const activeIndex = activeItems.findIndex((item) => item.id === active.id);
      const overIndex = overItems.findIndex((item) => item.id === overId);

      let newIndex;
      if (overId in prev) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowLastItem = over && overIndex === overItems.length - 1;
        const modifier = isBelowLastItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: [...prev[activeContainer].filter((item) => item.id !== active.id)],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          items[activeContainer][activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length)
        ]
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over?.id as string);

    if (!activeContainer || !overContainer || activeContainer !== overContainer) {
      if (overContainer) {
        updateMutation.mutate({ id: active.id as string, status: overContainer });
      }
      setActiveId(null);
      return;
    }

    const activeIndex = items[activeContainer].findIndex((item) => item.id === active.id);
    const overIndex = items[overContainer].findIndex((item) => item.id === over?.id);

    if (activeIndex !== overIndex) {
      setItems((prev) => ({
        ...prev,
        [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex)
      }));
    }

    setActiveId(null);
  };

  if (isLoading) return <div>Loading pipeline...</div>;

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)] overflow-x-auto pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {STAGES.map((id) => (
          <KanbanColumn key={id} id={id} title={id.replace('_', ' ')} items={items[id]} />
        ))}
        <DragOverlay>
          {activeId ? (
            <KanbanItem 
              id={activeId} 
              lead={leads.find((l: any) => l.id === activeId)} 
              isOverlay 
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isAddOpen !== undefined && setIsAddOpen && (
        <AddLeadsSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      )}
    </div>
  );
}

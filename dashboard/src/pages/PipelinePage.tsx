import React, { useState } from 'react';
import { KanbanBoard } from '../features/pipeline/KanbanBoard';
import { Layout, Filter, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';

export function PipelinePage() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <Layout className="text-primary" /> Sales Pipeline
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Drag and drop leads to manage your sales process.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl font-bold">
            <Filter size={16} /> Filter
          </Button>
          <Button 
            className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={16} /> Add Leads
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard isAddOpen={isAddOpen} setIsAddOpen={setIsAddOpen} />
      </div>
    </div>
  );
}

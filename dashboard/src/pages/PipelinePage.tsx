import React, { useState } from 'react';
import { KanbanBoard } from '../features/pipeline/KanbanBoard';
import { Layout, Filter, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useT } from '../lib/i18n';

export function PipelinePage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const t = useT();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Layout className="text-emerald-500" /> <span className="text-gradient-tw">{t('pipeline_title')}</span>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">{t('pp_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl font-bold border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm">
            <Filter size={16} /> {t('pp_filter_btn')}
          </Button>
          <Button
            className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold shadow-lg shadow-emerald-500/10"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={16} /> {t('pp_add_customer_btn')}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard isAddOpen={isAddOpen} setIsAddOpen={setIsAddOpen} />
      </div>
    </div>
  );
}

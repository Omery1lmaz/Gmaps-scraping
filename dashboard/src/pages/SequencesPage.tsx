import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSequences, getTemplates, deleteSequence, updateSequence, api } from '../lib/api';
import { useNavigate } from '../lib/router';
import { 
  Zap, 
  Plus, 
  ChevronRight, 
  Clock, 
  Play, 
  Pause,
  Trash2,
  Target,
  GitFork,
  ShieldCheck,
  Tag,
  MapPin,
  Globe,
  Phone,
  Layers,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useT } from '../lib/i18n';
import { PlanGuard } from '../components/PlanGuard';

function formatDelay(hours: number, t: any): string {
  if (hours === 0) return t('sp_immediately');
  if (hours < 24) return `${hours}${t('sp_hours')} ${t('sp_delay')}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) return `${days} ${t('sp_days')}`;
  return `${days}${t('sp_days')} ${remainingHours}${t('sp_hours')}`;
}

export function SequencesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const t = useT();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences'],
    queryFn: getSequences
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['wa-sessions'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/sessions');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteSequence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success(t('sp_delete_success'));
    },
    onError: () => toast.error(t('sp_delete_error'))
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => updateSequence(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      if (variables.data.isActive !== undefined) {
        toast.success(variables.data.isActive ? t('sp_activate_success') : t('sp_pause_success'));
      } else {
        toast.success(t('sp_update_success'));
      }
    },
    onError: () => toast.error(t('sp_update_error'))
  });

  // Calculate Global Analytics Metrics
  const totalSequences = sequences.length;
  const activeSequences = sequences.filter((s: any) => s.isActive).length;
  const autoEnrollSequences = sequences.filter((s: any) => s.autoEnrollEnabled).length;
  const totalEnrolled = sequences.reduce((sum: number, s: any) => sum + (s._count?.leadStates || s.states?.length || 0), 0);

  return (
    <PlanGuard minPlan="pro" featureName="WhatsApp Otomasyonu">
      <div className="space-y-8 animate-in fade-in duration-300">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Zap className="text-emerald-500 fill-emerald-500 animate-pulse size-8" /> {t('sp_studio_title')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-semibold">
            {t('sp_description')}
          </p>
        </div>
        <Button
          onClick={() => navigate('/sequences/create')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold gap-2 rounded-2xl shadow-lg shadow-amber-500/10 px-6 py-5 transition-all transform hover:scale-[1.02]"
        >
          <Plus size={20} className="stroke-[3]" /> {t('sp_new_sequence')}
        </Button>
      </div>

      {/* Global Analytics Hub */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('sp_total_automation'), value: totalSequences, icon: Layers, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: t('sp_active_campaigns'), value: activeSequences, icon: Sparkles, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: t('sp_auto_join'), value: autoEnrollSequences, icon: Zap, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 animate-pulse' },
          { label: t('sp_total_enrolled'), value: totalEnrolled, icon: Target, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' }
        ].map((stat, i) => (
          <Card key={i} className="flex items-center gap-4 p-5 bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 backdrop-blur-md shadow-lg hover:shadow-md transition-all duration-300 rounded-2xl">
            <div className={cn("size-12 rounded-2xl flex items-center justify-center border shrink-0", stat.color)}>
              <stat.icon size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
              <h3 className="text-2xl font-black text-foreground mt-2 leading-none">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Sequence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-4">
            <div className="size-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest animate-pulse">{t('sp_loading')}</p>
          </div>
        ) : sequences.length === 0 ? (
          <Card className="col-span-full py-20 text-center bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 backdrop-blur-md p-8 flex flex-col items-center justify-center rounded-2xl">
            <Zap className="size-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-black text-foreground text-lg uppercase tracking-wide">{t('sp_empty_title')}</h3>
            <p className="text-muted-foreground font-semibold text-xs mt-1">{t('sp_empty_subtitle')}</p>
          </Card>
        ) : sequences.map((seq: any) => (
          <Card key={seq._id} className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm shadow-lg hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col group relative">
            
            {/* Header Area */}
            <CardHeader className="pb-3 border-b border-border/40 relative px-5 pt-5">
              <div className="flex items-center justify-between mb-2">
                <Badge className={cn(
                  "border-none text-white font-black text-[9px] px-2.5 py-0.5 rounded-full tracking-wider shadow-lg",
                  seq.isActive ? "bg-emerald-500 shadow-emerald-100/50" : "bg-slate-400"
                )}>
                  {seq.isActive ? t('sp_active_status') : t('sp_inactive_status')}
                </Badge>
                
                {/* Sender Account Badge */}
                {seq.whatsappSessionId && (
                  <Badge className="bg-slate-800 text-slate-100 border-white/10 font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Smartphone size={8} /> {sessions.find((s: any) => s._id === seq.whatsappSessionId)?.sessionName || 'Bilinmeyen'}
                  </Badge>
                )}
                
                {/* Auto Enroll Status Badge */}
                {seq.autoEnrollEnabled && (
                  <Badge className="bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-none font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap size={8} className="fill-purple-600 dark:fill-purple-400 animate-pulse" /> {t('sp_auto_enroll_label')}
                  </Badge>
                )}
              </div>
              
              <CardTitle className="text-lg font-black text-foreground tracking-tight line-clamp-1">{seq.name}</CardTitle>
              
              {/* Dynamic Auto-Enroll Rules Display */}
              {seq.autoEnrollEnabled && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {seq.autoEnrollCategory && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/30">
                      <Tag size={8} /> {seq.autoEnrollCategory}
                    </span>
                  )}
                  {seq.autoEnrollCity && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/30">
                      <MapPin size={8} /> {seq.autoEnrollCity}
                    </span>
                  )}
                  {seq.autoEnrollMinRating > 0 && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/30">
                      ⭐ {seq.autoEnrollMinRating}+
                    </span>
                  )}
                  {seq.autoEnrollHasWebsite !== 'all' && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/30">
                      <Globe size={8} /> Web: {seq.autoEnrollHasWebsite === 'true' ? 'Var' : 'Yok'}
                    </span>
                  )}
                  {seq.autoEnrollHasPhone !== 'all' && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/30">
                      <Phone size={8} /> Tel: {seq.autoEnrollHasPhone === 'true' ? 'Var' : 'Yok'}
                    </span>
                  )}
                </div>
              )}
            </CardHeader>

            {/* Pipeline Steps Area */}
            <CardContent className="space-y-4 pt-4 flex-1 flex flex-col justify-between px-5 pb-5">
              
              {/* Timeline layout */}
              <div className="relative pl-6 space-y-4 my-2">
                {/* Timeline vertical line */}
                {seq.steps && seq.steps.length > 1 && (
                  <div className="absolute left-2 top-3 bottom-3 w-[1px] border-l border-dashed border-border" />
                )}
                
                {seq.steps?.map((step: any, idx: number) => {
                  const tpl = templates.find((t: any) => t._id === step.templateId);
                  return (
                    <div key={step._id || idx} className="relative flex flex-col gap-1 group/step">
                      {/* Timeline Bullet Point */}
                      <div className={cn(
                        "absolute -left-[22px] top-0.5 size-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg border transition-all duration-300",
                        seq.isActive 
                          ? "bg-amber-500 border-amber-500 text-white group-hover:scale-105" 
                          : "bg-muted border-border text-muted-foreground"
                      )}>
                        {idx + 1}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-foreground truncate flex-1 leading-tight">
                          {tpl ? tpl.name : t('sp_deleted_template')}
                        </p>

                        <div
                          className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-full border border-border/50 cursor-pointer hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 dark:hover:bg-amber-950/20 dark:hover:text-amber-400 transition-all shrink-0"
                          onClick={() => {
                            const newDelay = window.prompt(t('sp_delay_prompt'), step.delayHours.toString());
                            if (newDelay !== null && !isNaN(parseInt(newDelay))) {
                              const newSteps = [...seq.steps];
                              newSteps[idx].delayHours = parseInt(newDelay);
                              updateMutation.mutate({ id: seq._id, data: { steps: newSteps } });
                            }
                          }}
                          title={t('sp_delay_title')}
                        >
                          <Clock size={9} /> {formatDelay(step.delayHours, t)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4 pt-4 border-t border-border/40">
                {/* Anti-Spam Security Summary Badge Panel */}
                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-muted-foreground uppercase select-none">
                  <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-xl border border-border/30">
                    <Clock size={10} className="text-amber-500" />
                    <span>{seq.sendTimeStart || '09:00'} - {seq.sendTimeEnd || '18:00'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-xl border border-border/30">
                    <ShieldCheck size={10} className="text-emerald-500" />
                    <span>{seq.maxPerDay || 50} Limit/Gün</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">

                  {/* Status controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateMutation.mutate({ id: seq._id, data: { isActive: !seq.isActive } })}
                      className={cn(
                        "h-8 w-8 rounded-full border transition-all duration-300 shadow-lg cursor-pointer",
                        seq.isActive
                          ? "text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30"
                          : "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30"
                      )}
                      title={seq.isActive ? t('sp_stop_automation') : t('sp_start_automation')}
                    >
                      {seq.isActive ? <Pause size={13} className="stroke-[2.5]" /> : <Play size={13} className="fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400 stroke-[2.5]" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-border/50 hover:border-red-100 transition-all shadow-lg cursor-pointer"
                      onClick={() => {
                        if(window.confirm(t('sp_delete_confirm'))) {
                          deleteMutation.mutate(seq._id);
                        }
                      }}
                      title={t('sp_delete_sequence')}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  {/* Routing controls */}
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sequences/${seq._id}/edit`)}
                      className="h-8 text-[9px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl px-2 flex items-center gap-0.5 border border-border/50 hover:border-blue-150 transition-all cursor-pointer"
                    >
                      <GitFork size={10} className="stroke-[2.5]" /> {t('sp_design_flow')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sequences/${seq._id}`)}
                      className="h-8 text-[9px] font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl px-2 border border-border/50 hover:border-amber-150 transition-all flex items-center cursor-pointer"
                    >
                      {t('sp_people')} ({seq._count?.leadStates || 0}) <ChevronRight size={10} className="ml-0.5 stroke-[2.5]" />
                    </Button>
                  </div>
                </div>              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </PlanGuard>
  );
}

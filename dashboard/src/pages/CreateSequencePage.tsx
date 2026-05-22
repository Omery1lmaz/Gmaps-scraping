import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTemplates, createSequence } from '../lib/api';
import { useNavigate } from '../lib/router';
import { useT } from '../lib/i18n';
import {
  Zap,
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  ListTree,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export function CreateSequencePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const t = useT();
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([{ templateId: '', delayHours: 0 }]);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => createSequence(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success(t('cs_create_success'));
      navigate('/sequences');
    },
    onError: () => toast.error(t('cs_create_error'))
  });

  const addStep = () => setSteps([...steps, { templateId: '', delayHours: 24 }]);
  const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!name.trim()) return toast.error(t('cs_enter_name'));
    if (steps.some(s => !s.templateId)) return toast.error(t('cs_select_templates'));
    createMutation.mutate({ name, steps });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/sequences')}
          className="rounded-full bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 hover:bg-slate-100 dark:bg-zinc-900/60 text-slate-400 hover:text-slate-100 shadow-xl transition-all"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Plus className="text-emerald-400 size-7" />
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-amber-400 dark:via-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">
              {t('cs_title')}
            </span>
          </h2>
          <p className="text-zinc-450 mt-1 text-sm font-medium text-slate-400">{t('cs_subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Sequence Details & Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <ListTree size={18} className="text-emerald-400" /> {t('cs_general_info')}
            </h3>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('cs_sequence_name_label')}</label>
              <Input
                placeholder={t('cs_name_placeholder')}
                className="rounded-xl font-bold h-11 bg-white/80 dark:bg-zinc-950/50 border-slate-200/80 dark:border-zinc-800/60 text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20 focus-visible:ring-emerald-500/20"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Steps Editor */}
          <div className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Clock size={18} className="text-emerald-400" /> {t('cs_steps_label')}
              </h3>
              <Button
                onClick={addStep}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 font-bold text-xs rounded-xl h-9 px-4 transition-all hover:scale-[1.02] shadow-sm"
              >
                + {t('cs_add_step_btn')}
              </Button>
            </div>

            <div className="space-y-4 pt-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="relative p-5 bg-white/90 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/40 dark:border-zinc-800/30 flex flex-col gap-4 group hover:border-slate-300/50 dark:border-zinc-700/50 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                      {t('cs_step_badge')} {idx + 1}
                    </Badge>
                    {idx > 0 && (
                      <button
                        onClick={() => removeStep(idx)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg border border-transparent hover:border-red-500/25 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('cs_template_label')}</label>
                      <div className="relative">
                        <select
                          value={step.templateId}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '__create_new__') {
                              if (window.confirm(t('cs_confirm_new_template'))) {
                                navigate('/templates');
                              }
                              return;
                            }
                            setSteps(s => s.map((st, i) => i === idx ? { ...st, templateId: val } : st));
                          }}
                          className="w-full rounded-xl font-bold text-sm bg-white dark:bg-zinc-950 border border-white/5 h-10 px-3 pr-10 appearance-none focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100"
                        >
                          <option value="" className="font-bold text-xs text-zinc-550 bg-white dark:bg-zinc-950">{t('cs_select_template')}</option>
                          <option value="__create_new__" className="font-black text-xs text-emerald-400 bg-white dark:bg-zinc-950">+ {t('cs_create_template')}</option>
                          {templates.map((t: any) => (
                            <option key={t._id || t.id} value={t._id || t.id} className="font-bold text-xs bg-white dark:bg-zinc-950 text-slate-100">
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {templates.length === 0 && (
                        <p className="text-[10px] font-black text-red-400 mt-1">
                          ⚠️ {t('cs_template_warning')} <span className="underline cursor-pointer text-emerald-400 hover:text-emerald-350" onClick={() => navigate('/templates')}>{t('cs_create_now_link')}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('cs_delay_label')}</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          className="rounded-xl font-bold text-sm bg-white dark:bg-zinc-950 border-white/5 text-slate-100 h-10 pr-12 focus:border-emerald-500 focus:ring-emerald-500/20 focus-visible:ring-emerald-500/20"
                          value={step.delayHours}
                          onChange={e => setSteps(s => s.map((st, i) => i === idx ? { ...st, delayHours: parseInt(e.target.value) || 0 } : st))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 uppercase">{t('cs_hour_unit')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Info: Anti-Spam & Action */}
        <div className="space-y-6">
          <div className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl p-5 rounded-2xl space-y-3 relative overflow-hidden">
            {/* Emerald Pulse accent element */}
            <div className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <h4 className="font-black text-emerald-400 text-sm flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-400" /> {t('cs_security_label')}
            </h4>
            <p className="text-xs font-semibold text-slate-100 leading-relaxed">
              {t('cs_security_description')}
            </p>
          </div>

          <div className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl p-6 rounded-2xl space-y-4">
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {t('cs_save_info')}
            </p>
            <Button
              className="w-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600 hover:from-emerald-600 hover:to-emerald-750 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              onClick={handleSave}
              disabled={createMutation.isPending}
            >
              <Check size={18} /> {t('cs_save_btn')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

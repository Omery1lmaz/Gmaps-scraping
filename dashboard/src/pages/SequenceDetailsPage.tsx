import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getSequenceDetails, updateSequence, enrollLeadInSequence, getLeads, getCategories, getCities, updateSequenceState, deleteSequenceState, getTemplates } from '../lib/api';
import { useNavigate, useParams } from '../lib/router';
import {
  ArrowLeft, Clock, Target, UserPlus, Play, Pause, CheckCircle2, AlertCircle,
  MessageSquare, Settings, Calendar, Shield, Search, Filter, X, ChevronDown, Plus,
  MapPin, Tag, Globe, Phone, Star, Loader2, ShieldAlert, Trash2, RefreshCw, ExternalLink, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { safeFormatDate, cn } from '../lib/utils';
import { useUIStore } from '../lib/store';

const DAY_LABELS = ['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function SequenceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setSelectedLeadId, setDrawerOpen } = useUIStore();

  // Sheet state (same as pipeline AddLeadsSheet)
  const [isEnrollSheetOpen, setIsEnrollSheetOpen] = useState(false);
  const [sheetSearch, setSheetSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [hasWebsite, setHasWebsite] = useState('all');
  const [hasPhone, setHasPhone] = useState('all');
  const [minRating, setMinRating] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrollingAll, setEnrollingAll] = useState(false);

  // Settings state
  const [sendTimeStart, setSendTimeStart] = useState('09:00');
  const [sendTimeEnd, setSendTimeEnd] = useState('18:00');
  const [activeDays, setActiveDays] = useState<number[]>([1,2,3,4,5]);
  const [maxPerDay, setMaxPerDay] = useState(50);
  const [minDelayMinutes, setMinDelayMinutes] = useState(5);
  const [skipReplied, setSkipReplied] = useState(true);
  const [autoStopOnReply, setAutoStopOnReply] = useState(true);

  const { data: sequence, isLoading } = useQuery({
    queryKey: ['sequence', id],
    queryFn: () => getSequenceDetails(id as string),
    enabled: !!id
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  useEffect(() => {
    if (sequence) {
      setSendTimeStart(sequence.sendTimeStart || '09:00');
      setSendTimeEnd(sequence.sendTimeEnd || '18:00');
      setActiveDays(sequence.activeDays || [1,2,3,4,5]);
      setMaxPerDay(sequence.maxPerDay ?? 50);
      setMinDelayMinutes(sequence.minDelayMinutes ?? 5);
      setSkipReplied(sequence.skipReplied ?? true);
      setAutoStopOnReply(sequence.autoStopOnReply ?? true);
    }
  }, [sequence]);

  const { data: leadsResponse, isLoading: leadsLoading } = useQuery({
    queryKey: ['enrollLeads', sheetSearch, selectedCity, selectedCategory, hasWebsite, hasPhone, minRating],
    queryFn: () => getLeads({
      search: sheetSearch,
      city: selectedCity || undefined,
      category: selectedCategory || undefined,
      hasWebsite: hasWebsite !== 'all' ? hasWebsite : undefined,
      hasPhone: hasPhone !== 'all' ? hasPhone : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      limit: 150
    }),
    enabled: isEnrollSheetOpen
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories, enabled: isEnrollSheetOpen });
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: getCities, enabled: isEnrollSheetOpen });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateSequence(id as string, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sequence', id] }); toast.success('Ayarlar kaydedildi'); }
  });

  const updateStateMutation = useMutation({
    mutationFn: ({ stateId, status, ...additionalData }: { stateId: string; status: string; [key: string]: any }) => 
      updateSequenceState(stateId, status, additionalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      toast.success('İşlem başarılı');
    },
    onError: () => {
      toast.error('İşlem sırasında hata oluştu');
    }
  });

  const deleteStateMutation = useMutation({
    mutationFn: (stateId: string) => deleteSequenceState(stateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      toast.success('İşletme diziden başarıyla çıkarıldı');
    },
    onError: () => {
      toast.error('İşletme diziden çıkarılırken hata oluştu');
    }
  });

  const handleSaveSettings = () => {
    updateMutation.mutate({ sendTimeStart, sendTimeEnd, activeDays, maxPerDay, minDelayMinutes, skipReplied, autoStopOnReply });
  };

  const toggleDay = (day: number) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleEnrollSelected = async () => {
    if (selectedIds.size === 0) return toast.error('Lütfen en az bir işletme seçin');
    setEnrollingAll(true);
    let success = 0, fail = 0;
    for (const lid of Array.from(selectedIds)) {
      try { await enrollLeadInSequence(lid, id as string); success++; } catch { fail++; }
    }
    queryClient.invalidateQueries({ queryKey: ['sequence', id] });
    setSelectedIds(new Set());
    setEnrollingAll(false);
    toast.success(`${success} işletme eklendi${fail > 0 ? `, ${fail} hata` : ''}`);
  };

  const toggleSelectLead = (leadId: string, checked: boolean) => {
    const next = new Set(selectedIds);
    checked ? next.add(leadId) : next.delete(leadId);
    setSelectedIds(next);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = (leadsResponse?.leads || []).filter((l: any) => !enrolledLeadIds.has(l._id || l.id)).map((l: any) => l._id || l.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  if (isLoading) return <div className="py-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Yükleniyor...</div>;
  if (!sequence) return <div className="py-20 text-center font-black text-red-500 uppercase">Dizi Bulunamadı</div>;

  const states = sequence.states || [];
  const sheetLeads = leadsResponse?.leads || [];
  const enrolledLeadIds = new Set(states.map((s: any) => s.leadId?._id).filter(Boolean));
  const availableLeads = sheetLeads.filter((l: any) => !enrolledLeadIds.has(l._id || l.id));
  const isAllSelected = availableLeads.length > 0 && selectedIds.size === availableLeads.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sequences')} className="rounded-full hover:bg-white text-slate-400 hover:text-slate-800">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-800">{sequence.name}</h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Zamanlama, işletme yönetimi ve gelişmiş ayarlar.</p>
          </div>
        </div>
        <Button onClick={() => setIsEnrollSheetOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl shadow-lg shadow-blue-100">
          <UserPlus size={16} /> İşletme Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam', value: states.length, icon: Target, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Tamamlanan', value: states.filter((s: any) => s.status === 'COMPLETED').length, icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Bekleyen', value: states.filter((s: any) => s.status === 'PENDING').length, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Yanıt', value: states.filter((s: any) => s.status === 'REPLIED').length, icon: MessageSquare, bg: 'bg-purple-50', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={cn("size-12 rounded-2xl flex items-center justify-center", s.bg, s.color)}><s.icon size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">{s.label}</p>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Enrolled Leads Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800">Diziye Kayıtlı İşletmeler</h3>
              <Badge variant="outline" className="font-black text-[10px]">{states.length} kayıt</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-bold text-xs uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">İşletme</th>
                    <th className="px-6 py-4">Adım</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4">Sonraki</th>
                    <th className="px-6 py-4 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {states.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">Henüz işletme eklenmemiş.</td></tr>
                  ) : states.map((state: any) => {
                    const lead = state.leadId;
                    return (
                      <tr key={state._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 group">
                            <div 
                              onClick={() => {
                                if (lead?._id || lead?.id) {
                                  setSelectedLeadId(lead._id || lead.id);
                                  setDrawerOpen(true);
                                }
                              }}
                              className="font-bold text-slate-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            >
                              {lead?.businessName || lead?.name || '—'}
                            </div>
                            {lead && (
                              <button 
                                onClick={() => {
                                  setSelectedLeadId(lead._id || lead.id);
                                  setDrawerOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-0.5 rounded-md"
                                title="Profili Aç"
                              >
                                <ExternalLink size={12} />
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{lead?.phone || '—'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-[10px] font-black border-blue-200 text-blue-600 bg-blue-50">
                            {state.currentStepIndex + 1}/{sequence.steps.length}
                          </Badge>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={state.status} /></td>
                        <td className="px-6 py-4">
                          {state.status === 'COMPLETED' ? (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Seri Tamamlandı</span>
                          ) : state.status === 'FAILED' ? (
                            <span className="text-xs font-bold text-red-600">Hata Oluştu</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]" title={sequence.steps[state.currentStepIndex]?.templateId?.name || 'Bilinmeyen Şablon'}>
                                ✉️ {sequence.steps[state.currentStepIndex]?.templateId?.name || 'Mesaj Gönderilecek'}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock size={10} className="opacity-70" />
                                {state.status === 'IN_PROGRESS' || state.status === 'PROCESSING' ? (
                                  <span className="text-blue-600 animate-pulse font-bold">Şu An Gönderiliyor...</span>
                                ) : state.nextRunAt ? (
                                  <span>{safeFormatDate(state.nextRunAt, 'dd MMM HH:mm')}</span>
                                ) : (
                                  <span className="text-amber-600 font-bold">Hemen İşleme Alınacak</span>
                                )}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pause/Resume Toggle */}
                            {state.status === 'PAUSED' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStateMutation.mutate({ stateId: state._id, status: 'PENDING' })}
                                disabled={updateStateMutation.isPending}
                                className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border border-emerald-100/50 shadow-3xs"
                                title="Sürdür"
                              >
                                <Play size={13} className="fill-emerald-600 text-emerald-600" />
                              </Button>
                            ) : (state.status === 'PENDING' || state.status === 'IN_PROGRESS' || state.status === 'ACTIVE') ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateStateMutation.mutate({ stateId: state._id, status: 'PENDING', nextRunAt: new Date().toISOString(), isForced: true })}
                                  disabled={updateStateMutation.isPending}
                                  className="h-8 w-8 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 border border-blue-100/50 shadow-3xs"
                                  title="Hemen Gönder (Beklemeyi Atla)"
                                >
                                  <Zap size={13} className="fill-blue-600 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateStateMutation.mutate({ stateId: state._id, status: 'PAUSED' })}
                                  disabled={updateStateMutation.isPending}
                                  className="h-8 w-8 rounded-xl text-amber-600 hover:bg-amber-50 hover:text-amber-700 border border-amber-100/50 shadow-3xs"
                                  title="Duraklat"
                                >
                                  <Pause size={13} className="fill-amber-600 text-amber-600" />
                                </Button>
                              </>
                            ) : null}

                            {/* Restart/Retry Option */}
                            {(state.status === 'COMPLETED' || state.status === 'FAILED' || state.status === 'REPLIED' || state.status === 'PAUSED') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStateMutation.mutate({ 
                                  stateId: state._id, 
                                  status: 'PENDING',
                                  currentStepIndex: 0
                                })}
                                disabled={updateStateMutation.isPending}
                                className="h-8 w-8 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 border border-blue-100/50 shadow-3xs"
                                title="Yeniden Başlat (Adım 1'den)"
                              >
                                <RefreshCw size={13} />
                              </Button>
                            )}

                            {/* Delete State Option */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm(`${lead?.businessName || 'Bu işletmeyi'} otomasyon dizisinden tamamen çıkarmak istediğinize emin misiniz?`)) {
                                  deleteStateMutation.mutate(state._id);
                                }
                              }}
                              disabled={deleteStateMutation.isPending}
                              className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 border border-red-100/50 shadow-3xs"
                              title="Diziden Çıkar (Sil)"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="space-y-6">
          {/* Schedule Settings */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-amber-500" /> Zamanlama
              </h3>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gönderim Saatleri</label>
              <div className="flex items-center gap-2">
                <Input type="time" value={sendTimeStart} onChange={e => setSendTimeStart(e.target.value)}
                  className="rounded-xl font-bold text-sm h-10 bg-slate-50 border-slate-200 text-center" />
                <span className="text-xs font-black text-slate-400">—</span>
                <Input type="time" value={sendTimeEnd} onChange={e => setSendTimeEnd(e.target.value)}
                  className="rounded-xl font-bold text-sm h-10 bg-slate-50 border-slate-200 text-center" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aktif Günler</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, idx) => (
                  <button key={idx} onClick={() => toggleDay(idx)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                      activeDays.includes(idx)
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Steps Editor */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
              <Zap size={16} className="text-blue-500" /> Otomasyon Adımları
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mb-2">
              Dizi adımlarını anında değiştirin. Yapılan değişiklikler sıradaki mesajlara hemen etki eder.
            </p>
            <div className="space-y-3">
              {(sequence.steps || []).map((step: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-slate-200 text-slate-700 font-black text-[9px] border-none px-2 rounded-md">ADIM {idx + 1}</Badge>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Clock size={10} />
                      <Input 
                        type="number" 
                        min="0"
                        className="h-6 w-12 text-center text-[10px] font-bold p-0 bg-white border-slate-200 rounded-md"
                        value={step.delayHours}
                        onChange={(e) => {
                          const newSteps = [...sequence.steps];
                          newSteps[idx].delayHours = parseInt(e.target.value) || 0;
                          updateMutation.mutate({ steps: newSteps });
                        }}
                      />
                      s
                    </div>
                  </div>
                  <select 
                    value={step.templateId?._id || step.templateId?.id || step.templateId} 
                    onChange={e => {
                      const val = e.target.value;
                      const newSteps = [...sequence.steps].map(s => ({...s, templateId: s.templateId?._id || s.templateId?.id || s.templateId}));
                      newSteps[idx].templateId = val;
                      updateMutation.mutate({ steps: newSteps });
                    }}
                    className="w-full rounded-lg font-bold text-[11px] bg-white border border-slate-200 h-8 px-2 focus:outline-none focus:border-amber-500 text-slate-700"
                  >
                    <option value="" disabled>Şablon Seçin</option>
                    {templates.map((t: any) => (
                      <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
              <Settings size={16} className="text-blue-500" /> Gelişmiş Ayarlar
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Günlük Maks. Mesaj</label>
              <Input type="number" min={1} max={200} value={maxPerDay} onChange={e => setMaxPerDay(Number(e.target.value))}
                className="rounded-xl font-bold text-sm h-10 bg-slate-50 border-slate-200" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mesajlar Arası Min. Bekleme (dk)</label>
              <Input type="number" min={1} max={60} value={minDelayMinutes} onChange={e => setMinDelayMinutes(Number(e.target.value))}
                className="rounded-xl font-bold text-sm h-10 bg-slate-50 border-slate-200" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-black text-slate-700">Yanıt Vereni Atla</p>
                  <p className="text-[10px] text-slate-400 font-medium">Zaten yanıt vermiş işletmelere mesaj gönderme</p>
                </div>
                <button onClick={() => setSkipReplied(!skipReplied)}
                  className={cn("w-10 h-6 rounded-full transition-colors relative", skipReplied ? "bg-amber-500" : "bg-slate-200")}>
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", skipReplied ? "translate-x-4.5" : "translate-x-0.5")} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-black text-slate-700">Yanıtta Oto-Durdur</p>
                  <p className="text-[10px] text-slate-400 font-medium">İşletme yanıt verince diziyi otomatik durdur</p>
                </div>
                <button onClick={() => setAutoStopOnReply(!autoStopOnReply)}
                  className={cn("w-10 h-6 rounded-full transition-colors relative", autoStopOnReply ? "bg-amber-500" : "bg-slate-200")}>
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", autoStopOnReply ? "translate-x-4.5" : "translate-x-0.5")} />
                </button>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={updateMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-amber-100">
              {updateMutation.isPending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </Button>
          </div>

          {/* Anti-spam info */}
          <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-100 space-y-2">
            <h4 className="font-black text-emerald-800 text-xs flex items-center gap-2"><Shield size={14} className="text-emerald-500" /> Spam Koruması</h4>
            <p className="text-[10px] font-semibold text-emerald-700 leading-relaxed">
              Mesajlar yalnızca belirlediğiniz saat aralığı ve günlerde gönderilir. Günlük limit ve bekleme süresi WhatsApp ban riskini minimize eder.
            </p>
          </div>
        </div>
      </div>

      {/* Enrollment Sheet */}
      <Sheet open={isEnrollSheetOpen} onOpenChange={setIsEnrollSheetOpen}>
        <SheetContent side="right" className="sm:!max-w-2xl flex flex-col h-full bg-white p-0 border-l border-slate-100 shadow-2xl">
          <SheetHeader className="border-b border-slate-100 p-6 pb-4 bg-slate-50/50">
            <SheetTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="text-blue-600 size-5" /> Diziye İşletme Ekle
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              İletişim kanalları, puanları, şehirleri ve kategorileri filtreleyerek otomasyon dizinize topluca ekleyin.
            </p>
          </SheetHeader>

          {/* Dynamic Filters Grid (Matches Pipeline) */}
          <div className="p-6 pb-4 space-y-4 shrink-0 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metin Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <Input
                    placeholder="İsim veya anahtar kelime..."
                    value={sheetSearch}
                    onChange={(e) => setSheetSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-slate-200 text-xs font-medium shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="size-3.5 text-slate-400" /> Min. Puan (Rating)
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer shadow-xs"
                >
                  <option value="">Tüm Puanlar</option>
                  <option value="3.0">3.0+ Yıldız</option>
                  <option value="4.0">4.0+ Yıldız</option>
                  <option value="4.5">4.5+ Yıldız</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-400" /> Şehir
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer shadow-xs"
                >
                  <option value="">Tüm Şehirler</option>
                  {cities.map((city: string) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="size-3.5 text-slate-400" /> Kategori
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer shadow-xs"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="size-3.5 text-slate-400" /> Web Sitesi Durumu
                </label>
                <select
                  value={hasWebsite}
                  onChange={(e) => setHasWebsite(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer shadow-xs"
                >
                  <option value="all">Farketmez (Hepsi)</option>
                  <option value="true">Sadece Web Sitesi Olanlar</option>
                  <option value="false">Sadece Web Sitesi Olmayanlar</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="size-3.5 text-slate-400" /> Telefon Durumu
                </label>
                <select
                  value={hasPhone}
                  onChange={(e) => setHasPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer shadow-xs"
                >
                  <option value="all">Farketmez (Hepsi)</option>
                  <option value="true">Sadece Telefonu Olanlar</option>
                  <option value="false">Sadece Telefonu Olmayanlar</option>
                </select>
              </div>
            </div>

            {/* Select all header */}
            {availableLeads.length > 0 && (
              <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2.5 rounded-xl border border-slate-100/80">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  />
                  <span className="text-xs font-bold text-slate-600">Hepsini Seç ({availableLeads.length})</span>
                </div>
                {selectedIds.size > 0 && (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {selectedIds.size} Seçili
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Leads Scroll Area */}
          <div className="flex-1 min-h-0 px-6 py-4">
            {leadsLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <Loader2 className="animate-spin size-6 text-blue-600" />
                <span className="text-xs font-semibold">Uyumlu kişiler yükleniyor...</span>
              </div>
            ) : sheetLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 text-center px-4">
                <div className="bg-slate-50 p-4 rounded-full">
                  <ShieldAlert className="size-8 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Kayıt Bulunamadı</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[320px]">
                    Filtrelere uygun kişi bulunamadı. Kriterlerinizi değiştirmeyi deneyebilirsiniz.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full pr-3 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
                <div className="divide-y divide-slate-100 p-2 space-y-1">
                  {sheetLeads.map((lead: any) => {
                    const lid = lead._id || lead.id;
                    const alreadyEnrolled = enrolledLeadIds.has(lid);
                    const isSelected = selectedIds.has(lid);
                    return (
                      <div
                        key={lid}
                        onClick={() => !alreadyEnrolled && toggleSelectLead(lid, !isSelected)}
                        className={cn(
                          "flex items-start gap-4 p-3.5 rounded-xl border border-transparent transition-all",
                          alreadyEnrolled ? "bg-slate-50/60 opacity-60 cursor-not-allowed" : "hover:bg-white hover:shadow-md hover:border-slate-200/50 cursor-pointer"
                        )}
                      >
                        <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {alreadyEnrolled ? (
                            <div className="size-4 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                              <CheckCircle2 className="size-3 text-emerald-600" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleSelectLead(lid, !!checked)}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800 truncate leading-snug">
                              {lead.businessName || lead.name}
                            </p>
                            {alreadyEnrolled && (
                              <Badge className="text-[8px] font-black bg-emerald-100 text-emerald-700 border-none shrink-0">
                                Eklendi
                              </Badge>
                            )}
                          </div>

                          {lead.address && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate font-medium">{lead.address}</p>
                          )}

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {lead.category && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Tag className="size-2.5 text-slate-400" /> {lead.category}
                              </span>
                            )}
                            {lead.city && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-100/30">
                                <MapPin className="size-2.5 text-blue-400" /> {lead.city}
                              </span>
                            )}
                            {lead.rating && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/30">
                                ⭐ {lead.rating} ({lead.reviews || lead.reviewCount || 0})
                              </span>
                            )}
                            {lead.phone && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100/30">
                                <Phone className="size-2.5 text-emerald-400" /> {lead.phone}
                              </span>
                            )}
                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-100/30 hover:bg-indigo-200 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="size-2.5 text-indigo-400" /> Web Sitesi ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <SheetFooter className="border-t border-slate-100 p-6 shrink-0 bg-slate-50/50">
            <Button
              onClick={handleEnrollSelected}
              disabled={selectedIds.size === 0 || enrollingAll}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
            >
              {enrollingAll ? (
                <>
                  <Loader2 className="animate-spin size-4" />
                  Diziye Ekleniyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  {selectedIds.size} Kişiyi Diziye Ekle
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, any> = {
    PENDING: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Bekliyor', icon: Clock },
    IN_PROGRESS: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'İşleniyor', icon: Play },
    PAUSED: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Durduruldu', icon: Pause },
    COMPLETED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Tamamlandı', icon: CheckCircle2 },
    FAILED: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Hata', icon: AlertCircle },
    REPLIED: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Yanıt Verildi', icon: MessageSquare },
  };
  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border", config.color)}>
      <Icon size={10} /> {config.label}
    </span>
  );
}

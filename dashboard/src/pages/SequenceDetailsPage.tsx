import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  getSequenceDetails,
  updateSequence,
  enrollLeadInSequence,
  getLeads,
  getCategories,
  getCities,
  updateSequenceState,
  deleteSequenceState,
  getTemplates,
  pauseSequence,
  resumeSequence,
  restartSequence,
  clearSequence
} from '../lib/api';
import { useNavigate, useParams } from '../lib/router';
import {
  ArrowLeft, Clock, Target, UserPlus, Play, Pause, CheckCircle2, AlertCircle,
  MessageSquare, Settings, Calendar, Shield, Search, Filter, X, ChevronDown, Plus,
  MapPin, Tag, Globe, Phone, Star, Loader2, ShieldAlert, Trash2, RefreshCw, ExternalLink, Zap, Edit2, Check
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

// Shadcn UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const DAY_LABELS = ['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function SequenceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setSelectedLeadId, setDrawerOpen } = useUIStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState('leads');

  // Inline Rename State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

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
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);
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
      setActiveDays(sequence.activeDays || [1, 2, 3, 4, 5]);
      setMaxPerDay(sequence.maxPerDay ?? 50);
      setMinDelayMinutes(sequence.minDelayMinutes ?? 5);
      setSkipReplied(sequence.skipReplied ?? true);
      setAutoStopOnReply(sequence.autoStopOnReply ?? true);
      setNewName(sequence.name || '');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      toast.success('Değişiklikler kaydedildi');
    },
    onError: (err: any) => {
      toast.error('Güncelleme sırasında hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  });

  const updateStateMutation = useMutation({
    mutationFn: ({ stateId, status, ...additionalData }: { stateId: string; status: string;[key: string]: any }) =>
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

  // Global Action Mutations
  const pauseSeqMutation = useMutation({
    mutationFn: () => pauseSequence(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      toast.success('Dizi duraklatıldı');
    },
    onError: (err: any) => {
      toast.error('Dizi duraklatılırken hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  });

  const resumeSeqMutation = useMutation({
    mutationFn: () => resumeSequence(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      toast.success('Dizi sürdürüldü');
    },
    onError: (err: any) => {
      toast.error('Dizi sürdürülürken hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  });

  const restartSeqMutation = useMutation({
    mutationFn: () => restartSequence(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      toast.success('Dizi yeniden başlatıldı');
    },
    onError: (err: any) => {
      toast.error('Dizi yeniden başlatılırken hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  });

  const clearSeqMutation = useMutation({
    mutationFn: () => clearSequence(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      setSelectedIds(new Set());
      toast.success('Tüm kayıtlar diziden temizlendi');
    },
    onError: (err: any) => {
      toast.error('Kayıtlar temizlenirken hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  });

  const handleSaveName = () => {
    if (!newName.trim()) {
      toast.error('Dizi adı boş olamaz');
      setNewName(sequence?.name || '');
      setIsEditingName(false);
      return;
    }
    if (newName.trim() === sequence?.name) {
      setIsEditingName(false);
      return;
    }
    updateMutation.mutate(
      { name: newName.trim() },
      {
        onSuccess: () => {
          setIsEditingName(false);
        }
      }
    );
  };

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
      try {
        await enrollLeadInSequence(lid, id as string);
        success++;
      } catch {
        fail++;
      }
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0c1220]/50 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-white/15 shadow-xl">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/sequences')}
            className="rounded-full bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 hover:bg-slate-100 dark:bg-zinc-900/60 text-slate-400 hover:text-slate-100 shadow-xl transition-all"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2 max-w-md">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                  className="font-black text-2xl tracking-tight text-white h-10 py-1 bg-white/80 dark:bg-zinc-950/50 border-white/5 focus:border-emerald-500 focus:ring-emerald-500/20 focus-visible:ring-emerald-500/20"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName} className="text-emerald-400 hover:bg-emerald-500/10">
                  <Check size={18} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                <h2 className="text-3xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-amber-400 dark:via-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">
                    {sequence.name}
                  </span>
                </h2>
                <Edit2 size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <p className="text-slate-400 mt-1 text-sm font-medium">Zamanlama, işletme yönetimi ve gelişmiş ayarlar.</p>
          </div>
        </div>

        {/* Global Control Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Dizideki tüm işletmeleri duraklatmak istediğinize emin misiniz?')) {
                pauseSeqMutation.mutate();
              }
            }}
            disabled={pauseSeqMutation.isPending}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 font-bold gap-1.5 rounded-xl h-10 px-3.5 transition-all hover:scale-[1.02]"
          >
            <Pause size={14} className="fill-amber-400 text-amber-400" /> Durdur
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => resumeSeqMutation.mutate()}
            disabled={resumeSeqMutation.isPending}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 font-bold gap-1.5 rounded-xl h-10 px-3.5 transition-all hover:scale-[1.02]"
          >
            <Play size={14} className="fill-emerald-400 text-emerald-400" /> Sürdür
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Dizideki tüm işletmeleri ilk adımdan itibaren sıfırlayıp yeniden başlatmak istediğinize emin misiniz?')) {
                restartSeqMutation.mutate();
              }
            }}
            disabled={restartSeqMutation.isPending}
            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 font-bold gap-1.5 rounded-xl h-10 px-3.5 transition-all hover:scale-[1.02]"
          >
            <RefreshCw size={14} /> Yeniden Başlat
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Dizideki tüm işletme kayıtlarını tamamen temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                clearSeqMutation.mutate();
              }
            }}
            disabled={clearSeqMutation.isPending}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold gap-1.5 rounded-xl h-10 px-3.5 transition-all hover:scale-[1.02]"
          >
            <Trash2 size={14} /> Temizle
          </Button>

          <Button
            onClick={() => setIsEnrollSheetOpen(true)}
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold gap-2 rounded-xl h-10 px-4 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <UserPlus size={16} /> İşletme Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam', value: states.length, icon: Target, bg: 'bg-blue-500/10 border border-blue-500/20', color: 'text-blue-400' },
          { label: 'Tamamlanan', value: states.filter((s: any) => s.status === 'COMPLETED').length, icon: CheckCircle2, bg: 'bg-emerald-500/10 border border-emerald-500/20', color: 'text-emerald-400' },
          { label: 'Bekleyen', value: states.filter((s: any) => s.status === 'PENDING').length, icon: Clock, bg: 'bg-amber-500/10 border border-amber-500/20', color: 'text-amber-400' },
          { label: 'Yanıt', value: states.filter((s: any) => s.status === 'REPLIED').length, icon: MessageSquare, bg: 'bg-purple-500/10 border border-purple-500/20', color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#0c1220]/50 backdrop-blur-sm p-5 rounded-2xl border border-white/5 hover:border-white/15 shadow-xl flex items-center gap-4">
            <div className={cn("size-12 rounded-2xl flex items-center justify-center border", s.bg, s.color)}><s.icon size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">{s.label}</p>
              <p className="text-2xl font-black text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6 flex flex-col">
        <TabsList className="bg-white/90 dark:bg-zinc-950/60 p-1 rounded-2xl w-fit flex gap-1 border border-white/5/65 backdrop-blur-md shadow-inner">
          <TabsTrigger
            value="leads"
            className="rounded-xl px-5 py-2.5 text-xs font-bold transition-all data-[state=active]:bg-slate-100/80 dark:bg-zinc-900/80 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/5 hover:border-white/15 text-slate-400 flex items-center hover:text-slate-100"
          >
            <Target size={14} className="mr-1.5 text-emerald-400" /> İşletmeler ({states.length})
          </TabsTrigger>
          <TabsTrigger
            value="steps"
            className="rounded-xl px-5 py-2.5 text-xs font-bold transition-all data-[state=active]:bg-slate-100/80 dark:bg-zinc-900/80 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/5 hover:border-white/15 text-slate-400 flex items-center hover:text-slate-100"
          >
            <Zap size={14} className="mr-1.5 text-amber-400" /> Akış Adımları ({sequence.steps?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-xl px-5 py-2.5 text-xs font-bold transition-all data-[state=active]:bg-slate-100/80 dark:bg-zinc-900/80 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/5 hover:border-white/15 text-slate-400 flex items-center hover:text-slate-100"
          >
            <Settings size={14} className="mr-1.5 text-indigo-400" /> Ayarlar & Genel Kontroller
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Leads list */}
        <TabsContent value="leads" className="focus-visible:outline-none">
          <Card className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/30 px-6 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-white">Diziye Kayıtlı İşletmeler</CardTitle>
                <CardDescription className="text-xs text-slate-400">Bu otomasyon dizisi tarafından mesaj gönderilen veya sırada bekleyen işletmeler.</CardDescription>
              </div>
              <Badge variant="outline" className="font-black text-[10px] bg-white dark:bg-zinc-950 border-white/5 text-slate-100">{states.length} kayıt</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white dark:bg-zinc-950/20">
                  <TableRow className="border-b border-white/5 hover:border-white/15">
                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">İşletme</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Adım</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Durum</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sonraki İşlem</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksiyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-200/50 dark:divide-zinc-800/40">
                  {states.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold">
                        Henüz işletme eklenmemiş. Sağ üstteki "İşletme Ekle" butonunu kullanarak ekleyebilirsiniz.
                      </TableCell>
                    </TableRow>
                  ) : (
                    states.map((state: any) => {
                      const lead = state.leadId;
                      return (
                        <TableRow key={state._id} className="hover:bg-slate-50/50 dark:bg-zinc-900/30 transition-colors border-b border-slate-200/40 dark:border-zinc-800/30">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-1.5 group">
                              <div
                                onClick={() => {
                                  if (lead?._id || lead?.id) {
                                    setSelectedLeadId(lead._id || lead.id);
                                    setDrawerOpen(true);
                                  }
                                }}
                                className="font-bold text-slate-100 hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
                              >
                                {lead?.businessName || lead?.name || '—'}
                              </div>
                              {lead && (
                                <button
                                  onClick={() => {
                                    setSelectedLeadId(lead._id || lead.id);
                                    setDrawerOpen(true);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 transition-all p-0.5 rounded-md"
                                  title="Profili Aç"
                                >
                                  <ExternalLink size={12} />
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{lead?.phone || '—'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className="text-[10px] font-black border-emerald-500/25 text-emerald-400 bg-emerald-500/10">
                              {state.currentStepIndex + 1}/{sequence.steps.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <StatusBadge status={state.status} />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {state.status === 'COMPLETED' ? (
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded-md border border-emerald-900/40">Seri Tamamlandı</span>
                            ) : state.status === 'FAILED' ? (
                              <span className="text-xs font-bold text-red-400">Hata Oluştu</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold text-slate-100 truncate max-w-[150px]" title={sequence.steps[state.currentStepIndex]?.templateId?.name || 'Bilinmeyen Şablon'}>
                                  ✉️ {sequence.steps[state.currentStepIndex]?.templateId?.name || 'Mesaj Gönderilecek'}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} className="opacity-70 text-slate-400" />
                                  {state.status === 'IN_PROGRESS' || state.status === 'PROCESSING' ? (
                                    <span className="text-emerald-400 animate-pulse font-bold">Şu An Gönderiliyor...</span>
                                  ) : state.nextRunAt ? (
                                    <span>{safeFormatDate(state.nextRunAt, 'dd MMM HH:mm')}</span>
                                  ) : (
                                    <span className="text-amber-400 font-bold">Hemen İşleme Alınacak</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Pause/Resume Toggle */}
                              {state.status === 'PAUSED' ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateStateMutation.mutate({ stateId: state._id, status: 'PENDING' })}
                                  disabled={updateStateMutation.isPending}
                                  className="h-8 w-8 rounded-xl text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 shadow-sm transition-all hover:scale-105"
                                  title="Sürdür"
                                >
                                  <Play size={13} className="fill-emerald-400 text-emerald-400" />
                                </Button>
                              ) : (state.status === 'PENDING' || state.status === 'IN_PROGRESS' || state.status === 'ACTIVE') ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateStateMutation.mutate({ stateId: state._id, status: 'PENDING', nextRunAt: new Date().toISOString(), isForced: true })}
                                    disabled={updateStateMutation.isPending}
                                    className="h-8 w-8 rounded-xl text-blue-400 hover:bg-blue-500/15 border border-blue-500/20 shadow-sm transition-all hover:scale-105"
                                    title="Hemen Gönder (Beklemeyi Atla)"
                                  >
                                    <Zap size={13} className="fill-blue-400 text-blue-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateStateMutation.mutate({ stateId: state._id, status: 'PAUSED' })}
                                    disabled={updateStateMutation.isPending}
                                    className="h-8 w-8 rounded-xl text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 shadow-sm transition-all hover:scale-105"
                                    title="Duraklat"
                                  >
                                    <Pause size={13} className="fill-amber-400 text-amber-400" />
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
                                  className="h-8 w-8 rounded-xl text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 shadow-sm transition-all hover:scale-105"
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
                                className="h-8 w-8 rounded-xl text-red-400 hover:bg-red-500/15 border border-red-500/20 shadow-sm transition-all hover:scale-105"
                                title="Diziden Çıkar (Sil)"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Automation sequence steps list */}
        <TabsContent value="steps" className="focus-visible:outline-none">
          <Card className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/30 px-6 py-4">
              <CardTitle className="text-sm font-black text-white flex items-center gap-2">
                <Zap size={16} className="text-emerald-400" /> Otomasyon Adımları
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Dizi adımlarını buradan hızlıca düzenleyin. Yapılan değişiklikler sıradaki mesaj gönderimlerine hemen etki eder.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {(sequence.steps || []).map((step: any, idx: number) => {
                const currentVal = step.templateId?._id || step.templateId?.id || step.templateId || "";
                return (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white/80 dark:bg-zinc-950/50 border border-white/5 hover:border-white/15 rounded-2xl relative shadow-md">
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="size-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100">Adım {idx + 1}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">Gönderim Parametreleri</p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Template Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kullanılacak Şablon</label>
                        <Select
                          value={currentVal}
                          onValueChange={(val) => {
                            const newSteps = [...sequence.steps].map(s => ({
                              ...s,
                              templateId: s.templateId?._id || s.templateId?.id || s.templateId
                            }));
                            newSteps[idx].templateId = val;
                            updateMutation.mutate({ steps: newSteps });
                          }}
                        >
                          <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border border-white/5 text-xs font-semibold text-slate-100 focus:ring-emerald-500/20 focus:border-emerald-500">
                            <SelectValue placeholder="Şablon Seçin" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-950 border border-white/5 text-slate-100">
                            <SelectItem value="" disabled>Şablon Seçin</SelectItem>
                            {templates.map((t: any) => (
                              <SelectItem key={t._id || t.id} value={t._id || t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Delay hours input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock size={11} /> Bekleme Süresi (Saat)
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            className="h-10 text-center font-bold text-sm bg-white dark:bg-zinc-950 border border-white/5 text-slate-100 rounded-xl focus-visible:ring-emerald-500/20 focus:border-emerald-500"
                            value={step.delayHours}
                            onChange={(e) => {
                              const newSteps = [...sequence.steps];
                              newSteps[idx].delayHours = parseInt(e.target.value) || 0;
                              updateMutation.mutate({ steps: newSteps });
                            }}
                          />
                          <span className="text-xs font-bold text-slate-400">Saat sonra gönder</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Settings & Controls */}
        <TabsContent value="settings" className="focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Configuration Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Zamanlama Ayarları */}
              <Card className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/30 px-6 py-4 flex flex-row items-center gap-2">
                  <Calendar size={16} className="text-emerald-400" />
                  <div>
                    <CardTitle className="text-sm font-black text-white">Gönderim Zamanlaması</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Mesajların hangi saatler arasında ve hangi günlerde gönderileceğini belirleyin.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gönderim Saat Aralığı</label>
                    <div className="flex items-center gap-2 max-w-sm">
                      <Input
                        type="time"
                        value={sendTimeStart}
                        onChange={e => setSendTimeStart(e.target.value)}
                        className="rounded-xl font-bold text-sm h-10 bg-white dark:bg-zinc-950 border border-white/5 text-slate-100 text-center focus-visible:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <span className="text-xs font-black text-slate-500">—</span>
                      <Input
                        type="time"
                        value={sendTimeEnd}
                        onChange={e => setSendTimeEnd(e.target.value)}
                        className="rounded-xl font-bold text-sm h-10 bg-white dark:bg-zinc-950 border border-white/5 text-slate-100 text-center focus-visible:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aktif Günler</label>
                    <div className="flex gap-1.5 max-w-md">
                      {DAY_LABELS.map((label, idx) => (
                        <button
                          key={idx}
                          onClick={() => toggleDay(idx)}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border",
                            activeDays.includes(idx)
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/10 hover:scale-[1.02]"
                              : "bg-white/80 dark:bg-zinc-950/50 text-slate-500 border-slate-200/60 dark:border-zinc-800/50 hover:border-slate-300/50 dark:border-zinc-700/50 text-slate-400"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hız Limitleri & Anti-Ban */}
              <Card className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/30 px-6 py-4 flex flex-row items-center gap-2">
                  <Shield size={16} className="text-emerald-400" />
                  <div>
                    <CardTitle className="text-sm font-black text-white">Hız Limitleri & Anti-Ban</CardTitle>
                    <CardDescription className="text-xs text-slate-400">WhatsApp hesabınızın banlanma riskini azaltmak için hız limitlerini yapılandırın.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Günlük Maks. Mesaj</label>
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        value={maxPerDay}
                        onChange={e => setMaxPerDay(Number(e.target.value))}
                        className="rounded-xl font-bold text-sm h-10 bg-white dark:bg-zinc-950 border border-white/5 text-slate-100 focus-visible:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mesajlar Arası Min. Bekleme (Dk)</label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={minDelayMinutes}
                        onChange={e => setMinDelayMinutes(Number(e.target.value))}
                        className="rounded-xl font-bold text-sm h-10 bg-white dark:bg-zinc-950 border border-white/5 text-slate-100 focus-visible:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Davranış Ayarları */}
              <Card className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/30 px-6 py-4 flex flex-row items-center gap-2">
                  <Settings size={16} className="text-emerald-400" />
                  <div>
                    <CardTitle className="text-sm font-black text-white">Gelişmiş Davranışlar</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Yanıt veren kişilere karşı alınacak aksiyonları yönetin.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-zinc-950/50 rounded-2xl border border-white/5 hover:border-white/15">
                    <div>
                      <p className="text-xs font-black text-slate-100">Yanıt Vereni Atla</p>
                      <p className="text-[10px] text-slate-400 font-medium">Zaten yanıt vermiş işletmelere yeni mesaj gönderme</p>
                    </div>
                    <button
                      onClick={() => setSkipReplied(!skipReplied)}
                      className={cn("w-10 h-6 rounded-full transition-colors relative", skipReplied ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-zinc-800")}
                    >
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", skipReplied ? "translate-x-4.5" : "translate-x-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-zinc-950/50 rounded-2xl border border-white/5 hover:border-white/15">
                    <div>
                      <p className="text-xs font-black text-slate-100">Yanıtta Otomatik Durdur</p>
                      <p className="text-[10px] text-slate-400 font-medium">İşletme yanıt verince bu işletmenin otomasyon dizisini otomatik durdur</p>
                    </div>
                    <button
                      onClick={() => setAutoStopOnReply(!autoStopOnReply)}
                      className={cn("w-10 h-6 rounded-full transition-colors relative", autoStopOnReply ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-zinc-800")}
                    >
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", autoStopOnReply ? "translate-x-4.5" : "translate-x-0.5")} />
                    </button>
                  </div>
                </CardContent>
                <CardFooter className="bg-white dark:bg-zinc-950/30 p-4 border-t border-white/5 hover:border-white/15 flex justify-end">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={updateMutation.isPending}
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                  >
                    {updateMutation.isPending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Right: Anti-Spam Guard Info box */}
            <div className="space-y-6">
              <div className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl p-5 rounded-2xl space-y-2.5 relative overflow-hidden">
                {/* Emerald Pulse accent element */}
                <div className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <h4 className="font-black text-emerald-400 text-xs flex items-center gap-2">
                  <Shield size={14} className="text-emerald-400" /> Spam Koruması Aktif
                </h4>
                <p className="text-[10px] font-semibold text-slate-100 leading-relaxed">
                  Mesajlar yalnızca belirlediğiniz saat aralığı ve günlerde gönderilir. Günlük limit ve bekleme süresi WhatsApp ban riskini minimize etmek üzere arka planda dinamik olarak ayarlanmaktadır.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enrollment Sheet */}
      <Sheet open={isEnrollSheetOpen} onOpenChange={setIsEnrollSheetOpen}>
        <SheetContent side="right" className="sm:!max-w-2xl flex flex-col h-full bg-white dark:bg-zinc-950/95 backdrop-blur-lg p-0 border-l border-white/5 hover:border-white/15 shadow-2xl">
          <SheetHeader className="border-b border-white/5 hover:border-white/15 p-6 pb-4 bg-white dark:bg-zinc-950/30 shrink-0">
            <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="text-emerald-400 size-5" /> Diziye İşletme Ekle
            </SheetTitle>
            <p className="text-xs text-slate-400 font-medium">
              İletişim kanalları, puanları, şehirleri ve kategorileri filtreleyerek otomasyon dizinize topluca ekleyin.
            </p>
          </SheetHeader>

          {/* Dynamic Filters Grid */}
          <div className="p-6 pb-4 space-y-4 shrink-0 border-b border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/20">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metin Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
                  <Input
                    placeholder="İsim veya anahtar kelime..."
                    value={sheetSearch}
                    onChange={(e) => setSheetSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-white/5 text-xs font-medium bg-white dark:bg-zinc-950 text-white focus-visible:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="size-3.5 text-slate-500" /> Min. Puan (Rating)
                </label>
                <Select
                  value={minRating || "all"}
                  onValueChange={(val) => setMinRating(val === "all" || !val ? "" : val)}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-white/5 text-xs font-semibold text-slate-100 h-10 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <SelectValue placeholder="Tüm Puanlar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border border-white/5 text-slate-100">
                    <SelectItem value="all">Tüm Puanlar</SelectItem>
                    <SelectItem value="3.0">3.0+ Yıldız</SelectItem>
                    <SelectItem value="4.0">4.0+ Yıldız</SelectItem>
                    <SelectItem value="4.5">4.5+ Yıldız</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-500" /> Şehir
                </label>
                <Select
                  value={selectedCity || "all"}
                  onValueChange={(val) => setSelectedCity(val === "all" || !val ? "" : val)}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-white/5 text-xs font-semibold text-slate-100 h-10 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <SelectValue placeholder="Tüm Şehirler" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border border-white/5 text-slate-100">
                    <SelectItem value="all">Tüm Şehirler</SelectItem>
                    {cities.map((city: string) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="size-3.5 text-slate-500" /> Kategori
                </label>
                <Select
                  value={selectedCategory || "all"}
                  onValueChange={(val) => setSelectedCategory(val === "all" || !val ? "" : val)}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-white/5 text-xs font-semibold text-slate-100 h-10 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <SelectValue placeholder="Tüm Kategoriler" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border border-white/5 text-slate-100">
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    {categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="size-3.5 text-slate-500" /> Web Sitesi Durumu
                </label>
                <Select
                  value={hasWebsite}
                  onValueChange={(val) => setHasWebsite(val || "all")}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-white/5 text-xs font-semibold text-slate-100 h-10 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <SelectValue placeholder="Farketmez (Hepsi)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border border-white/5 text-slate-100">
                    <SelectItem value="all">Farketmez (Hepsi)</SelectItem>
                    <SelectItem value="true">Sadece Web Sitesi Olanlar</SelectItem>
                    <SelectItem value="false">Sadece Web Sitesi Olmayanlar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="size-3.5 text-slate-500" /> Telefon Durumu
                </label>
                <Select
                  value={hasPhone}
                  onValueChange={(val) => setHasPhone(val || "all")}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border-white/5 text-xs font-semibold text-slate-100 h-10 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <SelectValue placeholder="Farketmez (Hepsi)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border border-white/5 text-slate-100">
                    <SelectItem value="all">Farketmez (Hepsi)</SelectItem>
                    <SelectItem value="true">Sadece Telefonu Olanlar</SelectItem>
                    <SelectItem value="false">Sadece Telefonu Olmayanlar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Select all header */}
            {availableLeads.length > 0 && (
              <div className="flex items-center justify-between bg-white/90 dark:bg-zinc-950/60 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="selectAllLeads"
                    checked={isAllSelected}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  />
                  <label htmlFor="selectAllLeads" className="text-xs font-bold text-slate-100 cursor-pointer select-none">
                    Hepsini Seç ({availableLeads.length})
                  </label>
                </div>
                {selectedIds.size > 0 && (
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {selectedIds.size} Seçili
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Leads Scroll Area */}
          <div className="flex-1 min-h-0 px-6 py-4">
            {leadsLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                <Loader2 className="animate-spin size-6 text-emerald-500" />
                <span className="text-xs font-semibold">Uyumlu kişiler yükleniyor...</span>
              </div>
            ) : sheetLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 text-center px-4">
                <div className="bg-white dark:bg-zinc-950/80 p-4 rounded-full">
                  <ShieldAlert className="size-8 text-slate-300 dark:text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">Kayıt Bulunamadı</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[320px]">
                    Filtrelere uygun kişi bulunamadı. Kriterlerinizi değiştirmeyi deneyebilirsiniz.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full pr-3 border border-white/5 hover:border-white/15 rounded-xl overflow-hidden bg-[#0c1220]/50 backdrop-blur-sm">
                <div className="divide-y divide-slate-200/50 dark:divide-zinc-800/40 p-2 space-y-1">
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
                          alreadyEnrolled
                            ? "bg-slate-50/50 dark:bg-zinc-900/30 opacity-60 cursor-not-allowed"
                            : "hover:bg-white/5/40 hover:border-slate-200/60 dark:border-zinc-800/50 cursor-pointer"
                        )}
                      >
                        <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {alreadyEnrolled ? (
                            <div className="size-4 rounded bg-emerald-950/50 border border-emerald-800 flex items-center justify-center">
                              <CheckCircle2 className="size-3 text-emerald-400" />
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
                            <p className="text-sm font-bold text-slate-100 truncate leading-snug">
                              {lead.businessName || lead.name}
                            </p>
                            {alreadyEnrolled && (
                              <Badge className="text-[8px] font-black bg-emerald-950/50 text-emerald-400 border-none shrink-0">
                                Eklendi
                              </Badge>
                            )}
                          </div>

                          {lead.address && (
                            <p className="text-[11px] mt-0.5 truncate font-medium text-slate-400">{lead.address}</p>
                          )}

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {lead.category && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100/80 dark:bg-zinc-900/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/40 dark:border-zinc-800/30">
                                <Tag className="size-2.5 text-slate-500" /> {lead.category}
                              </span>
                            )}
                            {lead.city && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/20">
                                <MapPin className="size-2.5 text-emerald-400" /> {lead.city}
                              </span>
                            )}
                            {lead.rating && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                ⭐ {lead.rating} ({lead.reviews || lead.reviewCount || 0})
                              </span>
                            )}
                            {lead.phone && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/20">
                                <Phone className="size-2.5 text-emerald-400" /> {lead.phone}
                              </span>
                            )}
                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-500/20 hover:bg-blue-500/25 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="size-2.5 text-blue-400" /> Web Sitesi ↗
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

          <SheetFooter className="border-t border-white/5 hover:border-white/15 p-6 shrink-0 bg-white dark:bg-zinc-950/30">
            <Button
              onClick={handleEnrollSelected}
              disabled={selectedIds.size === 0 || enrollingAll}
              className="w-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
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
    PENDING: { color: 'bg-white dark:bg-zinc-950 text-slate-400 border-white/5', label: 'Bekliyor', icon: Clock },
    IN_PROGRESS: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'İşleniyor', icon: Play },
    PAUSED: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Durduruldu', icon: Pause },
    COMPLETED: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Tamamlandı', icon: CheckCircle2 },
    FAILED: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Hata', icon: AlertCircle },
    REPLIED: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Yanıt Verildi', icon: MessageSquare },
  };
  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border", config.color)}>
      <Icon size={10} /> {config.label}
    </span>
  );
}

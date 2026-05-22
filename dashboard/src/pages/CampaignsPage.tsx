import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  BarChart3, 
  Plus, 
  Play, 
  Pause, 
  StopCircle, 
  RefreshCcw, 
  ChevronLeft,
  Users,
  MessageSquare,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Target,
  Zap,
  ShieldCheck,
  TrendingUp,
  Activity,
  Trash2,
  Calendar,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { toast } from 'sonner';
import { cn, safeFormatDate } from '../lib/utils';
import { useUIStore } from '../lib/store';
import { PlanGuard } from '../components/PlanGuard';

const API_URL = 'http://localhost:3001/api';

type CampaignViewMode = 'list' | 'create' | 'detail';

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const { setSelectedLeadId } = useUIStore();
  const [viewMode, setViewMode] = useState<CampaignViewMode>('list');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    filters: {
      city: '',
      category: '',
      minRating: ''
    }
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/campaigns');
      return res.data;
    },
    refetchInterval: 5000 // Real-time updates
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/templates');
      return res.data;
    }
  });

  const selectedCampaign = campaigns.find((c: any) => c.id === selectedCampaignId);

  // Fetch actual leads matching the campaign filters for the detail view
  const { data: matchedLeadsData, isLoading: isLeadsLoading } = useQuery({
    queryKey: ['campaign-leads', selectedCampaign?.filters],
    queryFn: async () => {
      const params: any = {};
      if (selectedCampaign?.filters?.city) params.city = selectedCampaign.filters.city;
      if (selectedCampaign?.filters?.category) params.category = selectedCampaign.filters.category;
      
      const res = await api.get('/leads', { params });
      return res.data;
    },
    enabled: !!selectedCampaign
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Setup default mock values for display metrics on new campaigns
      const payload = {
        ...data,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        _count: { leads: 0 }
      };
      return api.post('/campaigns', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setViewMode('list');
      setStep(1);
      setFormData({
        name: '',
        templateId: '',
        filters: { city: '', category: '', minRating: '' }
      });
      toast.success('Kampanya başarıyla oluşturuldu');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return api.patch(`/campaigns/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Kampanya durumu güncellendi');
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/campaigns/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Kampanya silindi');
      setViewMode('list');
      setSelectedCampaignId(null);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
      case 'ACTIVE': return 'bg-green-500 text-white';
      case 'PAUSED': return 'bg-amber-500 text-white';
      case 'COMPLETED': return 'bg-emerald-500 text-white';
      case 'FAILED': return 'bg-red-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RUNNING':
      case 'ACTIVE': return 'Aktif Çalışıyor';
      case 'PAUSED': return 'Duraklatıldı';
      case 'COMPLETED': return 'Tamamlandı';
      case 'FAILED': return 'Hata Oluştu';
      case 'DRAFT': return 'Taslak';
      default: return status;
    }
  };

  // Safe variables substitution for message template preview
  const getPersonalizedPreview = (templateId: string) => {
    const template = templates.find((t: any) => t.id === templateId || t.id === 'welcome');
    if (!template) return 'Şablon seçilmedi.';
    return template.content
      .replace('{businessName}', 'Örnek İşletme A.Ş.')
      .replace('{category}', 'Restoran')
      .replace('{city}', 'Antalya');
  };

  return (
    <PlanGuard minPlan="pro" featureName="Gelişmiş Kampanyalar">
      <div className="space-y-6">
        
        {/* 1. LIST VIEW MODE */}
        {viewMode === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  <Target className="text-emerald-500" /> <span className="text-gradient-tw">Kampanyalar</span>
                </h2>
                <p className="text-muted-foreground mt-1 text-sm font-medium">Kitlesel mesaj gönderimlerini ve kampanya performansını yönetin.</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-50/10 text-green-600 dark:text-green-400 border-none font-black text-[10px] px-3 py-1 rounded-full flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Anti-Ban v2 Aktif
                </Badge>
                <Button 
                  onClick={() => setViewMode('create')}
                  className="bg-emerald-500 hover:bg-emerald-600 font-bold gap-2 rounded-xl shadow-lg shadow-emerald-500/10 text-black"
                >
                  <Plus size={18} /> Yeni Kampanya
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Campaign Cards List */}
              <div className="lg:col-span-2 space-y-4">
                {isLoading ? (
                  <div className="py-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Kampanyalar Yükleniyor...</div>
                ) : campaigns.length === 0 ? (
                  <Card className="border-none shadow-xl bg-[#0c1220]/50 backdrop-blur-sm p-20 text-center rounded-2xl">
                    <BarChart3 className="size-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">Henüz hiç kampanya oluşturmadınız.</p>
                    <Button onClick={() => setViewMode('create')} className="mt-4 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl">İlk Kampanyanı Başlat</Button>
                  </Card>
                ) : (
                  campaigns.map((campaign: any) => {
                    const percentComplete = campaign.status === 'COMPLETED' ? 100 : campaign.status === 'ACTIVE' || campaign.status === 'RUNNING' ? 45 : 0;
                    return (
                      <Card 
                        key={campaign.id} 
                        className="border border-white/5 hover:border-white/15 hover:border-emerald-500/30 bg-[#0c1220]/50 backdrop-blur-sm shadow-lg hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer group"
                        onClick={() => {
                          setSelectedCampaignId(campaign.id);
                          setViewMode('detail');
                        }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={cn("border-none font-black text-[9px] px-2 py-0.5 rounded-full", getStatusColor(campaign.status))}>
                                  {getStatusText(campaign.status)}
                                </Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {safeFormatDate(campaign.createdAt, 'dd MMM yyyy')}
                                </span>
                              </div>
                              <h3 className="text-xl font-black text-white group-hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                                {campaign.name}
                                <ChevronLeft size={16} className="rotate-180 text-slate-300 group-hover:text-emerald-500 transition-transform" />
                              </h3>
                            </div>
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              {(campaign.status === 'RUNNING' || campaign.status === 'ACTIVE') ? (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl text-amber-500 hover:bg-amber-50" 
                                  onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: 'PAUSED' })}
                                >
                                  <Pause size={18} />
                                </Button>
                              ) : (campaign.status === 'DRAFT' || campaign.status === 'PAUSED') ? (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl text-green-600 hover:bg-green-50" 
                                  onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: 'RUNNING' })}
                                >
                                  <Play size={18} />
                                </Button>
                              ) : null}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) {
                                    deleteCampaignMutation.mutate(campaign.id);
                                  }
                                }}
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Users size={14} className="text-emerald-500" /> {campaign.leadsCount || campaign._count?.leads || 0} Segment Lead
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MessageSquare size={14} className="text-purple-500" /> {templates.find((t: any) => t.id === campaign.templateId)?.name || 'Şablon Mesajı'}
                                </div>
                              </div>
                              <div>%{percentComplete} Tamamlandı</div>
                            </div>
                            <Progress value={percentComplete} className="h-2 rounded-full bg-white/5" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Sidebar / Engine stats */}
              <div className="space-y-6">
                <Card className="border-none shadow-xl bg-emerald-500 text-white rounded-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <BarChart3 size={80} />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-blue-100">Sistem Kapasitesi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-3xl font-black">2.4k</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-200">24s Gönderim</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-3xl font-black">92%</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-200">Sağlık Skoru</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-emerald-500/30 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-100 flex items-center gap-2">
                        <Activity size={12} className="text-green-300" /> Kuyruk Stabil
                      </span>
                      <TrendingUp size={16} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-400">Anti-Ban v2 Engine</CardTitle>
                    <Zap size={14} className="text-amber-500" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-100">Günlük Limit</span>
                      <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">45/50</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-100">Isınma (Warmup)</span>
                      <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">+5/gün</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-100">Gecikme (Safe)</span>
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">30s-120s</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* 2. CREATE VIEW MODE */}
        {viewMode === 'create' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => { setViewMode('list'); setStep(1); }} 
                className="rounded-xl border-white/5 text-slate-100 bg-[#0c1220]/50 backdrop-blur-sm"
              >
                <ChevronLeft size={16} className="mr-1" /> Listeye Dön
              </Button>
              <div>
                <h2 className="text-2xl font-black text-white text-white">Yeni Kampanya Oluştur</h2>
                <p className="text-xs font-bold text-slate-400">Adım {step} / 2</p>
              </div>
            </div>

            <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
              <CardContent className="p-8 space-y-6">
                {step === 1 ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Kampanya Adı</label>
                      <Input 
                        placeholder="Örn: Antalya Restoran Outreach" 
                        className="rounded-xl font-bold border-white/5 h-11 focus:ring-2 focus:ring-blue-500/10"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mesaj Şablonu</label>
                      <Select value={formData.templateId} onValueChange={val => setFormData({...formData, templateId: val || ''})}>
                        <SelectTrigger className="rounded-xl font-bold border-white/5 h-11 bg-[#0c1220]/50 backdrop-blur-sm">
                          <SelectValue placeholder="Bir şablon seçin..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-[#0c1220]/50 backdrop-blur-sm z-50">
                          {templates.map((t: any) => (
                            <SelectItem key={t.id} value={t.id} className="rounded-lg font-bold text-xs">{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.templateId && (
                      <div className="p-4 bg-slate-50 bg-white/5 rounded-2xl border border-slate-100 space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles size={12} className="text-emerald-500" /> Şablon Önizlemesi (Değişkenler Dahil)
                        </div>
                        <p className="text-xs font-bold text-slate-100 leading-relaxed italic">
                          "{getPersonalizedPreview(formData.templateId)}"
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Filter size={16} className="text-emerald-500" /> Hedef Segment Filtreleri
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hedef Şehir</label>
                          <Input 
                            placeholder="Antalya" 
                            className="rounded-xl text-sm font-bold border-white/5 h-11"
                            value={formData.filters.city}
                            onChange={e => setFormData({...formData, filters: {...formData.filters, city: e.target.value}})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İşletme Kategorisi</label>
                          <Input 
                            placeholder="Restaurant" 
                            className="rounded-xl text-sm font-bold border-white/5 h-11"
                            value={formData.filters.category}
                            onChange={e => setFormData({...formData, filters: {...formData.filters, category: e.target.value}})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minimum Puan (Rating)</label>
                        <Input 
                          type="number"
                          step="0.1"
                          placeholder="4.0" 
                          className="rounded-xl text-sm font-bold border-white/5 h-11"
                          value={formData.filters.minRating}
                          onChange={e => setFormData({...formData, filters: {...formData.filters, minRating: e.target.value}})}
                        />
                      </div>
                      <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 space-y-2">
                        <p className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                          <Zap size={14} /> Güvenli Anti-Ban Gönderimi
                        </p>
                        <p className="text-[11px] font-medium text-emerald-600 leading-relaxed">
                          Kampanyayı başlattığınızda sistem bu filtrelere uyan lead'leri sıraya ekleyecek ve <strong>30-120 saniyelik</strong> koruyucu aralıklarla mesajları güvenle iletecektir.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                {step === 2 && (
                  <Button variant="ghost" onClick={() => setStep(1)} className="font-bold rounded-xl">Geri</Button>
                )}
                {step === 1 ? (
                  <Button 
                    className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl h-11 px-6 shadow-md shadow-emerald-500/10" 
                    onClick={() => setStep(2)}
                    disabled={!formData.name || !formData.templateId}
                  >
                    Sonraki Adım
                  </Button>
                ) : (
                  <Button 
                    className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl h-11 px-6 shadow-md shadow-emerald-500/10"
                    onClick={() => createMutation.mutate(formData)}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Oluşturuluyor...' : 'Kampanyayı Başlat'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* 3. DETAILED VIEW MODE */}
        {viewMode === 'detail' && selectedCampaign && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => { setViewMode('list'); setSelectedCampaignId(null); }} 
                  className="rounded-xl border-white/5 text-slate-100 bg-[#0c1220]/50 backdrop-blur-sm"
                >
                  <ChevronLeft size={16} className="mr-1" /> Listeye Dön
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white text-white">{selectedCampaign.name}</h2>
                    <Badge className={cn("border-none font-black text-[9px] px-2 py-0.5 rounded-full", getStatusColor(selectedCampaign.status))}>
                      {getStatusText(selectedCampaign.status)}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-1">Oluşturuldu: {safeFormatDate(selectedCampaign.createdAt, 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>

              {/* Campaign controls */}
              <div className="flex items-center gap-2">
                {(selectedCampaign.status === 'RUNNING' || selectedCampaign.status === 'ACTIVE') ? (
                  <Button 
                    onClick={() => updateStatusMutation.mutate({ id: selectedCampaign.id, status: 'PAUSED' })}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 rounded-xl shadow-lg shadow-amber-100"
                  >
                    <Pause size={16} /> Kampanyayı Duraklat
                  </Button>
                ) : (selectedCampaign.status === 'DRAFT' || selectedCampaign.status === 'PAUSED') ? (
                  <Button 
                    onClick={() => updateStatusMutation.mutate({ id: selectedCampaign.id, status: 'RUNNING' })}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold gap-1.5 rounded-xl shadow-lg shadow-green-100"
                  >
                    <Play size={16} /> Kampanyayı Başlat
                  </Button>
                ) : null}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) {
                      deleteCampaignMutation.mutate(selectedCampaign.id);
                    }
                  }}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2/3: Campaign Stats & Leads */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Stats widgets */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl p-5 space-y-2 shadow-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Hedef Kitle</span>
                    <div className="text-2xl font-black text-white text-white">{selectedCampaign.leadsCount || selectedCampaign._count?.leads || 150}</div>
                    <Progress value={100} className="h-1 bg-emerald-500/15 *:bg-emerald-500" />
                  </Card>
                  <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl p-5 space-y-2 shadow-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Gönderildi</span>
                    <div className="text-2xl font-black text-green-600">
                      {selectedCampaign.status === 'COMPLETED' ? (selectedCampaign.leadsCount || 150) : selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'RUNNING' ? Math.floor((selectedCampaign.leadsCount || 150) * 0.45) : 0}
                    </div>
                    <Progress value={selectedCampaign.status === 'COMPLETED' ? 100 : selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'RUNNING' ? 45 : 0} className="h-1 bg-green-100 *:bg-green-600" />
                  </Card>
                  <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl p-5 space-y-2 shadow-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sırada Bekleyen</span>
                    <div className="text-2xl font-black text-amber-500">
                      {selectedCampaign.status === 'COMPLETED' ? 0 : selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'RUNNING' ? Math.floor((selectedCampaign.leadsCount || 150) * 0.55) : (selectedCampaign.leadsCount || 150)}
                    </div>
                    <Progress value={selectedCampaign.status === 'COMPLETED' ? 0 : selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'RUNNING' ? 55 : 100} className="h-1 bg-amber-100 *:bg-amber-500" />
                  </Card>
                  <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl p-5 space-y-2 shadow-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Hata Oranı</span>
                    <div className="text-2xl font-black text-red-500">0%</div>
                    <Progress value={0} className="h-1 bg-red-100 *:bg-red-500" />
                  </Card>
                </div>

                {/* Progress Detail */}
                <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Kampanya İlerleme Durumu</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                      <span>Tamamlanma Oranı</span>
                      <span>%{selectedCampaign.status === 'COMPLETED' ? 100 : selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'RUNNING' ? 45 : 0}</span>
                    </div>
                    <Progress value={selectedCampaign.status === 'COMPLETED' ? 100 : selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'RUNNING' ? 45 : 0} className="h-2.5 rounded-full bg-white/5" />
                  </CardContent>
                </Card>

                {/* Leads segment matches list */}
                <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg">
                  <CardHeader className="pb-3 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Segment Eşleşmeleri ve Durum</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-400 mt-1">Kampanya filtreleriyle eşleşen lead'ler ve anlık mesaj durumları.</CardDescription>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-xs px-2.5 py-0.5 rounded-full">
                        {matchedLeadsData?.total || 0} Eşleşen Lead
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLeadsLoading ? (
                      <div className="py-12 text-center animate-pulse text-slate-400 font-bold">Hedef lead'ler listeleniyor...</div>
                    ) : !matchedLeadsData?.leads || matchedLeadsData.leads.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <AlertCircle className="size-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-bold">Filtrelerle eşleşen lead bulunamadı.</p>
                        <p className="text-xs font-medium max-w-sm mx-auto">Harita üzerinden şehir: "{selectedCampaign.filters?.city || '-'}" ve kategori: "{selectedCampaign.filters?.category || '-'}" olan işletmeleri tarayarak listeyi büyütebilirsiniz.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <th className="px-6 py-4">İşletme Adı</th>
                              <th className="px-6 py-4">Şehir / Kategori</th>
                              <th className="px-6 py-4">Telefon</th>
                              <th className="px-6 py-4">İletişim Durumu</th>
                              <th className="px-6 py-4 text-right">İncele</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-100">
                            {matchedLeadsData.leads.slice(0, 10).map((lead: any, index: number) => {
                              // Assign mock statuses to leads depending on current campaign status for visual richness
                              let deliveryStatus = 'PENDING';
                              if (selectedCampaign.status === 'COMPLETED') {
                                deliveryStatus = 'SENT';
                              } else if (selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'RUNNING') {
                                deliveryStatus = index < 4 ? 'SENT' : 'PENDING';
                              }

                              return (
                                <tr key={lead.id || lead._id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-black text-white text-white">{lead.businessName || lead.name}</td>
                                  <td className="px-6 py-4">
                                    <div className="space-y-0.5">
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{lead.city || 'Belirtilmemiş'}</div>
                                      <div className="text-slate-500 font-medium">{lead.category}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-slate-500 font-medium">{lead.phone || 'N/A'}</td>
                                  <td className="px-6 py-4">
                                    {deliveryStatus === 'SENT' ? (
                                      <Badge className="bg-green-50 text-green-600 border-none font-black text-[9px] px-2 py-0.5 rounded-full flex items-center w-fit gap-1">
                                        <CheckCircle2 size={10} /> Gönderildi
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-amber-50 text-amber-500 border-none font-black text-[9px] px-2 py-0.5 rounded-full flex items-center w-fit gap-1">
                                        <Clock size={10} /> Sırada Bekliyor
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-xl text-slate-400 hover:text-emerald-500"
                                      onClick={() => {
                                        setSelectedLeadId(lead.externalId || lead.id);
                                      }}
                                    >
                                      <ExternalLink size={14} />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right 1/3: Campaign Config & Template Preview */}
              <div className="space-y-6">
                
                {/* Campaign Filters Details */}
                <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Hedef Filtre Kriterleri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Hedef Şehir</span>
                      <Badge className="bg-white/5 text-slate-700 border-none font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                        {selectedCampaign.filters?.city || 'Tümü'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Kategori</span>
                      <Badge className="bg-white/5 text-slate-700 border-none font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                        {selectedCampaign.filters?.category || 'Tümü'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Minimum Rating</span>
                      <Badge className="bg-white/5 text-slate-700 border-none font-black px-2 py-0.5 rounded-full">
                        {selectedCampaign.filters?.minRating ? `⭐️ ${selectedCampaign.filters.minRating}` : 'Herhangi'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Template Preview */}
                <Card className="border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Kullanılan Şablon Mesajı</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-2xl border border-purple-100">
                      <MessageSquare size={16} className="text-purple-600" />
                      <div>
                        <div className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Şablon Adı</div>
                        <div className="text-xs font-bold text-purple-900">
                          {templates.find((t: any) => t.id === selectedCampaign.templateId)?.name || 'Şablon Mesajı'}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 bg-white/5 rounded-2xl border border-slate-100 space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Örnek Kişiselleştirilmiş Mesaj</div>
                      <p className="text-xs font-bold text-slate-100 leading-relaxed whitespace-pre-wrap italic">
                        "{getPersonalizedPreview(selectedCampaign.templateId)}"
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Anti-Ban Safety Notice */}
                <Card className="border-none shadow-xl bg-slate-900 text-white rounded-2xl p-6 space-y-3">
                   <div className="flex items-center gap-3">
                     <div className="bg-emerald-500 p-2 rounded-xl text-white">
                       <ShieldCheck size={20} />
                     </div>
                     <div>
                       <h4 className="text-sm font-black">Güvenli Gönderim</h4>
                       <p className="text-[10px] text-slate-400">Anti-Ban v2 Protokolü</p>
                     </div>
                   </div>
                   <p className="text-xs text-slate-300 leading-relaxed font-medium">
                     Bu kampanya için bekleme aralıkları otomatik olarak ayarlanmıştır. Her bir başarılı gönderim sonrasında WhatsApp algoritmasını korumak amacıyla rastgele <strong>30-120 saniye</strong> aralığında güvenli duraklamalar yapılacaktır.
                   </p>
                </Card>

              </div>
            </div>
          </div>
        )}

      </div>
    </PlanGuard>
  );
}

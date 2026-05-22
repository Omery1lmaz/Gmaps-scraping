import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeads, updateLead, getCities, getCategories } from '../../lib/api';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from '../../components/ui/sheet';
import { Checkbox } from '../../components/ui/checkbox';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Search, Plus, Loader2, CheckCircle2, ShieldAlert, MapPin, Tag, Globe, Phone, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface AddLeadsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddLeadsSheet({ isOpen, onClose }: AddLeadsSheetProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [hasWebsite, setHasWebsite] = useState('all');
  const [hasPhone, setHasPhone] = useState('all');
  const [minRating, setMinRating] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetStage, setTargetStage] = useState<string>('NEW');

  // Fetch cities and categories dynamically for filters
  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: getCities,
    enabled: isOpen,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isOpen,
  });

  // Query unassigned leads based on filters
  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['unassignedLeads', search, selectedCity, selectedCategory, hasWebsite, hasPhone, minRating],
    queryFn: () => getLeads({ 
      search, 
      city: selectedCity || undefined, 
      category: selectedCategory || undefined,
      hasWebsite: hasWebsite !== 'all' ? hasWebsite : undefined,
      hasPhone: hasPhone !== 'all' ? hasPhone : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      notInPipeline: true,
      limit: 150 
    }),
    enabled: isOpen,
  });

  const leads = leadsResponse?.leads ?? [];
  const STAGES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'MEETING_BOOKED', 'CLOSED', 'REJECTED'];
  
  // Show leads that don't have a status or whose status is not in active stages
  const unassignedLeads = leads.filter(
    (lead) => !lead.status || !STAGES.includes(lead.status)
  );

  const addLeadsMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedIds).map((id) =>
        updateLead(id, { status: targetStage })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${selectedIds.size} lead(ler) başarıyla pipeline'a eklendi`);
      setSelectedIds(new Set());
      onClose();
    },
    onError: () => {
      toast.error('Kişiler pipeline\'a eklenirken bir hata oluştu');
    },
  });

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(unassignedLeads.map((l) => l._id || l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectLead = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = unassignedLeads.length > 0 && selectedIds.size === unassignedLeads.length;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="sm:!max-w-2xl flex flex-col h-full bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl p-0 border-l border-slate-200/50 dark:border-slate-800 shadow-2xl"
      >
        {/* Header Section */}
        <SheetHeader className="border-b border-slate-200/60 dark:border-slate-800 p-6 pb-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2.5 rounded-xl text-black shadow-md shadow-emerald-500/20">
              <Plus className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-black text-slate-800 dark:text-white dark:text-white tracking-tight">
                Pipeline'a İşletme Ekle
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                Kriterlerinize uygun boştaki işletmeleri filtreleyin ve satış pipeline'ınıza topluca aktarın.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Dynamic Floating Filters Panel */}
        <div className="p-6 pb-4 shrink-0">
          <div className="bg-white/90 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-xs p-5 space-y-4">
            {/* Row 1: Target Stage, Search, Min Rating */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                  Hedef Aşama
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Metin Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <Input
                    placeholder="İşletme adı, adres veya anahtar kelime..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-4 focus-visible:ring-emerald-500/10 focus-visible:border-emerald-500 text-xs font-bold shadow-2xs bg-slate-50/30 dark:bg-slate-800/50"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: City, Category, Min Rating Filter */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-400" /> Şehir
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="">Tüm Şehirler</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag className="size-3.5 text-slate-400" /> Kategori
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Star className="size-3.5 text-amber-500 fill-amber-500/20" /> Min. Puan
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="">Fark Etmez</option>
                  <option value="3.0">3.0+ Yıldız</option>
                  <option value="4.0">4.0+ Yıldız</option>
                  <option value="4.5">4.5+ Yıldız</option>
                </select>
              </div>
            </div>

            {/* Row 3: Website and Phone filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe className="size-3.5 text-slate-400" /> Web Sitesi Durumu
                </label>
                <select
                  value={hasWebsite}
                  onChange={(e) => setHasWebsite(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="all">Fark Etmez (Hepsi)</option>
                  <option value="true">Sadece Web Sitesi Olanlar</option>
                  <option value="false">Sadece Web Sitesi Olmayanlar</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Phone className="size-3.5 text-slate-400" /> Telefon Durumu
                </label>
                <select
                  value={hasPhone}
                  onChange={(e) => setHasPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="all">Fark Etmez (Hepsi)</option>
                  <option value="true">Sadece Telefonu Olanlar</option>
                  <option value="false">Sadece Telefonu Olmayanlar</option>
                </select>
              </div>
            </div>

            {/* Premium Toolbar with Select All Action */}
            {unassignedLeads.length > 0 && (
              <div className="flex items-center justify-between bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all-checkbox"
                    checked={isAllSelected}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                    className="border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded-md"
                  />
                  <label htmlFor="select-all-checkbox" className="text-xs font-extrabold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Tümünü Seç ({unassignedLeads.length} İşletme)
                  </label>
                </div>
                {selectedIds.size > 0 && (
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-500/30 shadow-3xs animate-fade-in">
                    {selectedIds.size} Seçili
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Items Grid */}
        <div className="flex-1 min-h-0 px-6 pb-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <div className="relative flex items-center justify-center">
                <Loader2 className="animate-spin size-8 text-emerald-500" />
                <div className="absolute size-4 bg-emerald-500/10 rounded-full animate-ping" />
              </div>
              <span className="text-xs font-black tracking-wide text-slate-500 dark:text-slate-400 uppercase">İşletmeler Yükleniyor...</span>
            </div>
          ) : unassignedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 text-center px-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800 rounded-2xl shadow-3xs">
              <div className="bg-gradient-to-tr from-slate-100 to-slate-200/60 p-5 rounded-full shadow-3xs border border-slate-200/20">
                <ShieldAlert className="size-10 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-white dark:text-white">Uyumlu İşletme Bulunamadı</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[340px] font-semibold leading-relaxed">
                  Filtre koşullarınıza uyan ve pipeline dışı olan boştaki işletme bulunamadı. Kriterleri gevşetmeyi deneyebilirsiniz.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full pr-3 border border-slate-200/40 dark:border-slate-800 rounded-2xl overflow-hidden bg-white/70 dark:bg-slate-900/50 shadow-3xs">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1.5">
                {unassignedLeads.map((lead) => {
                  const lid = lead._id || lead.id;
                  const isSelected = selectedIds.has(lid);
                  return (
                    <div
                      key={lid}
                      onClick={() => toggleSelectLead(lid, !isSelected)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none",
                        isSelected 
                          ? "bg-emerald-500/10 border-emerald-500/30 shadow-xs" 
                          : "bg-white dark:bg-slate-900/50 border-transparent hover:border-slate-200/60 dark:hover:border-slate-700 hover:shadow-xs"
                      )}
                    >
                      {/* Checkbox wrapper */}
                      <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleSelectLead(lid, !!checked)}
                          className="border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded-md"
                        />
                      </div>

                      {/* Content block */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-black text-slate-800 dark:text-white dark:text-white truncate leading-snug group-hover:text-emerald-500 transition-colors">
                          {lead.businessName || lead.name}
                        </p>
                        
                        {lead.address && (
                          <p className="text-[10px] text-slate-400 truncate font-bold">{lead.address}</p>
                        )}

                        {/* Interactive Badges Grid */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap pt-1">
                          {lead.category && (
                            <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/20 dark:border-slate-700 flex items-center gap-1">
                              <Tag className="size-2.5 text-slate-400" /> {lead.category}
                            </span>
                          )}
                          {lead.city && (
                            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/20">
                              <MapPin className="size-2.5 text-emerald-400" /> {lead.city}
                            </span>
                          )}
                          {lead.rating && (
                            <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/40 flex items-center gap-1">
                              ⭐ {lead.rating} <span className="text-amber-500 font-bold">({lead.reviews || lead.reviewCount || 0})</span>
                            </span>
                          )}
                          {lead.phone && (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-100/50">
                              <Phone className="size-2.5 text-emerald-400" /> {lead.phone}
                            </span>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-100/50 hover:bg-indigo-100 transition-colors"
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

        {/* Footer Section */}
        <SheetFooter className="border-t border-slate-200/60 dark:border-slate-800 p-6 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs">
          <Button
            onClick={() => addLeadsMutation.mutate()}
            disabled={selectedIds.size === 0 || addLeadsMutation.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold h-12 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none disabled:transform-none"
          >
            {addLeadsMutation.isPending ? (
              <>
                <Loader2 className="animate-spin size-4" />
                Pipeline'a Ekleniyor...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4.5" />
                {selectedIds.size > 0 ? `${selectedIds.size} İşletmeyi Aşamaya Aktar` : 'Eklenecek İşletmeleri Seçin'}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

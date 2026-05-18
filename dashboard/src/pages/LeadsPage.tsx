import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getLeads, 
  updateLead, 
  getCategories, 
  getCities, 
  getStats,
  bulkDeleteLeads,
  bulkUpdateLeadsStatus,
  bulkEnrollLeadsInSequence,
  getSequences,
  aiFilterLeads
} from '../lib/api';
import { useUIStore } from '../lib/store';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  ArrowUpDown,
  Phone,
  Globe,
  MapPin,
  MessageSquare,
  Users as UsersIcon,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  CheckCircle,
  X,
  Sparkles
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import Pagination from '../components/Pagination';

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  CONTACTED: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  FOLLOW_UP: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  MEETING_BOOKED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  CLOSED: 'bg-green-500/10 text-green-500 border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusTranslations: Record<string, string> = {
  ALL: 'Tüm Durumlar',
  NEW: 'Yeni',
  CONTACTED: 'İletişime Geçildi',
  FOLLOW_UP: 'Takip Ediliyor',
  MEETING_BOOKED: 'Toplantı Ayarlandı',
  CLOSED: 'Kazanıldı',
  REJECTED: 'Reddedildi',
};

function isBusinessCurrentlyOpen(openingHours: any): boolean | undefined {
  if (!openingHours || Object.keys(openingHours).length === 0) return undefined;
  
  try {
    const now = new Date();
    // Google Maps times are local to Turkey (Istanbul). Ensure timezone correctness:
    const formatter = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const weekdayPart = parts.find(p => p.type === 'weekday')?.value;
    const hourPart = parts.find(p => p.type === 'hour')?.value;
    const minutePart = parts.find(p => p.type === 'minute')?.value;
    
    if (!weekdayPart || !hourPart || !minutePart) return undefined;
    
    // Capitalize first letter to match keys ("Pazartesi", "Salı", etc.)
    const currentDay = weekdayPart.charAt(0).toUpperCase() + weekdayPart.slice(1).toLowerCase();
    
    const todayHours = openingHours[currentDay] || openingHours[weekdayPart];
    if (!todayHours) return undefined;
    
    const cleanHours = todayHours.trim();
    if (cleanHours === 'Kapalı' || cleanHours.toLowerCase().includes('kapalı') || cleanHours === 'Closed') {
      return false;
    }
    if (cleanHours === '24 saat açık' || cleanHours.toLowerCase().includes('24 saat') || cleanHours === 'Open 24 hours') {
      return true;
    }
    
    // Parse hours formatted as "09:00–20:00" or similar dashes
    const partsTime = cleanHours.split(/[\u2013\u2014-]/);
    if (partsTime.length !== 2) return undefined;
    
    const [startStr, endStr] = partsTime.map((s: string) => s.trim());
    
    const [startHour, startMin] = startStr.split(':').map(Number);
    const [endHour, endMin] = endStr.split(':').map(Number);
    
    const currentHourVal = Number(hourPart);
    const currentMinVal = Number(minutePart);
    
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    const currentTotal = currentHourVal * 60 + currentMinVal;
    
    if (endTotal < startTotal) {
      // Overnight shift
      return currentTotal >= startTotal || currentTotal < endTotal;
    } else {
      return currentTotal >= startTotal && currentTotal < endTotal;
    }
  } catch (e) {
    console.error("Error parsing current open status:", e);
    return undefined;
  }
}

const SortableHeader = ({ column, children, sortBy, onSort }: {
  column: string;
  children: React.ReactNode;
  sortBy: string;
  onSort: (column: string) => void;
}) => (
  <TableHead 
    className="font-black text-[11px] uppercase tracking-[0.1em] text-slate-400 py-4 cursor-pointer hover:text-slate-700 select-none"
    onClick={() => onSort(column)}
  >
    <div className="flex items-center gap-1">
      {children}
      {sortBy === column && (
        <ArrowUpDown size={12} className="text-slate-600" />
      )}
    </div>
  </TableHead>
);

export function LeadsPage() {
  const queryClient = useQueryClient();
  const { setSelectedLeadId } = useUIStore();
  // Parse initial query params from URL
  const searchParams = new URLSearchParams(window.location.search);
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || 10;
  const initialSortBy = searchParams.get('sortBy') || 'businessName';
  const initialSortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  
  const initialPhone = searchParams.get('hasPhone') || 'all';
  const initialWebsite = searchParams.get('hasWebsite') || 'all';
  const initialCity = searchParams.get('city') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialMinRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : '';
  const initialMinReviews = searchParams.get('minReviews') ? Number(searchParams.get('minReviews')) : '';
  const initialIsOpenNow = searchParams.get('isOpenNow') || 'all';
  const initialHours = searchParams.get('hasOpeningHours') || 'all';
  
  const initialAiPrompt = searchParams.get('aiPrompt') || '';
  const initialAiPackageName = searchParams.get('aiPackageName') || '';
  const initialAiPackagePrice = searchParams.get('aiPackagePrice') || '';
  const initialAiMarketingStrategy = searchParams.get('aiMarketingStrategy') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  // Advanced filters states
  const [showFilters, setShowFilters] = useState(
    !!(initialPhone !== 'all' || initialWebsite !== 'all' || initialCity || initialCategory || initialMinRating || initialMinReviews || initialIsOpenNow !== 'all' || initialHours !== 'all')
  );
  const [phoneFilter, setPhoneFilter] = useState<string>(initialPhone);
  const [websiteFilter, setWebsiteFilter] = useState<string>(initialWebsite);
  const [cityFilter, setCityFilter] = useState<string>(initialCity);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [minRatingFilter, setMinRatingFilter] = useState<number | ''>(initialMinRating);
  const [minReviewsFilter, setMinReviewsFilter] = useState<number | ''>(initialMinReviews);
  const [isOpenNowFilter, setIsOpenNowFilter] = useState<string>(initialIsOpenNow);
  const [hoursFilter, setHoursFilter] = useState<string>(initialHours);

  // Selection states
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectAllMode, setSelectAllMode] = useState<boolean>(false);
  const [showAdvancedSelectDropdown, setShowAdvancedSelectDropdown] = useState<boolean>(false);
  const [advancedSelectOption, setAdvancedSelectOption] = useState<'custom' | 'page' | 'all'>('custom');
  const [customCount, setCustomCount] = useState<number>(25);
  const [maxPerCompanyActive, setMaxPerCompanyActive] = useState<boolean>(false);
  const [maxPerCompanyVal, setMaxPerCompanyVal] = useState<number>(1);
  const [isLoadingSelection, setIsLoadingSelection] = useState<boolean>(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);

  // AI Smart Search & Matching States
  const [aiPrompt, setAiPrompt] = useState<string>(initialAiPrompt);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<{
    matchedPackageName: string;
    matchedPackagePrice: string;
    marketingStrategy: string;
    mongoFilters: any;
  } | null>(
    initialAiPackageName
      ? {
          matchedPackageName: initialAiPackageName,
          matchedPackagePrice: initialAiPackagePrice,
          marketingStrategy: initialAiMarketingStrategy,
          mongoFilters: {
            category: initialCategory,
            hasWebsite: initialWebsite,
            hasPhone: initialPhone,
            city: initialCity,
            minRating: initialMinRating ? Number(initialMinRating) : null,
            search: initialSearch
          }
        }
      : null
  );

  const handleAISmartSearch = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsAiLoading(true);
    setAiReport(null);
    try {
      const response = await aiFilterLeads(promptText);
      if (response.success) {
        setAiReport({
          matchedPackageName: response.matchedPackageName,
          matchedPackagePrice: response.matchedPackagePrice,
          marketingStrategy: response.marketingStrategy,
          mongoFilters: response.mongoFilters
        });

        // Set React States according to filters returned by the AI rotating model
        const f = response.mongoFilters || {};
        
        setCategoryFilter(f.category || '');
        setWebsiteFilter(f.hasWebsite || 'all');
        setPhoneFilter(f.hasPhone || 'all');
        setCityFilter(f.city || '');
        setMinRatingFilter(f.minRating !== undefined && f.minRating !== null ? f.minRating : '');
        setSearchTerm(f.search || '');
        setPage(1);

        toast.success(`AI Fırsat Eşleştirmesi Başarılı: ${response.matchedPackageName} Paketi!`);
      } else {
        toast.error('Yapay zeka arama sonucu alınamadı.');
      }
    } catch (err) {
      console.error(err);
      toast.error('AI arama işlemi sırasında hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleClearAIReport = () => {
    setAiReport(null);
    setAiPrompt('');
    setCategoryFilter('');
    setWebsiteFilter('all');
    setPhoneFilter('all');
    setCityFilter('');
    setMinRatingFilter('');
    setSearchTerm('');
    setPage(1);
    toast.info('AI Filtreleri sıfırlandı.');
  };

  // Synchronize state changes to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (page !== 1) params.set('page', String(page));
    if (limit !== 10) params.set('limit', String(limit));
    if (sortBy !== 'businessName') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
    
    if (phoneFilter !== 'all') params.set('hasPhone', phoneFilter);
    if (websiteFilter !== 'all') params.set('hasWebsite', websiteFilter);
    if (cityFilter) params.set('city', cityFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (minRatingFilter) params.set('minRating', String(minRatingFilter));
    if (minReviewsFilter) params.set('minReviews', String(minReviewsFilter));
    if (isOpenNowFilter !== 'all') params.set('isOpenNow', isOpenNowFilter);
    if (hoursFilter !== 'all') params.set('hasOpeningHours', hoursFilter);
    
    if (aiPrompt) params.set('aiPrompt', aiPrompt);
    if (aiReport) {
      params.set('aiPackageName', aiReport.matchedPackageName);
      params.set('aiPackagePrice', aiReport.matchedPackagePrice);
      params.set('aiMarketingStrategy', aiReport.marketingStrategy);
    }
    
    const newSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, '');
    
    if (newSearch !== currentSearch) {
      const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [
    searchTerm,
    statusFilter,
    page,
    limit,
    sortBy,
    sortOrder,
    phoneFilter,
    websiteFilter,
    cityFilter,
    categoryFilter,
    minRatingFilter,
    minReviewsFilter,
    isOpenNowFilter,
    hoursFilter,
    aiPrompt,
    aiReport
  ]);

  const currentFilters = {
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: searchTerm,
    hasPhone: phoneFilter === 'all' ? undefined : phoneFilter,
    hasWebsite: websiteFilter === 'all' ? undefined : websiteFilter,
    city: cityFilter || undefined,
    category: categoryFilter || undefined,
    minRating: minRatingFilter || undefined,
    minReviews: minReviewsFilter || undefined,
    isOpenNow: isOpenNowFilter === 'all' ? undefined : isOpenNowFilter,
    hasOpeningHours: hoursFilter === 'all' ? undefined : hoursFilter
  };

  // Fetch unique categories and cities dynamically for dropdowns
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: getCities,
  });

  const { data: stats } = useQuery({
    queryKey: [
      'stats',
      statusFilter,
      searchTerm,
      phoneFilter,
      websiteFilter,
      cityFilter,
      categoryFilter,
      minRatingFilter,
      minReviewsFilter,
      isOpenNowFilter,
      hoursFilter
    ],
    queryFn: () => getStats(currentFilters),
  });

  const { data: sequences } = useQuery({
    queryKey: ['sequences'],
    queryFn: getSequences,
  });

  const { data: leadsData, isLoading } = useQuery({
    queryKey: [
      'leads',
      page,
      limit,
      sortBy,
      sortOrder,
      statusFilter,
      searchTerm,
      phoneFilter,
      websiteFilter,
      cityFilter,
      categoryFilter,
      minRatingFilter,
      minReviewsFilter,
      isOpenNowFilter,
      hoursFilter
    ],
    queryFn: () => getLeads({
      page,
      limit,
      sortBy,
      sortOrder,
      ...currentFilters
    }),
  });

  const leads = leadsData?.leads || [];
  const totalItems = leadsData?.total || 0;
  const totalPages = leadsData?.totalPages || 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => updateLead(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Müşteri durumu başarıyla güncellendi');
    },
  });

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortBy(column);
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    updateMutation.mutate({ id, status: newStatus });
  };

  // Selection Logic
  const pageLeadIds = leads.map((l: any) => l.id || l._id).filter(Boolean);
  const isAllPageSelected = pageLeadIds.length > 0 && pageLeadIds.every(id => selectedLeadIds.includes(id));
  const isSomePageSelected = pageLeadIds.length > 0 && pageLeadIds.some(id => selectedLeadIds.includes(id)) && !isAllPageSelected;

  const togglePageSelection = () => {
    if (selectAllMode || isAllPageSelected) {
      setSelectedLeadIds([]);
      setSelectAllMode(false);
    } else {
      setSelectedLeadIds(pageLeadIds);
      setSelectAllMode(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    if (selectAllMode) {
      const allExceptThis = pageLeadIds.filter(id => id !== leadId);
      setSelectedLeadIds(allExceptThis);
      setSelectAllMode(false);
    } else {
      if (selectedLeadIds.includes(leadId)) {
        setSelectedLeadIds(selectedLeadIds.filter(id => id !== leadId));
      } else {
        setSelectedLeadIds([...selectedLeadIds, leadId]);
      }
    }
  };

  const handleApplyAdvancedSelection = async () => {
    if (advancedSelectOption === 'page') {
      setSelectedLeadIds(pageLeadIds);
      setSelectAllMode(false);
      setShowAdvancedSelectDropdown(false);
    } else if (advancedSelectOption === 'all') {
      setSelectAllMode(true);
      setSelectedLeadIds([]);
      setShowAdvancedSelectDropdown(false);
    } else if (advancedSelectOption === 'custom') {
      try {
        setIsLoadingSelection(true);
        const response = await getLeads({
          limit: customCount,
          ...currentFilters
        });

        let fetchedLeads = response.leads || [];

        if (maxPerCompanyActive) {
          const companyCounts: Record<string, number> = {};
          fetchedLeads = fetchedLeads.filter(lead => {
            const companyName = lead.businessName || lead.name || '';
            companyCounts[companyName] = (companyCounts[companyName] || 0) + 1;
            return companyCounts[companyName] <= maxPerCompanyVal;
          });
        }

        setSelectedLeadIds(fetchedLeads.map(l => l.id || l._id).filter((id): id is string => !!id));
        setSelectAllMode(false);
        toast.success(`${fetchedLeads.length} müşteri başarıyla seçildi.`);
      } catch (error) {
        toast.error('Seçim yapılırken bir hata oluştu.');
        console.error(error);
      } finally {
        setIsLoadingSelection(false);
        setShowAdvancedSelectDropdown(false);
      }
    }
  };

  // Bulk Action Logic
  const handleBulkDelete = async () => {
    if (!confirm('Seçilen tüm müşterileri kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    
    try {
      setIsBulkProcessing(true);
      const result = await bulkDeleteLeads({
        leadIds: selectAllMode ? undefined : selectedLeadIds,
        filters: selectAllMode ? currentFilters : undefined,
        selectAll: selectAllMode
      });
      
      toast.success(`${result.deletedCount || selectedLeadIds.length} müşteri başarıyla silindi.`);
      setSelectedLeadIds([]);
      setSelectAllMode(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (error) {
      toast.error('Toplu silme işlemi sırasında hata oluştu.');
      console.error(error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    try {
      setIsBulkProcessing(true);
      const result = await bulkUpdateLeadsStatus({
        leadIds: selectAllMode ? undefined : selectedLeadIds,
        filters: selectAllMode ? currentFilters : undefined,
        selectAll: selectAllMode,
        status
      });

      toast.success(`${result.updatedCount || selectedLeadIds.length} müşterinin durumu "${statusTranslations[status] || status}" olarak güncellendi.`);
      setSelectedLeadIds([]);
      setSelectAllMode(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (error) {
      toast.error('Toplu durum güncelleme sırasında hata oluştu.');
      console.error(error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkEnrollSequence = async (sequenceId: string, sequenceName: string) => {
    try {
      setIsBulkProcessing(true);
      const result = await bulkEnrollLeadsInSequence({
        leadIds: selectAllMode ? undefined : selectedLeadIds,
        filters: selectAllMode ? currentFilters : undefined,
        selectAll: selectAllMode,
        sequenceId
      });

      toast.success(`${result.enrolledCount} müşteri "${sequenceName}" sırasına başarıyla eklendi. (${result.skippedCount} mükerrer atlandı)`);
      setSelectedLeadIds([]);
      setSelectAllMode(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      toast.error('Sıraya ekleme sırasında hata oluştu.');
      console.error(error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkExportSelected = () => {
    try {
      let leadsToExport: any[] = [];
      if (selectAllMode) {
        const queryParams = new URLSearchParams();
        if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
        if (searchTerm) queryParams.append('search', searchTerm);
        if (phoneFilter !== 'all') queryParams.append('hasPhone', phoneFilter);
        if (websiteFilter !== 'all') queryParams.append('hasWebsite', websiteFilter);
        if (cityFilter) queryParams.append('city', cityFilter);
        if (categoryFilter) queryParams.append('category', categoryFilter);
        if (minRatingFilter) queryParams.append('minRating', String(minRatingFilter));
        if (minReviewsFilter) queryParams.append('minReviews', String(minReviewsFilter));
        if (isOpenNowFilter !== 'all') queryParams.append('isOpenNow', isOpenNowFilter);
        if (hoursFilter !== 'all') queryParams.append('hasOpeningHours', hoursFilter);

        window.open(`http://localhost:3001/api/leads/export?${queryParams.toString()}`, '_blank');
        return;
      } else {
        leadsToExport = leads.filter((l: any) => selectedLeadIds.includes(l.id || l._id));
      }

      if (leadsToExport.length === 0) {
        toast.error('Dışa aktarılacak seçili müşteri bulunamadı.');
        return;
      }

      const headers = ['Name', 'Category', 'Rating', 'Reviews', 'Phone', 'Website', 'Address', 'City', 'URL', 'Status'];
      const rows = leadsToExport.map((l: any) => [
        l.businessName || l.name,
        l.category || '',
        l.rating || '',
        l.reviews || '',
        l.phone || '',
        l.website || '',
        l.address || '',
        l.city || '',
        l.url || '',
        l.status || 'NEW'
      ].map(v => `"${v}"`).join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_selections_export_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${leadsToExport.length} müşteri CSV olarak indirildi.`);
    } catch (e) {
      toast.error('Dışa aktarma başarısız oldu.');
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <UsersIcon className="text-primary" /> Müşteri Fırsatları
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Google Haritalar'dan toplanan işletme fırsatlarınızı yönetin ve takip edin.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl font-bold">
            <Download size={16} /> Dışa Aktar
          </Button>
          <Button className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100">
            Yeni Müşteri Ekle
          </Button>
        </div>
      </div>

      {/* 4 Premium Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Toplam Lead */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-blue-50/50 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Toplam Fırsat</span>
              <h3 className="text-3xl font-black text-slate-800 tabular-nums">
                {stats?.totalLeads ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
              <UsersIcon size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <span className="text-emerald-500 flex items-center">
              <TrendingUp size={12} className="mr-0.5" /> %12.4
            </span>
            <span>bu hafta artış</span>
          </div>
        </div>

        {/* Card 2: İletişime Geçilen */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-purple-50/50 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">İletişime Geçilen</span>
              <h3 className="text-3xl font-black text-slate-800 tabular-nums">
                {stats?.contactedLeads ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-inner group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              <MessageSquare size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <span className="text-purple-500 font-bold">
              {stats?.totalLeads ? Math.round(((stats.contactedLeads || 0) / stats.totalLeads) * 100) : 0}%
            </span>
            <span>toplam leade oranı</span>
          </div>
        </div>

        {/* Card 3: Anlaşmalar Kazanılan */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-emerald-50/50 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Kazanılan Anlaşma</span>
              <h3 className="text-3xl font-black text-slate-800 tabular-nums">
                {stats?.closedLeads ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <CheckCircle size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <span className="text-emerald-500 font-bold">
              {stats?.totalLeads ? Math.round(((stats.closedLeads || 0) / stats.totalLeads) * 100) : 0}%
            </span>
            <span>dönüşüm oranı</span>
          </div>
        </div>

        {/* Card 4: Ortalama Puan */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-amber-50/50 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ortalama Kalite</span>
              <h3 className="text-3xl font-black text-slate-800 tabular-nums">
                {stats?.averageRating ? Number(stats.averageRating).toFixed(2) : '0.00'}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              <Star size={22} className="fill-amber-400 group-hover:fill-white transition-colors duration-300" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <span className="text-amber-500 font-bold">5.0</span>
            <span>üzerinden ortalama puan</span>
          </div>
        </div>
      </div>

      <Card className="border border-slate-100 shadow-md shadow-slate-100/50 bg-white overflow-hidden rounded-2xl">
        {/* AI Smart Search & Package Matcher Section */}
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/30 border-b border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-500/20">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-wide flex items-center gap-1.5">
                Arvexa AI Akıllı Müşteri & Paket Eşleştirici
              </h4>
              <p className="text-[11px] text-slate-500 font-bold">
                Doğal dilde arama yapın, yapay zeka en uygun Arvexa hazır paketini ve B2B satış stratejisini eşleştirsin.
              </p>
            </div>
          </div>

          <div className="flex gap-2 max-w-3xl">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500/70 animate-pulse" size={16} />
              <Input 
                placeholder="Örn: 'Antalya'da web sitesi olmayan diş hekimleri' veya 'en karlı oto galeri potansiyelleri'..." 
                className="pl-10 h-11 rounded-xl bg-white border-slate-200/80 focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/30 text-xs font-semibold text-slate-700 placeholder-slate-400/90 shadow-sm"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAISmartSearch(aiPrompt);
                }}
              />
            </div>
            <Button
              onClick={() => handleAISmartSearch(aiPrompt)}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-95"
            >
              {isAiLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Sparkles size={14} />
              )}
              {isAiLoading ? 'Analiz Ediliyor...' : 'Fırsat Bul'}
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Önerilenler:</span>
            {[
              "Web sitesi olmayan Antalya diş hekimleri",
              "Oto Galeri paketi satabileceğimiz galeriler",
              "Güzellik salonu paketi için Antalya fırsatları",
              "Web sitesi veya telefonu olmayan restoranlar"
            ].map((suggest, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiPrompt(suggest);
                  handleAISmartSearch(suggest);
                }}
                disabled={isAiLoading}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200/60 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                {suggest}
              </button>
            ))}
          </div>

          {/* Loading Pulse */}
          {isAiLoading && (
            <div className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/20 animate-pulse flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-200 flex items-center justify-center">
                <Sparkles size={16} className="text-blue-600 animate-spin" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-1/4 rounded bg-blue-200" />
                <div className="h-3 w-3/4 rounded bg-slate-200" />
              </div>
            </div>
          )}

          {/* AI Report Card */}
          {aiReport && (
            <div className="mt-4 p-5 rounded-xl border border-indigo-100 bg-white shadow-sm flex flex-col md:flex-row gap-5 animate-in fade-in slide-in-from-top-3 duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full bg-indigo-50/50" />
              
              {/* Package Match */}
              <div className="md:w-1/3 p-4 rounded-xl bg-indigo-50/30 border border-indigo-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">DİJİTAL BÜYÜME HEDEFİ</span>
                  <h5 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                    {aiReport.matchedPackageName}
                  </h5>
                  <div className="text-2xl font-black text-indigo-600 mt-2 tracking-tight">
                    {aiReport.matchedPackagePrice}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-4">
                  *Arvexa hazır paket fiyatıdır.
                </div>
              </div>

              {/* Pitch Stratejisi */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">B2B SATIŞ & PAZARLAMA STRATEJİSİ</span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {aiReport.marketingStrategy}
                  </p>
                  
                  {/* Applied Filters Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-1">Uygulanan AI Filtreleri:</span>
                    {Object.entries(aiReport.mongoFilters || {}).map(([key, val]) => {
                      if (!val || val === 'all') return null;
                      let displayKey = key;
                      if (key === 'category') displayKey = 'Kategori';
                      if (key === 'hasWebsite') displayKey = 'Websitesi Yok';
                      if (key === 'city') displayKey = 'Şehir';
                      if (key === 'minRating') displayKey = 'Min Puan';
                      if (key === 'search') displayKey = 'Arama';
                      
                      let displayVal = String(val);
                      if (val === 'false') displayVal = 'Yok';
                      if (val === 'true') displayVal = 'Var';
                      
                      return (
                        <span key={key} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-slate-500">
                          {displayKey}: <strong className="text-slate-700">{displayVal}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-50">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearAIReport}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 rounded-xl"
                  >
                    Temizle & Sıfırla
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <CardHeader className="pb-3 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Müşteri ara (isim, kategori)..." 
                  className="pl-9 h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-primary/20 transition-all text-sm font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" size="sm" className="gap-2 font-bold text-slate-500">
                    <Filter size={16} /> Durum: {statusFilter === 'ALL' ? 'Tümü' : (statusTranslations[statusFilter] || statusFilter)}
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 p-1 shadow-xl bg-white">
                  <DropdownMenuItem className="rounded-lg font-bold text-xs py-2" onClick={() => handleFilterChange('ALL')}>
                    Tüm Durumlar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-lg font-bold text-xs py-2" onClick={() => handleFilterChange('NEW')}>
                    Yeni
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg font-bold text-xs py-2" onClick={() => handleFilterChange('CONTACTED')}>
                    İletişime Geçildi
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg font-bold text-xs py-2" onClick={() => handleFilterChange('FOLLOW_UP')}>
                    Takip Ediliyor
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg font-bold text-xs py-2" onClick={() => handleFilterChange('MEETING_BOOKED')}>
                    Toplantı Ayarlandı
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg font-bold text-xs py-2" onClick={() => handleFilterChange('CLOSED')}>
                    Kazanıldı
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg font-bold text-xs py-2" onClick={() => handleFilterChange('REJECTED')}>
                    Reddedildi
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant={showFilters ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                className={cn("gap-2 font-bold rounded-xl", showFilters ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800" : "text-slate-500")}
              >
                <Filter size={16} /> Gelişmiş Filtreler {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Category Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Kategori</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories?.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* City Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Şehir</label>
                <select 
                  value={cityFilter} 
                  onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option value="">Tüm Şehirler</option>
                  {cities?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Website Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Websitesi</label>
                <select 
                  value={websiteFilter} 
                  onChange={(e) => { setWebsiteFilter(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option value="all">Fark Etmez</option>
                  <option value="true">Websitesi Olan</option>
                  <option value="false">Websitesi Olmayan</option>
                </select>
              </div>

              {/* Phone Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Telefon</label>
                <select 
                  value={phoneFilter} 
                  onChange={(e) => { setPhoneFilter(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option value="all">Fark Etmez</option>
                  <option value="true">Telefonu Olan</option>
                  <option value="false">Telefonu Olmayan</option>
                </select>
              </div>

              {/* Min Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Minimum Puan</label>
                <Input 
                  type="number" 
                  min={1} 
                  max={5} 
                  step={0.1}
                  placeholder="Örn: 4.2" 
                  value={minRatingFilter}
                  onChange={(e) => { setMinRatingFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
                  className="h-10 rounded-xl bg-white border-slate-200 focus:border-blue-500 text-xs font-bold text-slate-600"
                />
              </div>

              {/* Min Reviews */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">En Az Yorum Sayısı</label>
                <Input 
                  type="number" 
                  placeholder="Örn: 50" 
                  value={minReviewsFilter}
                  onChange={(e) => { setMinReviewsFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
                  className="h-10 rounded-xl bg-white border-slate-200 focus:border-blue-500 text-xs font-bold text-slate-600"
                />
              </div>

              {/* Hours Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Çalışma Saatleri</label>
                <select 
                  value={hoursFilter} 
                  onChange={(e) => { setHoursFilter(e.target.value); setPage(1); }}
                  className="w-full h-10 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option value="all">Fark Etmez</option>
                  <option value="true">Saat Bilgisi Olan</option>
                  <option value="false">Saat Bilgisi Olmayan</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPhoneFilter('all');
                    setWebsiteFilter('all');
                    setCityFilter('');
                    setCategoryFilter('');
                    setMinRatingFilter('');
                    setMinReviewsFilter('');
                    setIsOpenNowFilter('all');
                    setHoursFilter('all');
                    setStatusFilter('ALL');
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl font-bold border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all text-xs"
                >
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  {/* Custom Advanced Selection Header Checkbox */}
                  <TableHead className="w-16 py-4 select-none relative pl-4">
                    <div className="flex items-center gap-1">
                      <input 
                        type="checkbox" 
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = isSomePageSelected;
                          }
                        }}
                        checked={selectAllMode || isAllPageSelected} 
                        onChange={togglePageSelection}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAdvancedSelectDropdown(!showAdvancedSelectDropdown);
                        }}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                        title="Gelişmiş Seçim Seçenekleri"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {showAdvancedSelectDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowAdvancedSelectDropdown(false)} 
                        />
                        <div className="absolute left-4 mt-2 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-1 duration-200 text-slate-700">
                          <div className="space-y-4">
                            
                            {/* Option 1: Select Custom Number */}
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <input 
                                type="radio" 
                                name="advanced-select"
                                checked={advancedSelectOption === 'custom'}
                                onChange={() => setAdvancedSelectOption('custom')}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                              <div className="space-y-2 flex-1">
                                <span className="text-xs font-bold text-slate-800">Kişi sayısı seçin</span>
                                {advancedSelectOption === 'custom' && (
                                  <div className="space-y-2.5 pt-1" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number"
                                        min={1}
                                        max={totalItems}
                                        value={customCount}
                                        onChange={e => setCustomCount(Math.max(1, parseInt(e.target.value) || 0))}
                                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                      />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input 
                                        type="checkbox"
                                        checked={maxPerCompanyActive}
                                        onChange={e => setMaxPerCompanyActive(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                      />
                                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Şirket başına en fazla</span>
                                      <input 
                                        type="number"
                                        min={1}
                                        disabled={!maxPerCompanyActive}
                                        value={maxPerCompanyVal}
                                        onChange={e => setMaxPerCompanyVal(Math.max(1, parseInt(e.target.value) || 0))}
                                        className="w-16 h-7 px-2 rounded-md border border-slate-200 text-[10px] font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                                      />
                                    </label>
                                  </div>
                                )}
                              </div>
                            </label>

                            {/* Option 2: Select Current Page */}
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <input 
                                type="radio" 
                                name="advanced-select"
                                checked={advancedSelectOption === 'page'}
                                onChange={() => setAdvancedSelectOption('page')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5"
                              />
                              <div className="flex justify-between items-center w-full">
                                <span className="text-xs font-bold text-slate-800">Bu sayfayı seç</span>
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{pageLeadIds.length}</span>
                              </div>
                            </label>

                            {/* Option 3: Select All Matching Filters */}
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <input 
                                type="radio" 
                                name="advanced-select"
                                checked={advancedSelectOption === 'all'}
                                onChange={() => setAdvancedSelectOption('all')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5"
                              />
                              <div className="flex justify-between items-center w-full">
                                <span className="text-xs font-bold text-slate-800">Tüm eşleşenleri seç</span>
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{totalItems.toLocaleString()}</span>
                              </div>
                            </label>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 border-t pt-3 mt-1">
                              <button 
                                onClick={() => setShowAdvancedSelectDropdown(false)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                              >
                                Vazgeç
                              </button>
                              <button 
                                onClick={handleApplyAdvancedSelection}
                                disabled={isLoadingSelection}
                                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                              >
                                {isLoadingSelection ? 'Yükleniyor...' : 'Uygula'}
                              </button>
                            </div>

                          </div>
                        </div>
                      </>
                    )}
                  </TableHead>

                  <SortableHeader column="businessName" sortBy={sortBy} onSort={handleSort}>İşletme Adı</SortableHeader>
                  <SortableHeader column="phone" sortBy={sortBy} onSort={handleSort}>İletişim</SortableHeader>
                  <SortableHeader column="city" sortBy={sortBy} onSort={handleSort}>Konum & Adres</SortableHeader>
                  <SortableHeader column="rating" sortBy={sortBy} onSort={handleSort}>Değerlendirme</SortableHeader>
                  <TableHead className="font-black text-[11px] uppercase tracking-[0.1em] text-slate-400 py-4">Çalışma Saatleri</TableHead>
                  <SortableHeader column="status" sortBy={sortBy} onSort={handleSort}>Durum</SortableHeader>
                  <TableHead className="text-right font-black text-[11px] uppercase tracking-[0.1em] text-slate-400 py-4">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Yükleniyor...</TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Kayıt Bulunamadı</TableCell>
                  </TableRow>
                ) : leads.map((lead: any) => (
                  <TableRow 
                    key={lead.id || lead._id} 
                    className={cn(
                      "hover:bg-slate-50/80 transition-colors border-slate-100 cursor-pointer group",
                      (selectAllMode || selectedLeadIds.includes(lead.id || lead._id)) && "bg-blue-50/30 hover:bg-blue-50/50"
                    )}
                    onClick={() => setSelectedLeadId(lead.id || lead._id)}
                  >
                    {/* Checkbox cell */}
                    <TableCell className="py-4 pl-4 w-12" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectAllMode || selectedLeadIds.includes(lead.id || lead._id)}
                        onChange={() => toggleLeadSelection(lead.id || lead._id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                    </TableCell>

                    {/* 1. İşletme Adı & Kategori & Harita Linki */}
                    <TableCell className="py-4 max-w-[220px]">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 w-full">
                          <span 
                            className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate block max-w-[180px] cursor-help"
                            title={lead.businessName || lead.name}
                          >
                            {lead.businessName || lead.name}
                          </span>
                          {(lead.url || lead.externalId) && (
                            <a 
                              href={lead.url || lead.externalId} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                              title="Google Haritalar'da Gör"
                            >
                              <MapPin size={14} />
                            </a>
                          )}
                        </div>
                        <div 
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]"
                          title={lead.category || 'Belirtilmemiş'}
                        >
                          {lead.category || 'Belirtilmemiş'}
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. İletişim Bilgileri (Telefon & Website & WhatsApp) */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {lead.phone ? (
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${lead.phone}`}
                              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-green-600 transition-colors bg-slate-50 px-2 py-1 rounded-lg"
                            >
                              <Phone size={12} className="text-green-500 fill-green-500/20" />
                              {lead.phone}
                            </a>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors flex items-center justify-center"
                              title="WhatsApp Mesajı Gönder"
                            >
                              <MessageSquare size={12} className="fill-green-600/10" />
                            </a>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-semibold italic">Telefon yok</div>
                        )}
                        {lead.website ? (
                          <a 
                            href={lead.website} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 tracking-wider hover:text-blue-800 hover:underline transition-all w-fit"
                          >
                            <Globe size={12} /> Websiteyi Aç
                          </a>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-semibold italic">Website yok</div>
                        )}
                      </div>
                    </TableCell>

                    {/* 3. Konum & Adres */}
                    <TableCell className="py-4 max-w-[200px]">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <MapPin size={12} className="text-slate-400 animate-bounce duration-1000" /> 
                          {lead.city || 'Antalya'}
                        </div>
                        {lead.address && (
                          <div className="text-[10px] font-semibold text-slate-400 truncate w-full" title={lead.address}>
                            {lead.address}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* 4. Değerlendirme & Yorumlar */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-slate-800 tabular-nums">
                            {lead.rating ? Number(lead.rating).toFixed(1) : '0.0'}
                          </span>
                          <span className="text-amber-400 text-sm font-bold">★</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          ({lead.reviews ?? lead.reviewCount ?? 0} Değerlendirme)
                        </div>
                      </div>
                    </TableCell>

                    {/* 5. Çalışma Saatleri (isOpenNow & openingHours Dropdown) */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const isCurrentlyOpen = isBusinessCurrentlyOpen(lead.openingHours) !== undefined 
                            ? isBusinessCurrentlyOpen(lead.openingHours) 
                            : lead.isOpenNow;

                          return isCurrentlyOpen !== undefined ? (
                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-fit",
                                isCurrentlyOpen 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-red-50 text-red-700 border border-red-200"
                              )}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", isCurrentlyOpen ? "bg-emerald-500" : "bg-red-500")} />
                              {isCurrentlyOpen ? 'Şu An Açık' : 'Şu An Kapalı'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold italic">Saat belirtilmemiş</span>
                          );
                        })()}

                        {lead.openingHours && Object.keys(lead.openingHours).length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <button className="text-[10px] text-slate-400 font-black hover:text-slate-700 transition-colors uppercase tracking-wider text-left flex items-center gap-0.5">
                                Haftalık Saatler <ChevronDown size={10} />
                              </button>
                            } />
                            <DropdownMenuContent align="start" className="w-56 p-2.5 rounded-xl border border-slate-200 shadow-xl bg-white text-[11px] text-slate-600 font-semibold">
                              <div className="font-bold text-[10px] uppercase text-slate-400 border-b pb-1 mb-1 tracking-widest">Çalışma Saatleri</div>
                              {Object.entries(lead.openingHours).map(([day, hrs]) => (
                                <div key={day} className="flex justify-between py-0.5">
                                  <span className="text-slate-500">{day}:</span>
                                  <span className="text-slate-700">{hrs as string}</span>
                                </div>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>

                    {/* 6. Durum Badge'i */}
                    <TableCell className="py-4">
                      <Badge className={cn("border-none font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm", statusColors[lead.status || 'NEW'] || statusColors.NEW)}>
                        {statusTranslations[lead.status || 'NEW'] || lead.status}
                      </Badge>
                    </TableCell>

                    {/* 7. İşlemler */}
                    <TableCell className="text-right py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {lead._count?.notes > 0 && (
                          <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg flex items-center gap-1">
                            <MessageSquare size={14} />
                            <span className="text-[10px] font-black">{lead._count.notes}</span>
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-800">
                              <MoreHorizontal size={18} />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 p-1 shadow-xl bg-white">
                            <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 cursor-pointer" onClick={() => handleUpdateStatus(lead.id || lead._id, 'CONTACTED')}>İletişime Geçildi Yap</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 cursor-pointer" onClick={() => handleUpdateStatus(lead.id || lead._id, 'FOLLOW_UP')}>Takip Ediliyor Yap</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 cursor-pointer" onClick={() => handleUpdateStatus(lead.id || lead._id, 'MEETING_BOOKED')}>Toplantı Ayarlandı Yap</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 text-green-600 font-black cursor-pointer" onClick={() => handleUpdateStatus(lead.id || lead._id, 'CLOSED')}>Anlaşmayı Kazanıldı Yap</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 text-red-600 font-black cursor-pointer" onClick={() => handleUpdateStatus(lead.id || lead._id, 'REJECTED')}>Fırsatı Reddedildi Yap</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={limit}
            onItemsPerPageChange={handleItemsPerPageChange}
            totalItems={totalItems}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Floating Action Bar */}
      {(selectedLeadIds.length > 0 || selectAllMode) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-slate-200/80 px-5 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom-5 duration-300 max-w-[90vw] overflow-x-auto select-none">
          
          {/* Selected status and Clear Button */}
          <div className="flex items-center gap-2 border-r pr-3 border-slate-100 mr-1 shrink-0">
            <span className="text-xs font-bold text-slate-700">
              {selectAllMode 
                ? `Tüm Filtre Eşleşenleri (${totalItems.toLocaleString()} Müşteri)` 
                : `${selectedLeadIds.length} Müşteri Seçildi`
              }
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedLeadIds([]);
                setSelectAllMode(false);
              }}
              className="h-8 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl"
            >
              Temizle
            </Button>
          </div>

          {/* Action: Add to Pipeline Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isBulkProcessing}
                className="h-9 gap-1.5 font-bold text-xs rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50/50"
              >
                + Pipeline'a Ekle
              </Button>
            } />
            <DropdownMenuContent align="center" className="w-56 rounded-xl border-slate-200 p-1 shadow-2xl bg-white text-slate-700 z-50">
              <div className="font-bold text-[10px] uppercase text-slate-400 border-b pb-1 mb-1 tracking-widest px-2 pt-1.5">Aşama Seçin</div>
              <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 cursor-pointer" onClick={() => handleBulkUpdateStatus('NEW')}>Yeni</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 cursor-pointer" onClick={() => handleBulkUpdateStatus('CONTACTED')}>İletişime Geçildi</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 cursor-pointer" onClick={() => handleBulkUpdateStatus('FOLLOW_UP')}>Takip Ediliyor</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 cursor-pointer" onClick={() => handleBulkUpdateStatus('MEETING_BOOKED')}>Toplantı Ayarlandı</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 text-green-600 font-black cursor-pointer" onClick={() => handleBulkUpdateStatus('CLOSED')}>Anlaşma Kazanıldı</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg font-bold text-xs py-2 text-red-600 font-black cursor-pointer" onClick={() => handleBulkUpdateStatus('REJECTED')}>Fırsat Reddedildi</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action: Enroll in Sequence (WP Automation) */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isBulkProcessing}
                className="h-9 gap-1.5 font-bold text-xs rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50/50"
              >
                <MessageSquare size={14} className="text-emerald-500 fill-emerald-500/10" /> WP Otomasyonuna Ekle
              </Button>
            } />
            <DropdownMenuContent align="center" className="w-64 rounded-xl border-slate-200 p-1 shadow-2xl bg-white text-slate-700 z-50">
              <div className="font-bold text-[10px] uppercase text-slate-400 border-b pb-1 mb-1 tracking-widest px-2 pt-1.5">Sıra Seçin</div>
              {sequences && sequences.length > 0 ? (
                sequences.map((seq: any) => (
                  <DropdownMenuItem 
                    key={seq._id || seq.id} 
                    className="rounded-lg font-bold text-xs py-2 flex flex-col items-start gap-0.5 cursor-pointer"
                    onClick={() => handleBulkEnrollSequence(seq._id || seq.id, seq.name)}
                  >
                    <span>{seq.name}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">{seq.steps?.length || 0} Adım</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="text-[10px] text-slate-400 font-semibold italic p-3 text-center">Aktif WhatsApp sırası bulunamadı</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action: Export CSV */}
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isBulkProcessing}
            onClick={handleBulkExportSelected}
            className="h-9 gap-1.5 font-bold text-xs rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50/50 shrink-0"
          >
            <Download size={14} /> Dışa Aktar
          </Button>

          {/* Action: Bulk Delete */}
          <Button 
            variant="destructive" 
            size="sm" 
            disabled={isBulkProcessing}
            onClick={handleBulkDelete}
            className="h-9 gap-1.5 font-bold text-xs rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 shrink-0 shadow-none hover:text-red-700"
          >
            Sil
          </Button>
        </div>
      )}
    </div>
  );
}

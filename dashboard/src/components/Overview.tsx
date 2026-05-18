import { useState, useEffect } from 'react'
import { Users, Filter, Download, Star, MapPin, Trash2, X, Phone, Globe, Mail, Search, CheckCircle2, TrendingUp, MoreHorizontal, ExternalLink, Rocket, KanbanSquare, ArrowRight, XCircle, Clock, AlertCircle, Plus, Sparkles, Target, Zap, RefreshCw, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Progress, ProgressIndicator } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import { API_BASE_URL } from '../config'
import axios from 'axios'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type Lead = {
  _id: string
  name: string
  url?: string
  category?: string
  rating?: number
  reviews?: number
  phone?: string
  website?: string
  email?: string
  city?: string
  address?: string
  openingHours?: Record<string, string>
  serviceOptions?: string[]
  status?: string
  notes?: string[]
  aiAnalysis?: {
    score: number;
    potential: 'LOW' | 'MEDIUM' | 'HIGH' | 'GOLDEN';
    reasoning: string;
    suggestedNiche?: string;
    estimatedBudget?: string;
    lastAnalyzed?: Date;
  };
}

type Stage = { _id: string; name: string; label: string; icon: string; color: string; order: number; };

const PipelineDialog = ({ 
  lead, 
  leads,
  selectedLeads,
  stages,
  onClose, 
  onSuccess,
  isOpen
}: { 
  lead: Lead | null, 
  leads: Lead[],
  selectedLeads: Set<string>,
  stages: Stage[],
  onClose: () => void, 
  onSuccess: () => Promise<void>,
  isOpen: boolean
}) => {
  const [stage, setStage] = useState<string>('NEW')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (lead) setStage(lead.status || 'NEW')
  }, [lead, isOpen])

  const handleSubmit = async () => {
    const leadsToUpdate = lead ? [lead] : leads.filter(l => selectedLeads.has(l._id))
    if (leadsToUpdate.length === 0) return
    
    setIsSubmitting(true)
    try {
      await Promise.all(leadsToUpdate.map(async (l) => {
        const newNotes = note.trim() ? [...(l.notes || []), note.trim()] : (l.notes || [])
        return axios.put(`${API_BASE_URL}/api/leads/${l._id}`, {
          status: stage,
          notes: newNotes
        })
      }))
      setNote('')
      await onSuccess()
      onClose()
    } catch (err) {
      console.error('Pipeline error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        onPointerDownOutside={(e) => {
          if (e.target instanceof Element && e.target.closest('[data-slot="select-content"]')) {
            e.preventDefault();
          }
        }}
        className="sm:max-w-[500px] p-0 overflow-hidden border-0 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] bg-white dark:bg-slate-900"
      >
        <DialogHeader className="p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full -ml-12 -mb-12 blur-2xl" />
          
          <DialogTitle className="text-2xl font-black flex items-center gap-4 relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <KanbanSquare className="h-7 w-7 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight">{lead ? 'Move to Pipeline' : 'Bulk Management'}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mt-1">Status Update Engine</span>
            </div>
          </DialogTitle>
          <p className="text-slate-400 text-[13px] mt-6 font-medium leading-relaxed max-w-[320px]">
            {lead 
              ? <>Updating status for <span className="text-white font-black">{lead.name}</span> to advance through your sales funnel.</>
              : <>Batch updating <span className="text-white font-black">{selectedLeads.size} leads</span> across the pipeline stages.</>
            }
          </p>
        </DialogHeader>
        
        <div className="p-10 space-y-8 bg-white dark:bg-slate-900">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Target Stage</label>
              <Badge variant="outline" className="rounded-full px-3 border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400">Required</Badge>
            </div>
            <Select value={stage} onValueChange={(v: string | null) => setStage(v || 'NEW')}>
              <SelectTrigger className="w-full h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 font-bold text-sm focus:ring-2 focus:ring-blue-500 transition-all shadow-inner">
                <SelectValue placeholder="Select target stage..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl p-2">
                {stages.length > 0 ? (
                  stages.map(s => (
                    <SelectItem key={s._id} value={s.name} className="rounded-xl py-3 px-4 font-bold text-sm focus:bg-blue-50 dark:focus:bg-blue-900/20">
                      {s.label}
                    </SelectItem>
                  ))
                ) : (
                  ['NEW', 'SEARCHED', 'CONTACTED', 'FOLLOW_UP', 'CLOSED', 'LOST'].map(s => (
                    <SelectItem key={s} value={s} className="rounded-xl py-3 px-4 font-bold text-sm">
                      {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Internal Context / Notes</label>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-0 group-focus-within:opacity-10 transition duration-500" />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Strategik notlarınızı buraya ekleyin..."
                className="min-h-[160px] rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 transition-all resize-none p-5 text-sm font-medium leading-relaxed shadow-inner"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-10 pt-0 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-4">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Vazgeç
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                İşleniyor...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {lead ? 'Pipeline Güncelle' : 'Toplu Güncelle'}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Stats = {
  totalLeads?: number
  totalPotentialRevenue?: number
  goldenLeads?: number
  highPotentialLeads?: number
  analyzedLeads?: number
}

type Filters = {
  search: string
  minRating: string
  minReviews: string
  category: string
  hasPhone: boolean
  hasWebsite: boolean
  hasEmail: boolean
  withoutWebsite: boolean
  withoutPhone: boolean
  withoutEmail: boolean
  isOpenNow: boolean
  priceLevel: string
  city: string
  createdAfter: string
  createdBefore: string
  hasOpeningHours: boolean
  hasDescription: boolean
  hasServiceOptions: boolean
  hasPlusCode: boolean
  hasAddress: boolean
  hasInstagram: boolean
  hasFacebook: boolean
  hasLinkedin: boolean
  serviceOption: string
  minPhotos: string
  sortBy: string
  sortOrder: string
  [key: string]: string | boolean
}

type OverviewProps = {
  leads: Lead[]
  stats: Stats | null
  filters: Filters
  setFilters: (filters: Filters) => void
  loading: boolean
  setShowFilters: (show: boolean) => void
  showFilters: boolean
  exportToCSVBackend: () => Promise<void>
  deleteLead: (id: string) => Promise<void>
  categories: string[]
  cities: string[]
  selectedLeads: Set<string>
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  bulkDelete: () => Promise<void>
  cleanWebsites: () => Promise<void>
  deleteAllLeads: () => Promise<void>
  expandedHours: string | null
  setExpandedHours: (id: string | null) => void
  fetchData: () => Promise<void>
  onScrapeStart: () => void
  onScrapeSuccess: (results: Lead[]) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalLeadsCount: number
  pageSize: number
  onPageSizeChange: (size: number) => void
  setSelectedLeads: (leads: Set<string>) => void
  addLeadsToPlannerDay: (leadIds: string[], target: Date) => Promise<void>
  onLeadsQueuedForPlanner: (year: number, month: number, day: number) => void
}

export const Overview = ({
  leads, stats, filters, setFilters, loading, setShowFilters, showFilters,
  exportToCSVBackend, deleteLead, categories, cities, selectedLeads, toggleSelect,
  toggleSelectAll, bulkDelete, cleanWebsites, deleteAllLeads, fetchData, onScrapeStart, onScrapeSuccess,
  currentPage, totalPages, onPageChange, totalLeadsCount, pageSize, onPageSizeChange, setSelectedLeads,
  addLeadsToPlannerDay, onLeadsQueuedForPlanner
}: OverviewProps) => {
  const [showFilterPanel, setShowFilterPanel] = useState(showFilters)
  const [pipelineLead, setPipelineLead] = useState<Lead | null>(null)
  const [isPipelineOpen, setIsPipelineOpen] = useState(false)
  const [plannerPickerOpen, setPlannerPickerOpen] = useState(false)
  const [plannerDateStr, setPlannerDateStr] = useState(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  })
  const [stages, setStages] = useState<Stage[]>([])
  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false)
  const [isScraping, setIsScraping] = useState(false)

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/pipeline-stages`)
        setStages(res.data)
      } catch (err) {
        console.error('Failed to fetch stages', err)
      }
    }
    fetchStages()
  }, [])
  const [scrapeForm, setScrapeForm] = useState({
    city: '',
    category: '',
    withoutWebsite: false,
    minRating: 0,
    limit: 20
  })
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [latestEvaluations, setLatestEvaluations] = useState<{ id: string, name: string, status: 'processing' | 'completed' | 'error' }[]>([]);

  const handleScrape = async () => {
    if (!scrapeForm.city || !scrapeForm.category) return
    setIsScraping(true)
    onScrapeStart()
    try {
      const res = await axios.post(`${API_BASE_URL}/api/leads/scrape`, scrapeForm)
      if (res.data.success) {
        onScrapeSuccess(res.data.leads || [])
      }
      await fetchData()
      setIsScrapeModalOpen(false)
      setScrapeForm({ city: '', category: '', withoutWebsite: false, minRating: 0, limit: 20 })
    } catch (err) {
      console.error('Scrape error:', err)
    } finally {
      setIsScraping(false)
    }
  }

  const handleAnalyzeAllLeads = async () => {
    if (isAnalyzingAll) return;
    
    const totalToAnalyze = (stats?.totalLeads || 0) - (stats?.analyzedLeads || 0);
    
    if (totalToAnalyze <= 0) {
      alert('Analiz edilecek lead bulunamadı.');
      return;
    }

    if (!window.confirm(`${totalToAnalyze} lead analiz edilecek. Devam etmek istediğinize emin misiniz?`)) {
      return;
    }

    setIsAnalyzingAll(true);
    setAnalysisProgress({ current: 0, total: totalToAnalyze });
    setLatestEvaluations([]);
    
    try {
      // Fetch leads without AI analysis using the new backend filter
      const res = await axios.get(`${API_BASE_URL}/api/leads`, {
        params: {
          limit: 1000,
          withoutAI: 'true'
        }
      });
      
      const leadsToAnalyze = res.data.leads;
      
      if (!leadsToAnalyze || leadsToAnalyze.length === 0) {
        alert('Analiz edilecek lead bulunamadı.');
        return;
      }

      setAnalysisProgress(prev => ({ ...prev, total: leadsToAnalyze.length }));
      
      const batchSize = 10;
      for (let i = 0; i < leadsToAnalyze.length; i += batchSize) {
        const batch = leadsToAnalyze.slice(i, i + batchSize);
        const ids = batch.map((lead: any) => lead._id);
        
        // Update live stream with current batch names
        setLatestEvaluations(prev => [
          ...batch.map((l: any) => ({ id: l._id, name: l.name, status: 'processing' as const })),
          ...prev
        ].slice(0, 15)); // Keep last 15 for the feed

        try {
          const bulkRes = await axios.post(`${API_BASE_URL}/api/ai/analyze-bulk`, { ids });
          
          if (bulkRes.data.count === 0 && ids.length > 0) {
            // All items in this batch failed analysis (likely rate limit)
            setLatestEvaluations(prev => 
              prev.map(item => ids.includes(item.id) ? { ...item, status: 'error' as const } : item)
            );
          } else {
            // Mark as completed in the feed (some might have failed, but we mark the batch action as done)
            setLatestEvaluations(prev => 
              prev.map(item => ids.includes(item.id) ? { ...item, status: 'completed' as const } : item)
            );
            setAnalysisProgress(prev => ({ ...prev, current: prev.current + bulkRes.data.count }));
          }
          
          // Refresh data after each batch to show live updates
          await fetchData();
        } catch (batchErr) {
          console.error(`Batch starting at ${i} failed:`, batchErr);
          setLatestEvaluations(prev => 
            prev.map(item => ids.includes(item.id) ? { ...item, status: 'error' as const } : item)
          );
        }
        
        // Slightly larger delay between batches to respect rate limits
        if (i + batchSize < leadsToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      alert(`${leadsToAnalyze.length} lead analizi tamamlandı!`);
    } catch (err) {
      console.error('Bulk AI analysis failed:', err);
      alert('AI analizi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsAnalyzingAll(false);
    }
  };




  const filteredLeads = leads;

  const avgRating = leads.length > 0
    ? (leads.reduce((acc: number, l: Lead) => acc + (l.rating || 0), 0) / leads.length).toFixed(1)
    : '0'




  const getInitials = (name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-1">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Dashboard
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and analyze your business leads</p>
          </div>
          
          <div className="flex-1 max-w-md relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Search leads by name, category or city..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="pl-11 pr-10 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
            {filters.search && (
              <button 
                onClick={() => setFilters({ ...filters, search: '' })}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant={showFilterPanel ? 'default' : 'outline'}
            onClick={() => { setShowFilterPanel(!showFilterPanel); setShowFilters(!showFilterPanel) }}
            size="sm"
            className={`h-11 px-4 rounded-xl font-bold text-[11px] uppercase tracking-wider ${showFilterPanel ? '' : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button 
            onClick={() => setIsScrapeModalOpen(true)}
            size="sm"
            className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-blue-500/20"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Live Scrape
          </Button>
          <Button onClick={exportToCSVBackend} size="sm" variant="outline" className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[11px] uppercase tracking-wider">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={deleteAllLeads} 
            size="sm" 
            variant="ghost" 
            className="h-11 px-4 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-[11px] uppercase tracking-wider"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All Data
          </Button>
        </div>
      </div>

      {/* Scrape Modal */}
      <Dialog open={isScrapeModalOpen} onOpenChange={setIsScrapeModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[32px] p-0 overflow-hidden border-0 shadow-2xl">
          <DialogHeader className="p-8 bg-blue-600 text-white relative">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <Rocket className="h-5 w-5" />
              Start Live Scrape
            </DialogTitle>
            <p className="text-blue-100 text-sm mt-2">Find business leads directly from Google Maps API.</p>
          </DialogHeader>
          <div className="p-8 space-y-5 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Target City</label>
                <Input 
                  placeholder="e.g. Istanbul" 
                  value={scrapeForm.city}
                  onChange={e => setScrapeForm({...scrapeForm, city: e.target.value})}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                <Input 
                  placeholder="e.g. Dentist" 
                  value={scrapeForm.category}
                  onChange={e => setScrapeForm({...scrapeForm, category: e.target.value})}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">No Website Only</div>
                    <div className="text-[10px] text-slate-500">Filter businesses without a website</div>
                  </div>
                </div>
                <Checkbox 
                  checked={scrapeForm.withoutWebsite}
                  onCheckedChange={(checked) => setScrapeForm({...scrapeForm, withoutWebsite: !!checked})}
                  className="h-5 w-5 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Min Rating</label>
                  <Input 
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={scrapeForm.minRating}
                    onChange={e => setScrapeForm({...scrapeForm, minRating: parseFloat(e.target.value)})}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Result Limit</label>
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    value={scrapeForm.limit}
                    onChange={e => setScrapeForm({...scrapeForm, limit: parseInt(e.target.value)})}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 bg-white dark:bg-slate-900">
            <div className="flex w-full gap-3 mt-4">
              <Button variant="ghost" onClick={() => setIsScrapeModalOpen(false)} className="flex-1 h-12 rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={handleScrape} 
                disabled={isScraping}
                className="flex-[2] h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {isScraping ? 'Scraping...' : 'Start Scrape'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Filter Panel */}
      {showFilterPanel && (
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Filter className="h-4 w-4 text-slate-500" />
                Filters
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({
                  search: '', minRating: '', minReviews: '', category: '', hasPhone: false, hasWebsite: false, hasEmail: false,
                  withoutWebsite: false, withoutPhone: false, withoutEmail: false, isOpenNow: false, priceLevel: '', city: '',
                  createdAfter: '', createdBefore: '', hasOpeningHours: false, hasDescription: false, hasServiceOptions: false,
                  hasPlusCode: false, hasAddress: false, hasInstagram: false, hasFacebook: false, hasLinkedin: false,
                  serviceOption: '', minPhotos: '', sortBy: 'createdAt', sortOrder: 'desc'
                })}
              >
                <X className="h-3.5 w-3.5 mr-1.5" /> Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search leads..."
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Industry</label>
                <Select value={filters.category} onValueChange={(v: string | null) => setFilters({ ...filters, category: v || '' })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: string) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">City</label>
                <Select value={filters.city} onValueChange={(v: string | null) => setFilters({ ...filters, city: v || '' })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city: string) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Min Rating</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minRating}
                    onChange={e => setFilters({ ...filters, minRating: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Min Reviews</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minReviews}
                    onChange={e => setFilters({ ...filters, minReviews: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 block">Quick Filters</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Has Phone', key: 'hasPhone', neg: 'withoutPhone', icon: Phone },
                  { label: 'No Phone', key: 'withoutPhone', neg: 'hasPhone', icon: Phone },
                  { label: 'Has Website', key: 'hasWebsite', neg: 'withoutWebsite', icon: Globe },
                  { label: 'No Website', key: 'withoutWebsite', neg: 'hasWebsite', icon: Globe },
                  { label: 'Has Email', key: 'hasEmail', neg: 'withoutEmail', icon: Mail },
                  { label: 'No Email', key: 'withoutEmail', neg: 'hasEmail', icon: Mail },
                ].map(({ label, key, neg, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={filters[key] === true ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-8 ${filters[key] === true ? '' : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                    onClick={() => setFilters({ ...filters, [key]: !(filters[key] as boolean), [neg]: false })}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 shadow-sm bg-white dark:bg-slate-900 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Business</CardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{stats?.totalLeads || 0}</div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-2 uppercase tracking-tight">
              <TrendingUp className="h-3 w-3" />
              <span>+12.5% vs last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-white dark:bg-slate-900 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filtered Result</CardTitle>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:scale-110 transition-transform">
              <Filter className="h-4 w-4 text-indigo-600 dark:indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{totalLeadsCount}</div>
            <div className="mt-3 overflow-hidden h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                style={{ width: `${(totalLeadsCount / (stats?.totalLeads || 1)) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-tight">
              {((totalLeadsCount / (stats?.totalLeads || 1)) * 100).toFixed(1)}% match rate
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-white dark:bg-slate-900 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reputation Score</CardTitle>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:scale-110 transition-transform">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              {avgRating}
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500">/ 5.0</span>
            </div>
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(parseFloat(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-800'}`} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-white dark:bg-slate-900 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">AI Value Potential</CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg group-hover:scale-110 transition-transform">
              <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
              {(stats?.totalPotentialRevenue || 0).toLocaleString('tr-TR')} <span className="text-sm font-bold text-slate-400">TL</span>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Golden</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{stats?.goldenLeads || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">High</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{stats?.highPotentialLeads || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">Analyzed</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{stats?.analyzedLeads || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI Top Recommendations
              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-md font-bold">Smart Pick</Badge>
            </h3>
          </div>
          <button
            onClick={handleAnalyzeAllLeads}
            disabled={isAnalyzingAll}
            className={`ml-2 h-9 px-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all hover:opacity-90 ${
              isAnalyzingAll ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAnalyzingAll ? `Analiz Ediliyor (${analysisProgress.current}/${analysisProgress.total})` : 'AI Hepsini Değerlendir'}
          </button>
        </div>

        {isAnalyzingAll && (
          <div className="px-1 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
                  AI Analiz İlerlemesi
                </div>
                <span>{Math.round((analysisProgress.current / analysisProgress.total) * 100)}%</span>
              </div>
              <Progress value={(analysisProgress.current / analysisProgress.total) * 100} className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <ProgressIndicator className="bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" />
              </Progress>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center justify-between">
                <span>Canlı Değerlendirme Akışı</span>
                <Badge variant="outline" className="text-[8px] border-slate-200 dark:border-slate-800">Live Feed</Badge>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {latestEvaluations.map((evalItem) => (
                  <Badge 
                    key={evalItem.id} 
                    variant="secondary" 
                    className={`text-[9px] font-bold py-1 px-2 rounded-lg flex items-center gap-1.5 transition-all duration-300 ${
                      evalItem.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' :
                      evalItem.status === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800/50' :
                      'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 animate-pulse'
                    }`}
                  >
                    {evalItem.status === 'completed' ? <CheckCircle2 className="h-2.5 w-2.5" /> : 
                     evalItem.status === 'error' ? <XCircle className="h-2.5 w-2.5" /> : 
                     <Clock className="h-2.5 w-2.5" />}
                    {evalItem.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.filter(l => l.aiAnalysis).sort((a, b) => (b.aiAnalysis?.score || 0) - (a.aiAnalysis?.score || 0)).slice(0, 3).map((lead) => (
            <Card key={lead._id} className="border-0 shadow-xl rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border-b-4 border-amber-500 hover:scale-[1.02] transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Potential High Ticket</div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">{lead.name}</h4>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{lead.aiAnalysis?.score}%</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">AI Score</div>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
                    "{lead.aiAnalysis?.reasoning}"
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 font-black text-[9px] uppercase tracking-widest ${
                      lead.aiAnalysis?.potential === 'GOLDEN' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                      lead.aiAnalysis?.potential === 'HIGH' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {lead.aiAnalysis?.potential}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">{lead.category?.replace(/[0-9]/g, '')}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPipelineLead(lead)} className="h-8 rounded-lg text-blue-600 font-bold text-[10px] uppercase">
                    Take Action <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {leads.filter(l => l.aiAnalysis).length === 0 && (
            <Card className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent rounded-[32px] p-12 text-center">
              <Zap className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No AI Recommendations Yet</h4>
              <p className="text-xs text-slate-500 mt-2">Start a Smart Scrape or analyze leads in the Pipeline to see top picks here.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Recent Leads
            <Badge variant="secondary" className="bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-md font-bold">{totalLeadsCount}</Badge>
          </h3>
          <div className="flex items-center gap-2">
             <Select 
               value={`${filters.sortBy}-${filters.sortOrder}`} 
               onValueChange={(v) => {
                 if (!v) return;
                 const [sortBy, sortOrder] = v.split('-');
                 setFilters({ ...filters, sortBy, sortOrder });
               }}
             >
               <SelectTrigger className="h-9 w-40 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider bg-white dark:bg-slate-900">
                 <SelectValue placeholder="Sort By" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="createdAt-desc">Newest First</SelectItem>
                 <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                 <SelectItem value="aiAnalysis.score-desc">Highest AI Score</SelectItem>
                 <SelectItem value="rating-desc">Highest Rated</SelectItem>
                 <SelectItem value="reviews-desc">Most Reviews</SelectItem>
                 <SelectItem value="name-asc">A-Z Name</SelectItem>
               </SelectContent>
             </Select>
             <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider">
               <Download className="h-3.5 w-3.5 mr-2" />
               View All
             </Button>
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden rounded-3xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-14 pl-6">
                    <Checkbox
                      checked={selectedLeads.size > 0 && selectedLeads.size === filteredLeads.length}
                      onCheckedChange={() => toggleSelectAll()}
                      className="rounded-md border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 shadow-sm transition-all active:scale-90"
                    />
                  </TableHead>
                  <TableHead className="py-5 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Business Details</TableHead>
                  <TableHead className="py-5 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Industry</TableHead>
                  <TableHead className="py-5 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Communication</TableHead>
                  <TableHead className="py-5 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Pipeline</TableHead>
                  <TableHead className="py-5 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">AI Value</TableHead>
                  <TableHead className="py-5 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Performance</TableHead>
                  <TableHead className="py-5 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                      <TableCell className="pl-6"><Skeleton className="h-5 w-5 rounded-md" /></TableCell>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-lg" /></TableCell>
                      <TableCell><div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-28" /></div></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-lg" /></TableCell>
                      <TableCell className="pr-6"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-slate-700">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                          <Search className="h-12 w-12" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-lg text-slate-900 dark:text-slate-50">No results matching your filters</div>
                          <div className="text-sm font-medium">Try removing some filters or searching for something else</div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead: Lead) => (
                    <TableRow
                      key={lead._id}
                      className={`group border-b border-slate-50 dark:border-slate-800/50 transition-all duration-200 ${
                        selectedLeads.has(lead._id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedLeads.has(lead._id)}
                          onCheckedChange={() => toggleSelect(lead._id)}
                          className="rounded-md border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 shadow-sm transition-all active:scale-90"
                        />
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform group-hover:scale-110 duration-300">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=random&bold=true&color=fff`} alt={lead.name} />
                            <AvatarFallback className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {getInitials(lead.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[240px]">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-slate-900 dark:text-slate-50 truncate">{lead.name}</div>
                            </div>
                            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1.5 group-hover:text-blue-500 transition-colors">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{lead.address}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 py-1 px-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider">
                          {lead.category?.replace(/[0-9]/g, '').replace('Açık', '').trim()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              <div className="p-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">
                                <Phone className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              {lead.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:scale-110 transition-transform">
                                <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </a>
                            )}
                            {lead.email && (
                              <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                                <Mail className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                              </div>
                            )}
                            <a href={lead.url} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-blue-600 hover:text-white transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {lead.status ? (
                            (() => {
                              const stage = stages.find(s => s.name === lead.status);
                              const colorMap: Record<string, string> = {
                                blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
                                purple: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
                                emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
                                amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                                rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
                                indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
                              };
                              const colorClass = stage ? colorMap[stage.color] : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-800';
                              
                              const IconMap: Record<string, any> = { Plus, ArrowRight, CheckCircle2, XCircle, Clock, AlertCircle };
                              const Icon = stage ? (IconMap[stage.icon] || KanbanSquare) : KanbanSquare;
                              
                              return (
                                <Badge 
                                  onClick={() => setPipelineLead(lead)}
                                  variant="outline" 
                                  className={`${colorClass} py-1 px-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:scale-105 transition-transform flex items-center w-fit gap-1.5`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {stage?.label || lead.status}
                                  {lead.notes && lead.notes.length > 0 && (
                                    <span className="flex items-center justify-center bg-current/10 w-4 h-4 rounded-full text-[9px] ml-0.5">
                                      {lead.notes.length}
                                    </span>
                                  )}
                                </Badge>
                              );
                            })()
                          ) : (
                              <Badge 
                                onClick={() => setPipelineLead(lead)}
                                variant="outline" 
                                className="bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800/30 dark:text-slate-500 dark:border-slate-800 py-1 px-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:scale-105 transition-transform w-fit"
                              >
                                New Lead
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                              {lead.aiAnalysis && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                      lead.aiAnalysis.potential === 'GOLDEN' ? 'bg-amber-100 text-amber-600' :
                                      lead.aiAnalysis.potential === 'HIGH' ? 'bg-emerald-100 text-emerald-600' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>
                                      {lead.aiAnalysis.potential} {lead.aiAnalysis.score}%
                                    </span>
                                    {lead.aiAnalysis.estimatedBudget && (
                                      <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                                        <Zap className="h-2 w-2" /> {lead.aiAnalysis.estimatedBudget}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] text-indigo-500 font-bold mt-0.5 italic leading-tight">{lead.aiAnalysis.reasoning}</span>
                                </>
                              )}
                          </div>
                        </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <span className="text-xs font-black text-amber-700 dark:text-amber-500 mr-1.5">{lead.rating || '0'}</span>
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600">({lead.reviews || 0} reviews)</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800 h-10 w-10 rounded-xl transition-all">
                              <MoreHorizontal className="h-5 w-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-50" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl p-2">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2">Lead Actions</div>
                             <DropdownMenuItem 
                               onClick={() => setPipelineLead(lead)}
                               className="rounded-xl py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-600 dark:focus:text-blue-400 font-medium"
                             >
                               <KanbanSquare className="h-4 w-4 mr-2" /> Add to Pipeline
                             </DropdownMenuItem>
                             <DropdownMenuItem className="rounded-xl py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-600 dark:focus:text-blue-400 font-medium">
                               <Rocket className="h-4 w-4 mr-2" /> Quick Outreach
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="bg-slate-50 dark:bg-slate-800 my-1" />
                             <DropdownMenuItem onClick={() => deleteLead(lead._id)} className="rounded-xl py-2.5 px-3 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600 dark:focus:text-red-400 font-medium">
                               <Trash2 className="h-4 w-4 mr-2" /> Delete Data
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages >= 1 && (
              <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Show</span>
                    <Select value={pageSize.toString()} onValueChange={(v) => v && onPageSizeChange(Number(v))}>
                      <SelectTrigger className="h-8 w-20 rounded-lg border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">per page</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 px-4 font-bold border-slate-200 dark:border-slate-800 shadow-sm disabled:opacity-30"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageNum = currentPage;
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'ghost'}
                          size="sm"
                          className={`h-9 w-9 rounded-xl font-bold ${currentPage === pageNum ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white' : 'text-slate-500'}`}
                          onClick={() => onPageChange(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 px-4 font-bold border-slate-200 dark:border-slate-800 shadow-sm disabled:opacity-30"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Selection Bar */}
      {selectedLeads.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-8 border border-white/10 dark:border-slate-200 backdrop-blur-xl">
            <div className="flex items-center gap-3 pr-8 border-r border-white/10 dark:border-slate-100">
              <div className="bg-blue-600 text-white h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg shadow-blue-500/40">
                {selectedLeads.size}
              </div>
              <span className="text-sm font-bold tracking-tight">Leads Selected</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const t = new Date()
                  setPlannerDateStr(
                    `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
                  )
                  setPlannerPickerOpen(true)
                }}
                variant="ghost"
                className="h-10 px-4 rounded-xl hover:bg-white/10 dark:hover:bg-slate-50 text-white dark:text-slate-900 font-bold text-xs gap-2 transition-all"
              >
                <Calendar className="h-4 w-4" /> Günlük plana ekle
              </Button>
              <Button 
                onClick={() => {
                  setPipelineLead(leads.find(l => selectedLeads.has(l._id)) || null);
                  setIsPipelineOpen(true);
                }}
                variant="ghost" 
                className="h-10 px-4 rounded-xl hover:bg-white/10 dark:hover:bg-slate-50 text-white dark:text-slate-900 font-bold text-xs gap-2 transition-all"
              >
                <KanbanSquare className="h-4 w-4" /> Move Stage
              </Button>
              <Button 
                onClick={async () => {
                  if (!confirm(`Analyze ${selectedLeads.size} leads with AI?`)) return;
                  try {
                    await axios.post(`${API_BASE_URL}/api/ai/analyze-bulk`, { ids: Array.from(selectedLeads) });
                    await fetchData();
                    setSelectedLeads(new Set());
                  } catch (err) {
                    console.error('Bulk AI analysis failed:', err);
                  }
                }}
                variant="ghost" 
                className="h-10 px-4 rounded-xl hover:bg-white/10 dark:hover:bg-slate-50 text-indigo-400 dark:text-indigo-600 font-bold text-xs gap-2 transition-all"
              >
                <Sparkles className="h-4 w-4" /> AI Analyze
              </Button>
              <Button 
                onClick={cleanWebsites}
                variant="ghost" 
                className="h-10 px-4 rounded-xl hover:bg-white/10 dark:hover:bg-slate-50 text-white dark:text-slate-900 font-bold text-xs gap-2 transition-all"
              >
                <Globe className="h-4 w-4" /> Clean Data
              </Button>
              <Button 
                onClick={bulkDelete}
                variant="ghost" 
                className="h-10 px-4 rounded-xl hover:bg-red-500/20 text-red-400 font-bold text-xs gap-2 transition-all"
              >
                <Trash2 className="h-4 w-4" /> Bulk Delete
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/10 dark:bg-slate-100" />

            <Button 
              onClick={() => toggleSelectAll()}
              variant="ghost" 
              className="h-10 w-10 rounded-full hover:bg-white/10 dark:hover:bg-slate-50 text-white dark:text-slate-900 p-0 transition-all hover:rotate-90 duration-300"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Pipeline Dialog */}
      <PipelineDialog 
        lead={pipelineLead} 
        leads={leads}
        selectedLeads={selectedLeads}
        stages={stages}
        isOpen={isPipelineOpen}
        onClose={() => {
          setIsPipelineOpen(false);
          setPipelineLead(null);
        }}
        onSuccess={async () => {
          await fetchData();
          setSelectedLeads(new Set());
        }} 
      />

      <Dialog open={plannerPickerOpen} onOpenChange={setPlannerPickerOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Calendar className="h-5 w-5 text-blue-600" />
              Günlük plana ekle
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedLeads.size} seçili işletmeyi seçtiğiniz güne toplu ekleyeceğiz.
            </p>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Tarih</label>
            <Input
              type="date"
              value={plannerDateStr}
              onChange={(e) => setPlannerDateStr(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPlannerPickerOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
              disabled={!plannerDateStr}
              onClick={async () => {
                const [yy, mm, dd] = plannerDateStr.split('-').map(Number)
                if (!yy || !mm || !dd) return
                const target = new Date(yy, mm - 1, dd)
                try {
                  await addLeadsToPlannerDay(Array.from(selectedLeads), target)
                  setPlannerPickerOpen(false)
                  onLeadsQueuedForPlanner(yy, mm - 1, dd)
                  await fetchData()
                } catch (err) {
                  console.error('Add to planner failed:', err)
                  alert('Plana eklenemedi. Sunucuyu kontrol edin.')
                }
              }}
            >
              Ekle ve plana git
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
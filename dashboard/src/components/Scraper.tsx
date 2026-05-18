import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Rocket, 
  MapPin, 
  Star, 
  Globe, 
  Phone, 
  ExternalLink, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Trash2, 
  Download, 
  Sparkles, 
  BarChart3, 
  PieChart as PieChartIcon 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { API_BASE_URL } from '../config';



type Lead = {
  _id: string;
  name: string;
  url?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  phone?: string;
  website?: string;
  city?: string;
  address?: string;
};

export const Scraper = ({ 
  results, 
  onBack,
  isScraping: isScrapingProp,
  onScrapeSuccess
}: { 
  results: Lead[], 
  onBack: () => void,
  isScraping: boolean,
  onScrapeSuccess: (results: Lead[]) => void
}) => {
  const [isScraping, setIsScraping] = useState(isScrapingProp);
  const [scrapeForm, setScrapeForm] = useState({ 
    city: '', 
    category: '', 
    withoutWebsite: false,
    minRating: 0,
    limit: 20
  })
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isEnriching, setIsEnriching] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [enrichmentProgress, setEnrichmentProgress] = useState(0)

  // Sync prop change
  useEffect(() => {
    setIsScraping(isScrapingProp);
    if (results.length > 0) {
      setSelectedResults(new Set(results.map(r => r._id)))
    }
  }, [isScrapingProp, results]);

  const handleScrape = async (isLoadMore = false) => {
    if (!scrapeForm.city || !scrapeForm.category) return
    
    if (isLoadMore) setIsLoadingMore(true)
    else {
      setIsScraping(true)
      setSelectedResults(new Set())
      setNextPageToken(null)
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/leads/scrape`, {
        ...scrapeForm,
        nextPageToken: isLoadMore ? nextPageToken : null
      })
      
      if (res.data.success) {
        const newLeads = res.data.leads || []
        setNextPageToken(res.data.nextPageToken || null)
        
        if (isLoadMore) {
          onScrapeSuccess([...results, ...newLeads])
        } else {
          onScrapeSuccess(newLeads)
        }
      }
    } catch (err) {
      console.error('Scrape error:', err)
    } finally {
      setIsScraping(false)
      setIsLoadingMore(false)
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedResults)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedResults(next)
  }

  const toggleSelectAll = () => {
    if (selectedResults.size === results.length) setSelectedResults(new Set())
    else setSelectedResults(new Set(results.map(r => r._id)))
  }

  const simulateEnrichment = () => {
    setIsEnriching(true)
    setEnrichmentProgress(0)
    const interval = setInterval(() => {
      setEnrichmentProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsEnriching(false)
          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  // Analytics Data
  const ratingData = [
    { range: '3-4', count: results.filter(r => (r.rating || 0) >= 3 && (r.rating || 0) < 4).length },
    { range: '4-4.5', count: results.filter(r => (r.rating || 0) >= 4 && (r.rating || 0) < 4.5).length },
    { range: '4.5-5', count: results.filter(r => (r.rating || 0) >= 4.5).length },
  ]

  const websiteData = [
    { name: 'With Website', value: results.filter(r => r.website).length },
    { name: 'No Website', value: results.filter(r => !r.website).length },
  ]

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  const filteredResults = results.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )



  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Search Header Section */}
      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border-b-4 border-blue-600">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Live Scraper</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">Powered by Google Maps API</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="City (e.g. London)" 
                  value={scrapeForm.city}
                  onChange={e => setScrapeForm({...scrapeForm, city: e.target.value})}
                  className="pl-10 h-11 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Category (e.g. Dentist)" 
                  value={scrapeForm.category}
                  onChange={e => setScrapeForm({...scrapeForm, category: e.target.value})}
                  className="pl-10 h-11 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button 
                onClick={() => handleScrape()} 
                disabled={isScraping}
                className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
              >
                {isScraping ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Launch
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                 <Globe className="h-3.5 w-3.5 text-blue-500" />
                 <span className="text-xs font-bold text-slate-600 dark:text-slate-400">No Website Only</span>
                 <Checkbox 
                   checked={scrapeForm.withoutWebsite}
                   onCheckedChange={(v) => setScrapeForm({...scrapeForm, withoutWebsite: !!v})}
                   className="ml-2"
                 />
              </div>
            </div>

            <div className="flex items-center gap-3">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min Rating:</span>
               <div className="flex items-center gap-2">
                 {[3, 3.5, 4, 4.5].map(r => (
                   <Button 
                     key={r}
                     variant="ghost"
                     size="sm"
                     onClick={() => setScrapeForm({...scrapeForm, minRating: r})}
                     className={`h-7 px-2 rounded-md text-[10px] font-bold ${scrapeForm.minRating === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                   >
                     {r}+
                   </Button>
                 ))}
               </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Limit: {scrapeForm.limit}</div>
               <Input 
                 type="range"
                 min="10"
                 max="100"
                 step="10"
                 value={scrapeForm.limit}
                 onChange={e => setScrapeForm({...scrapeForm, limit: parseInt(e.target.value)})}
                 className="w-32 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
               />
            </div>
          </div>
        </CardContent>
      </Card>

      {isScraping && (
        <div className="grid gap-6 animate-pulse">
           <Card className="border-0 shadow-lg bg-blue-50 dark:bg-blue-900/10 p-12 text-center border-dashed border-2 border-blue-200 rounded-[32px]">
             <div className="flex flex-col items-center gap-6">
                <div className="relative">
                   <div className="h-20 w-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                   <Rocket className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-2">
                   <p className="text-xl font-black text-blue-900 dark:text-blue-100">Scanning Google Maps...</p>
                   <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">Retrieving premium leads for {scrapeForm.category || 'your target'}</p>
                </div>
             </div>
           </Card>
        </div>
      )}



      {/* Analytics Section */}
      {results.length > 0 && !isScraping && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-500">
           <Card className="border-0 shadow-lg rounded-3xl bg-white dark:bg-slate-900 overflow-hidden group">
             <CardHeader className="pb-2 border-b border-slate-50 dark:border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Rating Distribution
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </CardContent>
           </Card>

           <Card className="border-0 shadow-lg rounded-3xl bg-white dark:bg-slate-900 overflow-hidden">
             <CardHeader className="pb-2 border-b border-slate-50 dark:border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-emerald-500" />
                  Website Presence
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="h-48 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={websiteData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {websiteData.map((_, index) => (

                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center">
                     <span className="text-xl font-black">{((results.filter(r => r.website).length / results.length) * 100).toFixed(0)}%</span>
                     <span className="text-[8px] uppercase font-bold text-slate-400">With Web</span>
                  </div>
                </div>
             </CardContent>
           </Card>

           <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-1">
             <CardContent className="p-6 h-full flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-bold text-lg">AI Enrichment</span>
                   </div>
                   <p className="text-sm text-indigo-100 mb-6">Found {results.length} leads. Run AI enrichment to find social media profiles and emails.</p>
                </div>
                
                {isEnriching ? (
                   <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                         <span>Enriching...</span>
                         <span>{enrichmentProgress}%</span>
                      </div>
                      <Progress value={enrichmentProgress} className="h-2 bg-white/20" />
                   </div>
                ) : (
                   <Button 
                    onClick={simulateEnrichment}
                    className="w-full bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold py-6 shadow-xl"
                   >
                     Launch AI Magic
                   </Button>
                )}
             </CardContent>
           </Card>
        </div>
      )}

      {/* Main Results Table */}
      {results.length > 0 && !isScraping && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between px-2 gap-4">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                   {selectedResults.size}
                </div>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Leads Selected</span>
             </div>

             <div className="flex flex-1 items-center gap-3 w-full md:max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search in results..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
             </div>

             <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="h-10 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-wider">
                   <Download className="h-3.5 w-3.5 mr-2" />
                   Export
                </Button>
                <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                   <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                   Save ({selectedResults.size})
                </Button>
             </div>
          </div>

          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="w-14 pl-8 py-5">
                      <Checkbox 
                        checked={selectedResults.size === results.length && results.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-md"
                      />
                    </TableHead>
                    <TableHead className="py-5 font-bold text-[10px] uppercase tracking-widest text-slate-400">Business Details</TableHead>
                    <TableHead className="py-5 font-bold text-[10px] uppercase tracking-widest text-slate-400">Reputation</TableHead>
                    <TableHead className="py-5 font-bold text-[10px] uppercase tracking-widest text-slate-400">Digital Presence</TableHead>
                    <TableHead className="pr-8 py-5 font-bold text-[10px] uppercase tracking-widest text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((lead) => (

                    <TableRow 
                      key={lead._id} 
                      className={`group transition-colors border-b border-slate-50 dark:border-slate-800/50 ${selectedResults.has(lead._id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50/50'}`}
                    >
                      <TableCell className="pl-8">
                        <Checkbox 
                          checked={selectedResults.has(lead._id)}
                          onCheckedChange={() => toggleSelect(lead._id)}
                          className="rounded-md"
                        />
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-slate-50 group-hover:text-blue-600 transition-colors">{lead.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">{lead.category}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2">
                             <MapPin className="h-3 w-3" /> {lead.address || lead.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                           <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg w-fit border border-amber-100 dark:border-amber-900/30">
                              <span className="text-xs font-black text-amber-700 dark:text-amber-500">{lead.rating || '0'}</span>
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                           </div>
                           <span className="text-[9px] font-bold text-slate-400">({lead.reviews || 0} reviews)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           {lead.website ? (
                             <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                               <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                             </div>
                           ) : (
                             <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 opacity-40">
                               <Globe className="h-4 w-4 text-slate-400" />
                             </div>
                           )}
                           {lead.phone ? (
                             <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                               <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                             </div>
                           ) : (
                             <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 opacity-40">
                               <Phone className="h-4 w-4 text-slate-400" />
                             </div>
                           )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 group-hover:scale-110 transition-transform">
                              <ExternalLink className="h-4 w-4 text-slate-400" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {nextPageToken && (
            <div className="flex justify-center pt-4">
              <Button 
                onClick={() => handleScrape(true)} 
                disabled={isLoadingMore}
                variant="outline"
                className="h-12 px-12 rounded-2xl border-2 border-blue-100 hover:border-blue-600 hover:bg-blue-50 text-blue-600 font-black transition-all active:scale-95 shadow-lg shadow-blue-500/5"
              >
                {isLoadingMore ? (
                  <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Load More Results
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}


      {results.length === 0 && !isScraping && (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200">
          <div className="flex flex-col items-center gap-4">
             <Rocket className="h-12 w-12 text-slate-200" />
             <p className="text-slate-500 font-medium">No results to display. Start a scrape from the Overview tab.</p>
             <Button variant="outline" onClick={onBack}>Go Back</Button>
          </div>
        </div>
      )}
    </div>
  );
};

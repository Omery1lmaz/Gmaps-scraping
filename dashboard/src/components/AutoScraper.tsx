import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Rocket, MapPin, Search, Trash2, CheckCircle2, List, Play, StopCircle, RefreshCw, ChevronDown, ChevronUp, RotateCcw, Globe,
  Activity, Database, BarChart3, Clock, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { API_BASE_URL } from '../config';

type Location = {
  _id: string;
  city: string;
  district: string;
  neighborhood: string;
};

type Category = {
  _id: string;
  name: string;
};

type Task = {
  _id?: string;
  id?: string; // Keep for compatibility with existing code during refactor
  city: string;
  district: string;
  neighborhood: string;
  category: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  leadsFound: number;
  message?: string;
  nextPageToken?: string;
};



export const AutoScraper = ({ onBack }: { onBack: () => void }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Hierarchical state
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [neighborhoodsList, setNeighborhoodsList] = useState<any[]>([]);
  
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string | null>(null);
  
  const [populatingCity, setPopulatingCity] = useState('');
  const [isPopulating, setIsPopulating] = useState(false);
  
  const [newCategory, setNewCategory] = useState('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [withoutWebsite, setWithoutWebsite] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [scraperStats, setScraperStats] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const shouldStopRef = useRef(false);
  const pollingIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [locs, cats, cts, tsk] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/locations`),
        axios.get(`${API_BASE_URL}/api/scrape-categories`),
        axios.get(`${API_BASE_URL}/api/cities/hierarchy`),
        axios.get(`${API_BASE_URL}/api/scrape-tasks`, { params: { page: currentPage, limit: pageSize } })
      ]);
      setLocations(locs.data);
      setCategories(cats.data);
      setCities(cts.data);
      setTasks(tsk.data.tasks);
      setTotalTasks(tsk.data.total);
      setCompletedTasks(tsk.data.completedCount || 0);
      setTotalPages(tsk.data.pages);
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    }
  };

  useEffect(() => {
    if (selectedCityId) {
      fetchDistricts(selectedCityId);
      setSelectedDistrictId(null);
      setSelectedNeighborhoodId(null);
      setNeighborhoodsList([]);
    }
  }, [selectedCityId]);

  useEffect(() => {
    if (selectedDistrictId) {
      fetchNeighborhoods(selectedDistrictId);
      setSelectedNeighborhoodId(null);
    }
  }, [selectedDistrictId]);

  const fetchDistricts = async (cityId: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/cities/${cityId}/districts`);
      setDistricts(res.data);
    } catch (err) {
      console.error('Failed to fetch districts', err);
    }
  };

  const fetchNeighborhoods = async (districtId: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/districts/${districtId}/neighborhoods`);
      setNeighborhoodsList(res.data);
    } catch (err) {
      console.error('Failed to fetch neighborhoods', err);
    }
  };

  const populateCityWithAI = async () => {
    if (!populatingCity) return;
    setIsPopulating(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/locations/populate-city-ai`, { cityName: populatingCity });
      alert(res.data.message);
      setPopulatingCity('');
      fetchInitialData();
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsPopulating(false);
    }
  };

  const addLocationFromHierarchy = async () => {
    if (!selectedCityId || !selectedDistrictId) return;
    
    const city = cities.find(c => c._id === selectedCityId)?.name;
    const district = districts.find(d => d._id === selectedDistrictId)?.name;

    try {
      if (selectedNeighborhoodId) {
        // Add single neighborhood
        const neighborhood = neighborhoodsList.find(n => n._id === selectedNeighborhoodId)?.name;
        const res = await axios.post(`${API_BASE_URL}/api/locations`, {
          city,
          district,
          neighborhood
        });
        setLocations(prev => [res.data, ...prev]);
        setSelectedNeighborhoodId(null);
      } else {
        // Add all neighborhoods in the district
        if (!confirm(`${district} ilçesine ait tüm mahalleleri (${neighborhoodsList.length} adet) eklemek istiyor musunuz?`)) return;
        
        setIsPopulating(true);
        const results = await Promise.all(neighborhoodsList.map(async (n) => {
          try {
            const res = await axios.post(`${API_BASE_URL}/api/locations`, {
              city,
              district,
              neighborhood: n.name
            });
            return res.data;
          } catch (e) {
            console.error('Failed to add neighborhood', n.name, e);
            return null;
          }
        }));
        
        const successfulOnes = results.filter(r => r !== null);
        setLocations(prev => [...successfulOnes, ...prev]);
        setIsPopulating(false);
        alert(`${successfulOnes.length} mahalle başarıyla eklendi.`);
      }
    } catch (err) {
      console.error('Failed to add location', err);
      setIsPopulating(false);
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/locations/${id}`);
      setLocations(locations.filter(l => l._id !== id));
    } catch (err) {
      console.error('Failed to delete location', err);
    }
  };

  const addCategory = async () => {
    if (!newCategory) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/scrape-categories`, { name: newCategory });
      setCategories([res.data, ...categories]);
      setNewCategory('');
    } catch (err) {
      console.error('Failed to add category', err);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/scrape-categories/${id}`);
      setCategories(categories.filter(c => c._id !== id));
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  const generateTasks = async () => {
    const taskData: any[] = [];
    locations.forEach(loc => {
      categories.forEach(cat => {
        taskData.push({
          city: loc.city,
          district: loc.district,
          neighborhood: loc.neighborhood,
          category: cat.name,
          status: 'PENDING',
          leadsFound: 0
        });
      });
    });

    try {
      await axios.post(`${API_BASE_URL}/api/scrape-tasks/bulk`, { tasks: taskData });
      fetchTasks(1);
      shouldStopRef.current = false;
    } catch (err) {
      console.error('Failed to generate tasks', err);
    }
  };

  const clearCompletedTasks = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/scrape-tasks/completed`);
      fetchTasks(1);
    } catch (err) {
      console.error('Failed to clear completed tasks', err);
    }
  };

  const clearAllTasks = async () => {
    if (!confirm('Are you sure you want to clear the entire queue?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/scrape-tasks/all`);
      setTasks([]);
      setTotalTasks(0);
      setTotalPages(0);
    } catch (err) {
      console.error('Failed to clear all tasks', err);
    }
  };

  const resetTasks = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/scrape-tasks/reset`);
      fetchTasks(currentPage);
    } catch (err) {
      console.error('Failed to reset tasks', err);
    }
  };



  const toggleTaskSelection = (id: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTasks(newSelected);
  };

  const toggleSelectAllTasks = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t._id as string)));
    }
  };

  const deleteLeadsOfSelectedTasks = async () => {
    if (selectedTasks.size === 0) return;

    
    if (!confirm(`Are you sure you want to delete the ${selectedTasks.size} selected searches and any leads they found? This will remove everything from the database permanently.`)) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/leads/delete-by-tasks`, { taskIds: Array.from(selectedTasks) });
      fetchTasks(currentPage);
      setSelectedTasks(new Set());
    } catch (err) {
      console.error('Failed to delete data & searches', err);
    }
  };

  useEffect(() => {
    fetchTasks(currentPage);
  }, [currentPage]);

  const fetchTasks = async (page: number) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/scrape-tasks`, { params: { page, limit: pageSize } });
      setTasks(res.data.tasks);
      setTotalTasks(res.data.total);
      setCompletedTasks(res.data.completedCount || 0);
      setTotalPages(res.data.pages);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };



  useEffect(() => {
    // Initial fetch
    fetchScraperStatus();
    
    // Polling for stats and status
    pollingIntervalRef.current = setInterval(() => {
      fetchScraperStatus();
      if (currentPage === 1) fetchTasks(1); // Auto refresh first page
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [currentPage]);

  const fetchScraperStatus = async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/scraper/status`),
        axios.get(`${API_BASE_URL}/api/scraper/stats`)
      ]);
      setIsRunning(statusRes.data.isRunning);
      setScraperStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch scraper status/stats', err);
    }
  };

  const startAutoScrape = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/scraper/start`, { withoutWebsite, useAI });
      setIsRunning(true);
    } catch (err) {
      console.error('Failed to start scraper', err);
    }
  };

  const suggestNiches = async () => {
    setIsSuggesting(true);
    try {
      const currentNiches = categories.map(c => c.name);
      const city = cities.find(c => c._id === selectedCityId)?.name || 'İstanbul';
      const res = await axios.post(`${API_BASE_URL}/api/ai/suggest-niches`, { currentNiches, city });
      setAiSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error('Failed to suggest niches', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const addAiNiche = async (name: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/scrape-categories`, { name });
      setCategories([res.data, ...categories]);
      setAiSuggestions(prev => prev.filter(s => s.name !== name));
    } catch (err) {
      console.error('Failed to add AI niche', err);
    }
  };

  const stopAutoScrape = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/scraper/stop`);
      setIsRunning(false);
    } catch (err) {
      console.error('Failed to stop scraper', err);
    }
  };



  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Leads" 
          value={scraperStats?.totalLeads || 0} 
          icon={<Database className="h-5 w-5 text-blue-500" />}
          color="blue"
        />
        <StatCard 
          title="Queue Progress" 
          value={`${scraperStats?.tasks.completed || 0} / ${scraperStats?.tasks.total || 0}`} 
          icon={<Activity className="h-5 w-5 text-emerald-500" />}
          subValue={scraperStats?.tasks.total > 0 ? `${Math.round((scraperStats.tasks.completed / scraperStats.tasks.total) * 100)}% Complete` : '0%'}
          color="emerald"
        />
        <StatCard 
          title="Active / Pending" 
          value={`${scraperStats?.tasks.running || 0} / ${scraperStats?.tasks.pending || 0}`} 
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          subValue="Tasks waiting"
          color="amber"
        />
        <StatCard 
          title="Avg Efficiency" 
          value={scraperStats?.tasks.avgLeads || 0} 
          icon={<BarChart3 className="h-5 w-5 text-indigo-500" />}
          subValue="Leads per search"
          color="indigo"
        />
      </div>

      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border-b-4 border-emerald-600">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100">
                <Rocket className="h-5 w-5 rotate-180" />
              </Button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Auto Scraper</h2>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Automated Bulk Extraction</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={generateTasks} 
                variant="outline"
                className="h-11 px-6 rounded-xl font-bold shadow-sm transition-all"
                disabled={locations.length === 0 || categories.length === 0 || isRunning}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Queue
              </Button>
              <Button 
                onClick={resetTasks} 
                variant="ghost"
                className="h-11 px-4 rounded-xl font-bold text-amber-600 hover:text-amber-700 transition-all"
                disabled={isRunning || tasks.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Stuck
              </Button>
              <Button 
                onClick={clearCompletedTasks} 
                variant="ghost"
                className="h-11 px-4 rounded-xl font-bold text-slate-500 hover:text-emerald-600 transition-all"
                disabled={isRunning || !tasks.some(t => t.status === 'COMPLETED')}
              >
                Clear Done
              </Button>
              <Button 
                onClick={clearAllTasks} 
                variant="ghost"
                className="h-11 px-4 rounded-xl font-bold text-slate-500 hover:text-red-600 transition-all"
                disabled={isRunning || tasks.length === 0}
              >
                Clear All
              </Button>
              {!isRunning ? (
                <Button 
                  onClick={startAutoScrape} 
                  className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all"
                  disabled={tasks.filter(t => t.status !== 'COMPLETED').length === 0}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Auto Scrape
                </Button>
              ) : (
                <Button 
                  onClick={stopAutoScrape} 
                  className="h-11 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/25 transition-all"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Sequence
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
            <div className="flex-1 flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Globe className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Websitesiz Olanları Al</div>
                  <div className="text-[10px] text-slate-500">Sadece web sitesi bulunmayan işletmeleri toplar</div>
                </div>
              </div>
              <Checkbox 
                checked={withoutWebsite}
                onCheckedChange={(checked) => setWithoutWebsite(!!checked)}
                className="h-5 w-5 rounded-md"
              />
            </div>

            <Separator orientation="vertical" className="hidden md:block h-8 bg-blue-200 dark:bg-blue-800" />

            <div className="flex-1 flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Analizini Etkinleştir</div>
                  <div className="text-[10px] text-slate-500">Her işletmeyi AI ile puanlar ve analiz eder</div>
                </div>
              </div>
              <Checkbox 
                checked={useAI}
                onCheckedChange={(checked) => setUseAI(!!checked)}
                className="h-5 w-5 rounded-md border-purple-400 data-[state=checked]:bg-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Locations Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Target Locations
                </h3>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 rounded-md font-bold">
                  {locations.length} Locations
                </Badge>
              </div>

              {/* AI Auto Populate */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-3">
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Rocket className="h-3 w-3" />
                  Şehri AI ile Otomatik Doldur
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Şehir adı (örn: Ankara)" 
                    value={populatingCity}
                    onChange={e => setPopulatingCity(e.target.value)}
                    className="h-10 rounded-xl bg-white dark:bg-slate-900"
                  />
                  <Button 
                    onClick={populateCityWithAI} 
                    disabled={isPopulating || !populatingCity}
                    className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isPopulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Ekle'}
                  </Button>
                </div>
                <p className="text-[9px] text-emerald-600/70 font-medium italic">
                  * Seçtiğiniz şehre ait tüm ilçe ve mahalleler otomatik olarak sisteme eklenir.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  <Select 
                    value={selectedCityId} 
                    onValueChange={setSelectedCityId}
                  >
                    <SelectTrigger className="rounded-xl h-10 w-full">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={selectedDistrictId} 
                    onValueChange={setSelectedDistrictId}
                    disabled={!selectedCityId}
                  >
                    <SelectTrigger className="rounded-xl h-10 w-full">
                      <SelectValue placeholder="District" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={selectedNeighborhoodId} 
                    onValueChange={setSelectedNeighborhoodId}
                    disabled={!selectedDistrictId}
                  >
                    <SelectTrigger className="rounded-xl h-10 w-full">
                      <SelectValue placeholder="Neighborhood (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {neighborhoodsList.map(n => <SelectItem key={n._id} value={n._id}>{n.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={addLocationFromHierarchy} 
                  className="rounded-xl w-full bg-slate-900 hover:bg-slate-800" 
                  disabled={!selectedDistrictId || isPopulating}
                >
                  {isPopulating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  {selectedNeighborhoodId ? 'Add Selected Neighborhood' : 'Add ALL Neighborhoods in District'}
                </Button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-800 p-2 space-y-2">
                {locations.length === 0 && <div className="text-xs text-center text-slate-400 py-4">No locations added</div>}
                {locations.map(loc => (
                  <div key={loc._id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-bold text-slate-700">{loc.city} / {loc.district} / {loc.neighborhood}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => deleteLocation(loc._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-500" />
                Target Categories
              </h3>
              <div className="flex gap-2">
                <Input 
                  placeholder="Category (e.g. Restaurants)" 
                  value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  className="rounded-xl"
                />
                <Button onClick={addCategory} className="rounded-xl shrink-0 bg-blue-600 hover:bg-blue-700">Add</Button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-800 p-2 space-y-2">
                {categories.length === 0 && <div className="text-xs text-center text-slate-400 py-4">No categories added</div>}
                {categories.map(cat => (
                  <div key={cat._id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => deleteCategory(cat._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Niche Suggester */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-purple-500" />
                  AI Niche Suggester
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={suggestNiches}
                  disabled={isSuggesting}
                  className="h-7 text-[10px] font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg px-3"
                >
                  {isSuggesting ? <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> : <Search className="h-3 w-3 mr-1.5" />}
                  Generate Ideas
                </Button>
              </div>
              
              <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30 p-4 min-h-[200px] flex flex-col items-center justify-center">
                {aiSuggestions.length === 0 ? (
                  <div className="text-center space-y-2">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">No suggestions yet</div>
                    <p className="text-[11px] text-slate-500 max-w-[200px]">Click generate to find high-potential niches in your city</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 w-full">
                    {aiSuggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 px-3 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm animate-in fade-in slide-in-from-right-2" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-900">{s.name}</span>
                          <span className="text-[9px] text-slate-500 line-clamp-1">{s.reason}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => addAiNiche(s.name)}
                          className="h-7 w-7 rounded-full text-purple-600 hover:bg-purple-50"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue View */}
      {tasks.length > 0 && (
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-3">
                <Checkbox 
                  checked={selectedTasks.size > 0 && selectedTasks.size === tasks.length}
                  onCheckedChange={toggleSelectAllTasks}
                  className="rounded-md border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 shadow-sm"
                />
                <List className="h-4 w-4 text-indigo-500" />
                Scraping Queue ({completedTasks} / {totalTasks})
                
                {!isRunning && (totalTasks - completedTasks) > 0 && (
                  <Button 
                    onClick={startAutoScrape} 
                    size="sm"
                    className="ml-4 h-7 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-500/20 border-0 transition-all animate-in fade-in slide-in-from-left-2"
                  >
                    <Play className="h-3 w-3 mr-1.5 fill-current" />
                    Resume Queue
                  </Button>
                )}
              </CardTitle>
              
              {selectedTasks.size > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                    {selectedTasks.size} Selected
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <Button 
                      onClick={deleteLeadsOfSelectedTasks} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-white dark:hover:bg-slate-900 font-bold text-[10px] uppercase tracking-widest px-3"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete Search & Data
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {tasks.map(task => (
                <TaskItem 
                  key={task._id} 
                  task={task} 
                  isSelected={selectedTasks.has(task._id as string)}
                  onToggle={() => toggleTaskSelection(task._id as string)}
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Showing <span className="text-slate-900 dark:text-slate-100">{tasks.length}</span> of <span className="text-slate-900 dark:text-slate-100">{totalTasks}</span> Tasks
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      // Logic to show a window of pages
                      let pageNum = currentPage - 2 + i;
                      if (currentPage <= 3) pageNum = i + 1;
                      if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-9 w-9 rounded-xl font-bold text-[10px] ${currentPage === pageNum ? 'bg-indigo-600 shadow-md shadow-indigo-500/20' : ''}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, subValue, color }: any) => {
  const colorMap: any = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600', sub: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600', sub: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600', sub: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600', sub: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' }
  };
  
  const colors = colorMap[color] || colorMap.blue;

  return (
    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-2xl ${colors.bg}`}>
            {icon}
          </div>
          {subValue && (
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${colors.sub}`}>
              {subValue}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{value}</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const TaskItem = ({ 
  task, 
  isSelected, 
  onToggle 
}: { 
  task: Task, 
  isSelected: boolean, 
  onToggle: () => void 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeads = async () => {
    if (isExpanded) return; // Only fetch when expanding
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/leads`, {
        params: {
          city: task.city,
          district: task.district,
          neighborhood: task.neighborhood,
          category: task.category,
          limit: 100
        }
      });
      setLeads(res.data.leads || res.data);
    } catch (err) {
      console.error('Failed to fetch leads for task', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/leads/${id}`);
      setLeads(prev => prev.filter(l => l._id !== id));
    } catch (err) {
      console.error('Failed to delete lead', err);
    }
  };

  const deleteAllLeadsForTask = async () => {
    if (leads.length === 0) {
      // If no leads, just delete the task
      if (!confirm('Are you sure you want to delete this task?')) return;
      try {
        await axios.post(`${API_BASE_URL}/api/scrape-tasks/delete-bulk`, { ids: [task._id] });
        onToggle(); // Deselect if selected
        // We need a way to refresh the parent list. 
        // In a real app we'd use a context or callback.
        // For now, it will disappear on next refresh or we can trigger a refresh if we had access.
        window.location.reload(); // Quick fix for child-to-parent sync
      } catch (err) {
        console.error('Failed to delete task', err);
      }
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${leads.length} leads and this search task?`)) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/leads/delete-by-tasks`, { taskIds: [task._id] });
      window.location.reload(); // Quick fix to refresh the list
    } catch (err) {
      console.error('Failed to delete leads and task', err);
    }
  };

  return (
    <div className="border-b border-slate-50 dark:border-slate-800/50 last:border-b-0">
      <div 
        className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
        onClick={() => {
          if (!isExpanded) fetchLeads();
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center gap-4">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 shadow-sm"
          />
          
          {task.status === 'PENDING' && <div className="h-3 w-3 rounded-full bg-slate-200" />}
          {task.status === 'RUNNING' && <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />}
          {task.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {task.status === 'ERROR' && <div className="h-3 w-3 rounded-full bg-red-500" />}
          
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{task.category} in {task.district} {task.neighborhood}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">{task.city}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              {task.leadsFound} Leads
            </span>
            {task.message && (
              <span className="text-[10px] text-slate-500 mt-1">{task.message}</span>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-300" /> : <ChevronDown className="h-4 w-4 text-slate-300" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-12 pb-6 pt-2 bg-slate-50/30 dark:bg-slate-900/30 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Found Leads Preview
            </h4>
            {leads.length > 0 && !loading && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={deleteAllLeadsForTask}
                className="h-7 px-3 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-[9px] uppercase tracking-widest"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                Clear All {leads.length}
              </Button>
            )}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
            {loading ? (
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse py-4 text-center">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest py-4 text-center">No leads found in database for this criteria</div>
            ) : (
              leads.map((l: any) => (
                <div key={l._id} className="group flex items-center justify-between text-[11px] py-2 border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-all">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {l.name}
                      {l.aiAnalysis && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          l.aiAnalysis.potential === 'GOLDEN' ? 'bg-amber-100 text-amber-600' :
                          l.aiAnalysis.potential === 'HIGH' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {l.aiAnalysis.potential} {l.aiAnalysis.score}%
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">{l.phone || 'No phone'}</span>
                    {l.aiAnalysis && <span className="text-[8px] text-indigo-500 font-bold mt-0.5 italic">{l.aiAnalysis.reasoning}</span>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteLead(l._id)}
                    className="h-7 w-7 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 p-0 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

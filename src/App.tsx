import { useState, useEffect } from 'react'
import type { ScraperStatus, DetailLogEntry } from './types'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Progress } from './components/ui/progress'
import { ScrollArea } from './components/ui/scroll-area'
import { Switch } from './components/ui/switch'
import {
  Play, 
  Pause, 
  Square, 
  Download, 
  Trash2, 
  CloudSync, 
  Settings2, 
  Building2, 
  Phone, 
  Globe, 
  MapPin, 
  Clock, 
  Info,
  X,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react'
const fieldMeta: Record<string, { icon: any; label: string; color: string }> = {
  phone: { icon: Phone, label: 'Tel', color: 'text-green-600 bg-green-50' },
  website: { icon: Globe, label: 'Web', color: 'text-blue-600 bg-blue-50' },
  address: { icon: MapPin, label: 'Adres', color: 'text-orange-600 bg-orange-50' },
  hours: { icon: Clock, label: 'Saat', color: 'text-purple-600 bg-purple-50' },
  open_now: { icon: Info, label: 'Açık', color: 'text-emerald-600 bg-emerald-50' },
}

function FieldBadge({ field }: { field: string }) {
  const meta = fieldMeta[field]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${meta.color}`} title={meta.label}>
      <Icon className="size-2.5" /> {meta.label}
    </span>
  )
}

function DetailLogRow({ entry }: { entry: DetailLogEntry }) {
  const time = new Date(entry.timestamp)
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
      <div className={`mt-0.5 shrink-0 ${entry.success ? 'text-green-500' : 'text-red-500'}`}>
        {entry.success ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">{entry.businessName}</div>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {entry.fields.length > 0
            ? entry.fields.map(f => <FieldBadge key={f} field={f} />)
            : <span className="text-[10px] text-muted-foreground italic">Veri bulunamadı</span>
          }
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timeStr}</span>
    </div>
  )
}

function App() {
  const [status, setStatus] = useState<ScraperStatus>({
    state: 'idle',
    leadsCount: 0,
    pageIndex: 0,
    lastLeads: [],
    activity: 'Başlatılmaya hazır'
  })
  const [scrapeDetails, setScrapeDetails] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [defaultCategory, setDefaultCategory] = useState('Halı Yıkama')
  const [defaultCity, setDefaultCity] = useState('Antalya')
  const [defaultCountry] = useState('Türkiye')

  const categories = [
    'Halı Yıkama', 'Temizlik', 'Emlak', 'Dişçi', 'Restoran', 
    'Oto Servis', 'Spor Salonu', 'Hukuk Bürosu', 'Kuaför', 
    'Nakliye', 'Sigorta', 'Eczane', 'Mimarlık', 'Diğer'
  ]

  const cities = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 
    'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 
    'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 
    'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 
    'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 
    'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 
    'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 
    'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
  ]
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [email, setEmail] = useState('omery020040@gmail.com')
  const [password, setPassword] = useState('Ommers07.')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
      setAuthUser(response?.user || null)
      setAuthLoading(false)
    })

    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response: ScraperStatus) => {
      if (response) {
        setStatus(response)
      }
    })

    const listener = (message: any) => {
      if (message.type === 'STATUS_UPDATED') {
        const newStatus = message.payload as ScraperStatus
        setStatus(newStatus)
        // Reset dismissed error ONLY if a NEW error message arrives
        if (newStatus.error && newStatus.error !== status.error) {
          setDismissedError(null)
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [status.error])

  const login = () => {
    setAuthError('')
    setAuthLoading(true)
    chrome.runtime.sendMessage({ type: 'AUTH_LOGIN', email, password }, (response) => {
      setAuthLoading(false)
      if (response?.success) {
        setAuthUser(response.user)
        setPassword('')
      } else {
        setAuthError(response?.error || 'Giriş başarısız')
      }
    })
  }

  const logout = () => {
    chrome.runtime.sendMessage({ type: 'AUTH_LOGOUT' }, () => {
      setAuthUser(null)
      setEmail('')
      setPassword('')
    })
  }

  const startScraping = () => {
    setDismissedError(null)
    chrome.runtime.sendMessage({
      type: 'START_SCRAPING',
      settings: { 
        scrapeDetails, 
        searchKeyword: searchKeyword.trim(),
        defaultCategory: defaultCategory.trim(),
        defaultCity: defaultCity.trim(),
        defaultCountry: defaultCountry.trim()
      }
    })
  }
  const stopScraping = () => chrome.runtime.sendMessage({ type: 'STOP_SCRAPING' })

  const pauseScraping = () => chrome.runtime.sendMessage({ type: 'PAUSE_SCRAPING' })
  const resumeScraping = () => chrome.runtime.sendMessage({ type: 'RESUME_SCRAPING' })

  const downloadLeads = () => {
    chrome.storage.local.get(['leads'], (result: { [key: string]: any }) => {
      const leads = result.leads || []
      const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gmaps_leads_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
    })
  }

  const clearLeads = () => {
    if (confirm('Tüm toplanan verileri silmek istediğinize emin misiniz?')) {
      chrome.storage.local.set({ leads: [] }, () => {
        setStatus(prev => ({ ...prev, leadsCount: 0, lastLeads: [], activity: 'Veriler temizlendi' }))
      })
    }
  }

  const syncLocalData = () => {
    setStatus(prev => ({ ...prev, activity: 'Bulut ile senkronize ediliyor...' }))
    chrome.runtime.sendMessage({ type: 'SYNC_LOCAL_DATA' }, (response) => {
      if (response?.success) {
        alert(`Bulut Senkronizasyonu Tamamlandı!\nEklenen: ${response.saved}\nAtlanan (Kopyalar): ${response.duplicates}`)
      } else {
        const errorMsg = response?.error || 'Senkronizasyon başarısız. Sunucu çalışıyor mu?';
        alert(`Senkronizasyon Başarısız!\nSebep: ${errorMsg}`);
      }
    })
  }

  const isScraping = status.state === 'scraping'
  const isPaused = status.state === 'paused'
  const dp = status.detailProgress
  const cd = status.currentDetail

  const getStatusInfo = (state: string) => {
    switch (state) {
      case 'scraping': return { label: 'TARIYOR', color: 'bg-blue-500 text-white' }
      case 'paused': return { label: 'DURAKLATILDI', color: 'bg-amber-500 text-white' }
      case 'completed': return { label: 'TAMAMLANDI', color: 'bg-green-500 text-white' }
      case 'failed': return { label: 'HATA', color: 'bg-red-500 text-white' }
      default: return { label: 'BOŞTA', color: 'bg-slate-200 text-slate-700' }
    }
  }

  const statusInfo = getStatusInfo(status.state)

  if (authLoading && !authUser) {
    return (
      <div className="w-[400px] h-[600px] flex items-center justify-center bg-[#F8FAFC] text-sm font-bold text-slate-500">
        Yükleniyor...
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="w-[400px] h-[600px] flex flex-col bg-[var(--bg)] text-[var(--text)] font-sans p-5">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="bg-[var(--primary)] p-2 rounded-xl shadow-sm">
            <MessageSquare className="size-5 text-[var(--bg)] fill-[var(--bg)]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-[var(--text)]">LeadFlow PRO</h1>
            <p className="text-xs font-semibold text-[var(--text-muted)]">Senkronizasyon için giriş yapın</p>
          </div>
        </div>
        <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta"
            type="email"
            className="w-full h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            type="password"
            className="w-full h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]"
            onKeyDown={(e) => { if (e.key === 'Enter') login() }}
          />
          {authError && <div className="rounded-xl bg-[#fee2e2] px-3 py-2 text-xs font-bold text-[var(--danger)]">{authError}</div>}
          <Button onClick={login} disabled={authLoading || !email || !password} className="w-full h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-black gap-2">
            <LogIn className="size-4" /> Giriş Yap
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-[var(--primary-light)]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-[var(--card)] border-b border-[var(--border)] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5">
          <div className="bg-[var(--primary)] p-1.5 rounded-lg shadow-sm">
            <MessageSquare className="size-5 text-[var(--bg)] fill-[var(--bg)]" />
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-[var(--text)]">LeadFlow <span className="text-[var(--primary)] text-[10px] font-medium align-top ml-1">PRO</span></h1>
          {authUser && (
            <span 
              onClick={() => chrome.tabs.create({ url: 'http://localhost:5173/billing' })}
              className={`cursor-pointer px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                authUser.plan === 'pro'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : authUser.plan === 'enterprise'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-600'
              }`}
              title="Aboneliği Yönet"
            >
              {authUser.plan === 'pro' ? 'PRO' : authUser.plan === 'enterprise' ? 'ENT' : 'FREE'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={logout} className="text-slate-400 hover:text-red-500" title={`${authUser.email} çıkış`}>
            <LogOut className="size-4" />
          </button>
          {isScraping && !isPaused && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
          <Badge className={`${statusInfo.color} border-none font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm`}>
            {statusInfo.label}
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-5 space-y-4">
        {/* Upgrade Banner for Free Users */}
        {(!authUser.plan || authUser.plan === 'free') && (
          <div 
            onClick={() => chrome.tabs.create({ url: 'http://localhost:5173/billing' })}
            className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl shadow-sm flex items-center justify-between cursor-pointer group transition-all duration-300 active:scale-[0.98] animate-in fade-in slide-in-from-top-1"
          >
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 p-1.5 rounded-lg text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                <Zap size={13} className="fill-current animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                  Limitleri Kaldırın & PRO'ya Geçin
                  <Sparkles size={10} className="text-emerald-500" />
                </div>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5 leading-tight">Oturum başı 20 lead sınırını kaldırın ve WhatsApp otomasyonunu açın.</p>
              </div>
            </div>
            <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>
        )}

        {/* Search Keyword Input */}
        {!isScraping && status.state !== 'completed' && (
          <div className="space-y-2 p-4 bg-white rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-[var(--primary)]">
              <Sparkles className="size-4" />
              <span className="text-[11px] font-black uppercase tracking-wider">Akıllı Arama</span>
            </div>
            <div className="relative">
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Örn: Halı Yıkama Antalya..."
                className="w-full h-11 rounded-xl border border-slate-200 px-4 pl-10 text-sm font-bold outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all placeholder:text-slate-300"
              />
              <Play className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
            </div>
            <p className="text-[10px] text-slate-400 font-semibold leading-tight ml-1">
              Google Maps üzerinde otomatik arama yapmak için kelime girin.
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 className="size-12" />
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bulunan Kayıt</div>
              <div className="text-3xl font-black text-slate-800 tabular-nums">{status.leadsCount}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <Settings2 className="size-12" />
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Durum</div>
              <div className="text-sm font-bold text-slate-700 mt-2 truncate">{status.activity || 'Bekliyor...'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Section */}
        {(dp || isScraping) && (
          <div className="space-y-3">
            {dp && dp.total > 0 && (
              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-50 p-1 rounded-md text-blue-600">
                      <Settings2 className="size-3.5" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Detay Tarama</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={stopScraping}
                      className="bg-red-50 text-red-500 hover:bg-red-100 p-1 rounded-md transition-colors"
                      title="Taramayı Durdur"
                    >
                      <X className="size-3.5" />
                    </button>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full tabular-nums">
                      {dp.current} / {dp.total}
                    </span>
                  </div>
                </div>
                <Progress value={(dp.current / dp.total) * 100} className="h-2 bg-slate-100" />
              </div>
            )}

            {cd && (
              <div className="bg-blue-600 p-4 rounded-xl shadow-md text-white space-y-3 transform transition-all animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between opacity-80">
                  <span className="text-[10px] font-black uppercase tracking-widest">Şu An İşleniyor</span>
                  <span className="text-[10px] font-bold tabular-nums">{cd.index}/{cd.total}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Building2 className="size-5" />
                  </div>
                  <span className="text-sm font-bold truncate flex-1 leading-tight">{cd.name}</span>
                </div>
                {cd.currentFields && cd.currentFields.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/10">
                    {cd.currentFields.map(f => {
                      const meta = fieldMeta[f]
                      if (!meta) return null
                      const Icon = meta.icon
                      return (
                        <div key={f} className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded text-[10px] font-bold">
                          <Icon className="size-2.5" /> {meta.label}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Detail Log */}
        {status.detailLog && status.detailLog.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Son İşlemler</h3>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-2">
                <ScrollArea className="h-[120px]">
                  <div className="space-y-1">
                    {[...status.detailLog].reverse().map((entry, i) => (
                      <DetailLogRow key={`${entry.timestamp}-${i}`} entry={entry} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Varsayılan Kayıt Değerleri */}
        {!isScraping  && (
          <div className="flex flex-col gap-3.5 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-indigo-600">
              <Building2 className="size-4" />
              <span className="text-[11px] font-black uppercase tracking-wider">Varsayılan Kayıt Değerleri</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500">Kategori (Kayıt İçin)</span>
                <select
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-semibold"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500">Şehir (Kayıt İçin)</span>
                  <select
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-semibold"
                  >
                    {cities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500">Ülke (Kayıt İçin)</span>
                  <select
                    disabled
                    className="w-full h-9 px-3 text-xs bg-slate-100 border border-slate-200 rounded-lg outline-none font-semibold cursor-not-allowed"
                  >
                    <option value="Türkiye">Türkiye</option>
                  </select>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-semibold leading-tight">
              Taranan bilgiler bu varsayılan değerlerle sisteme kaydedilir.
            </p>
          </div>
        )}
        {!isScraping && status.state !== 'completed' && (
          <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 p-2 rounded-lg text-slate-600">
                <Info className="size-5" />
              </div>
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-slate-700">Detaylı Bilgiler</label>
                <p className="text-[11px] text-slate-400 font-medium">Telefon, web sitesi, saatler</p>
              </div>
            </div>
            <Switch
              checked={scrapeDetails}
              onCheckedChange={(checked) => setScrapeDetails(checked)}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        )}

        {/* Recent Activity / Leads List */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
            {isScraping ? 'Canlı Veri Akışı' : 'Son Bulunanlar'}
          </h3>
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-2">
              <ScrollArea className={status.detailLog && status.detailLog.length > 0 ? "h-[140px]" : "h-[220px]"}>
                {status.lastLeads && status.lastLeads.length > 0 ? (
                  <div className="space-y-1.5 p-1">
                    {status.lastLeads.map((lead, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-500 shrink-0">
                          <Building2 className="size-4" />
                        </div>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{lead.name}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-50 rounded-md">
                              {lead.category || 'İşletme'}
                            </span>
                            {lead.phone && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                                <Phone className="size-2.5" /> {lead.phone}
                              </span>
                            )}
                            {lead.isOpenNow !== undefined && (
                              <span className={`flex items-center gap-1 text-[10px] font-bold ${lead.isOpenNow ? 'text-emerald-600' : 'text-red-500'}`}>
                                <div className={`size-1.5 rounded-full ${lead.isOpenNow ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                {lead.isOpenNow ? 'Açık' : 'Kapalı'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-slate-300 gap-3">
                    <div className="bg-slate-50 p-4 rounded-full">
                      <Building2 className="size-8" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest">{isScraping ? 'Veriler aranıyor...' : 'Henüz veri yok'}</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="bg-white border-t border-slate-200 p-5 space-y-4 shrink-0 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
        <div className="space-y-3">
          {!isScraping && status.state !== 'completed' ? (
            <Button onClick={startScraping} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]">
              <Play className="size-4 mr-2 fill-current" /> Taramayı Başlat
            </Button>
          ) : (
            <div className="space-y-3">
              {isScraping && (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={isPaused ? resumeScraping : pauseScraping} 
                    variant="outline" 
                    className={`h-12 rounded-xl font-bold border-2 ${isPaused ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {isPaused ? <><Play className="size-4 mr-2 fill-current" /> Devam Et</> : <><Pause className="size-4 mr-2 fill-current" /> Duraklat</>}
                  </Button>
                  <Button 
                    onClick={stopScraping} 
                    variant="destructive" 
                    className="h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-100"
                  >
                    <Square className="size-4 mr-2 fill-current" /> Durdur
                  </Button>
                </div>
              )}
              {status.state === 'completed' && (
                <Button onClick={startScraping} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-green-100">
                  <Zap className="size-4 mr-2 fill-current" /> Yeni Tarama Başlat
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Secondary actions */}
        <div className="flex gap-2.5">
          <Button 
            onClick={syncLocalData} 
            disabled={status.leadsCount === 0 || isScraping} 
            variant="outline" 
            size="sm" 
            className="flex-1 h-10 rounded-lg border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <CloudSync className="size-3.5 mr-1.5" /> Senkronize
          </Button>
          <Button 
            onClick={downloadLeads} 
            disabled={status.leadsCount === 0 || isScraping} 
            variant="outline" 
            size="sm" 
            className="flex-1 h-10 rounded-lg border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <Download className="size-3.5 mr-1.5" /> Dışa Aktar
          </Button>
          <Button 
            onClick={clearLeads} 
            disabled={isScraping} 
            variant="ghost" 
            size="sm" 
            className="h-10 px-3 rounded-lg font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </footer>

      {/* Improved Error Notification */}
      {status.error && dismissedError !== status.error && (
        <div className="fixed bottom-6 left-6 right-6 bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-1.5 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="size-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs font-black uppercase tracking-widest opacity-80">Hata Saptandı</div>
                <p className="text-[13px] font-bold leading-tight">{status.error}</p>
              </div>
              <button 
                onClick={() => setDismissedError(status.error || null)}
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            {(status.error.includes("limit") || status.error.includes("yükseltin") || status.error.includes("PRO") || status.error.includes("Limit")) && (
              <button
                onClick={() => {
                  chrome.tabs.create({ url: 'http://localhost:5173/billing' });
                  setDismissedError(status.error || null);
                }}
                className="w-full bg-white hover:bg-slate-100 text-red-700 text-xs font-black uppercase tracking-widest py-2 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-black/10"
              >
                HEMEN PRO'YA YÜKSELT 🚀
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App

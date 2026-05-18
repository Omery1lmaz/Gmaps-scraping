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
  Zap,
  CheckCircle2,
  AlertCircle
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
  const [customCategory, setCustomCategory] = useState('')
  const [dismissedError, setDismissedError] = useState<string | null>(null)

  useEffect(() => {
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

  const startScraping = () => {
    setDismissedError(null)
    chrome.runtime.sendMessage({
      type: 'START_SCRAPING',
      settings: { scrapeDetails, customCategory: customCategory.trim() }
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
        alert('Senkronizasyon başarısız. Sunucu çalışıyor mu?')
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

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
            <Zap className="size-5 text-white fill-white" />
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-slate-800">LeadScraper <span className="text-blue-600 text-[10px] font-medium align-top ml-1">PRO</span></h1>
        </div>
        <div className="flex items-center gap-2">
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
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full tabular-nums">
                    {dp.current} / {dp.total}
                  </span>
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

        {/* Custom Category Input */}
        {!isScraping && status.state !== 'completed' && (
          <div className="flex flex-col gap-2 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Özel Kategori (İsteğe Bağlı)</span>
            </div>
            <input
              type="text"
              placeholder="Örn: Restoran, Yazılım Firması"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-semibold"
            />
            <p className="text-[10px] text-slate-400 font-medium">Boş bırakılırsa Google Haritalar'daki orijinal kategori kaydedilir.</p>
          </div>
        )}

        {/* Detailed Info Toggle */}
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
        </div>
      )}
    </div>
  )
}

export default App
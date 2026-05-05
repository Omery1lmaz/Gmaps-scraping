import { useState, useEffect } from 'react'
import type { ScraperStatus } from './types'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Progress } from './components/ui/progress'
import { ScrollArea } from './components/ui/scroll-area'
import { Switch } from './components/ui/switch'

function App() {
  const [status, setStatus] = useState<ScraperStatus>({
    state: 'idle',
    leadsCount: 0,
    pageIndex: 0,
    lastLeads: [],
    activity: 'Ready to start'
  })
  const [scrapeDetails, setScrapeDetails] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response: ScraperStatus) => {
      if (response) setStatus(response)
    })

    const listener = (message: any) => {
      if (message.type === 'STATUS_UPDATED') {
        setStatus(message.payload)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const startScraping = () => chrome.runtime.sendMessage({
    type: 'START_SCRAPING',
    settings: { scrapeDetails }
  })
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
    if (confirm('Are you sure you want to clear all collected data?')) {
      chrome.storage.local.set({ leads: [] }, () => {
        setStatus(prev => ({ ...prev, leadsCount: 0, lastLeads: [], activity: 'Data cleared' }))
      })
    }
  }

  const syncLocalData = () => {
    setStatus(prev => ({ ...prev, activity: 'Syncing with cloud...' }))
    chrome.runtime.sendMessage({ type: 'SYNC_LOCAL_DATA' }, (response) => {
      if (response?.success) {
        alert(`Cloud Sync Complete!\nAdded: ${response.saved}\nDuplicates Skipped: ${response.duplicates}`)
      } else {
        alert('Sync failed. Is the server running?')
      }
    })
  }

  const isScraping = status.state === 'scraping'
  const isPaused = status.state === 'paused'
  const dp = status.detailProgress

  const getStatusVariant = (state: string) => {
    switch (state) {
      case 'scraping':
      case 'paginating':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <h1 className="text-lg font-semibold">LeadScraper</h1>
        </div>
        <Badge variant={getStatusVariant(status.state)}>
          {status.state.toUpperCase()}
        </Badge>
      </header>

      <main className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Leads Found</div>
              <div className="text-2xl font-bold">{status.leadsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Current State</div>
              <div className="text-sm font-medium">{status.state}</div>
            </CardContent>
          </Card>
        </div>

        {dp && dp.total > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Detail Scraping</span>
                <span className="text-sm text-muted-foreground">{dp.current} / {dp.total}</span>
              </div>
              <Progress value={(dp.current / dp.total) * 100} />
            </CardContent>
          </Card>
        )}

        {!isScraping && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Detailed Info</label>
              <p className="text-xs text-muted-foreground">Hours, price, services</p>
            </div>
            <Switch
              checked={scrapeDetails}
              onCheckedChange={(checked) => setScrapeDetails(checked)}
            />
          </div>
        )}

        <Card className="flex-1">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
            <ScrollArea className="h-[200px]">
              {status.lastLeads && status.lastLeads.length > 0 ? (
                <div className="space-y-2">
                  {status.lastLeads.map((lead, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <span className="text-base">🏢</span>
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {lead.category || 'Business'} • {lead.phone || 'No phone'}
                          {lead.isOpenNow !== undefined && (
                            <span className={lead.isOpenNow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {lead.isOpenNow ? ' ● Open' : ' ● Closed'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  {isScraping ? 'Searching for results...' : 'Waiting for task...'}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t p-4 space-y-3">
        <div className="space-y-2">
          {!isScraping ? (
            <Button onClick={startScraping} className="w-full">
              Start Scraping
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={resumeScraping} className="w-full">
                  Resume Scraping
                </Button>
              ) : (
                <Button disabled className="w-full">
                  <span className="mr-2">⏳</span> {status.activity || 'Working...'}
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={pauseScraping} disabled={isPaused} variant="outline">
                  Pause
                </Button>
                <Button onClick={stopScraping} variant="destructive">
                  Stop
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={syncLocalData} disabled={status.leadsCount === 0 || isScraping} variant="outline" size="sm" className="flex-1">
            ☁️ Sync
          </Button>
          <Button onClick={downloadLeads} disabled={status.leadsCount === 0 || isScraping} variant="outline" size="sm" className="flex-1">
            📦 Export
          </Button>
          <Button onClick={clearLeads} disabled={isScraping} variant="ghost" size="sm" className="flex-1">
            🗑️ Clear
          </Button>
        </div>
      </footer>

      {status.error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg text-sm">
          ⚠️ {status.error}
        </div>
      )}
    </div>
  )
}

export default App

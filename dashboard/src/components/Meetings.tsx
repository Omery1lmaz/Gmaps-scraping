import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Video, MapPin, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

/*
type Meeting = {
  _id: string
  title: string
  date: string
  relatedLeads?: string[]
  notes?: string
  outcome?: 'SUCCESS' | 'FAILED' | 'PENDING'
  time?: string
  type?: 'VIDEO' | 'IN_PERSON' | 'CALL'
}
*/

export const Meetings = () => {
  const [view, setView] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mockEvents: Record<number, any[]> = {
    12: [{ title: 'Intro Call - Tech Solutions', type: 'VIDEO', time: '10:00 AM' }],
    15: [{ title: 'Demo: LeadScraper Pro', type: 'VIDEO', time: '02:30 PM' }, { title: 'Follow-up: Alpha Corp', type: 'CALL', time: '04:00 PM' }],
    18: [{ title: 'Onsite: Global Logistics', type: 'IN_PERSON', time: '11:00 AM' }],
    22: [{ title: 'Strategy Sync', type: 'VIDEO', time: '09:00 AM' }]
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Meetings & Schedule
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium uppercase tracking-widest opacity-70">Google Calendar Integration Active</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl border-slate-200 dark:border-slate-800 shadow-sm font-bold text-slate-600">
            <RefreshCw className="h-4 w-4 mr-2" /> Sync Calendar
          </Button>
          <Button className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-bold px-6">
            <Plus className="h-4 w-4 mr-2" /> New Meeting
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Upcoming & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                Upcoming Events
                <Badge className="bg-emerald-500 text-white border-0">4 Total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {[
                { title: 'Alpha Corp Demo', date: 'May 15', time: '14:30', icon: Video, color: 'blue' },
                { title: 'Tech Solutions Intro', date: 'May 12', time: '10:00', icon: Video, color: 'purple' },
                { title: 'Global Logistics', date: 'May 18', time: '11:00', icon: MapPin, color: 'orange' },
              ].map((event, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                  <div className={`h-12 w-12 rounded-xl bg-${event.color}-50 dark:bg-${event.color}-900/20 flex items-center justify-center`}>
                    <event.icon className={`h-5 w-5 text-${event.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">{event.title}</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">{event.date} • {event.time}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
              <Button variant="ghost" className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-600">
                View Full Schedule
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[24px]">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Closing Rate</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">82%</div>
            </Card>
            <Card className="border-0 bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[24px]">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Avg Duration</div>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400">45m</div>
            </Card>
          </div>
        </div>

        {/* Main: Calendar View */}
        <Card className="lg:col-span-8 border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden">
          <CardHeader className="border-b border-slate-50 dark:border-slate-800 p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">May 2024</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <Button 
                  onClick={() => setView('CALENDAR')}
                  variant={view === 'CALENDAR' ? 'default' : 'ghost'} 
                  className={`h-9 px-4 rounded-lg text-xs font-bold ${view === 'CALENDAR' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
                >
                  Month
                </Button>
                <Button 
                  onClick={() => setView('LIST')}
                  variant={view === 'LIST' ? 'default' : 'ghost'} 
                  className={`h-9 px-4 rounded-lg text-xs font-bold ${view === 'LIST' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
                >
                  List
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {view === 'CALENDAR' ? (
              <div className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800">
                {days.map(day => (
                  <div key={day} className="py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-50 dark:border-slate-800 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
            ) : null}

            {view === 'CALENDAR' ? (
              <div className="grid grid-cols-7 min-h-[600px]">
                {Array.from({ length: 35 }).map((_, i) => {
                  const dayNum = i - 2; // Offset for May 1st (Wednesday)
                  const hasEvents = mockEvents[dayNum];
                  
                  return (
                    <div 
                      key={i} 
                      className={`min-h-[120px] p-4 border-r border-b border-slate-50 dark:border-slate-800 last:border-r-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group relative ${dayNum < 1 || dayNum > 31 ? 'bg-slate-50/30 dark:bg-slate-900/30 opacity-30' : ''}`}
                    >
                      <span className={`text-sm font-bold ${dayNum === 10 ? 'h-7 w-7 flex items-center justify-center bg-emerald-600 text-white rounded-full' : 'text-slate-400'}`}>
                        {dayNum > 0 && dayNum <= 31 ? dayNum : ''}
                      </span>
                      
                      <div className="mt-2 space-y-1">
                        {hasEvents?.map((event, ei) => (
                          <div key={ei} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                            <div className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 truncate">{event.title}</div>
                            <div className="text-[8px] text-emerald-600/70 font-bold">{event.time}</div>
                          </div>
                        ))}
                      </div>

                      {dayNum > 0 && dayNum <= 31 && (
                        <button className="absolute bottom-2 right-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-600 hover:text-white">
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8">
                 {/* List view logic here if needed, but calendar is primary */}
                 <div className="text-center py-24 text-slate-400">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-sm uppercase tracking-widest">Switch to Month View for details</p>
                 </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
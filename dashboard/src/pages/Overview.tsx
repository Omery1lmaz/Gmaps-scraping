import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads } from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Users, 
  TrendingUp, 
  Target, 
  CheckCircle2,
  Clock,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { cn } from '../lib/utils';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';

// `STATUS_LABELS` uses the translation function `t` from `useT()` which must
// be called inside a React component. We'll construct `STATUS_LABELS`
// inside the `Overview` component below after `const t = useT()`.

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  CONTACTED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  FOLLOW_UP: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  MEETING_BOOKED: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  CLOSED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  REJECTED: 'bg-zinc-500/10 text-slate-400 border border-zinc-500/20',
};

export function Overview() {
  const { user } = useAuth();
  interface Lead {
    id?: string;
    _id?: string;
    businessName?: string;
    name?: string;
    category?: string;
    status?: string;
    createdAt?: string;
   }

  const t = useT();

  const STATUS_LABELS: Record<string, string> = React.useMemo(() => ({
    NEW: t('status_new'),
    CONTACTED: t('status_contacted'),
    FOLLOW_UP: t('status_follow_up'),
    MEETING_BOOKED: t('status_meeting_booked'),
    CLOSED: t('status_closed'),
    REJECTED: t('status_rejected'),
  }), [t]);

  const { data: leadsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads(),
  });
  const leads = leadsResponse?.leads ?? [];

  const totalLeads = leads.length;
  const activePipeline = leads.filter((l) => !['CLOSED', 'REJECTED'].includes(l.status || '')).length;
  const closedDeals = leads.filter((l) => l.status === 'CLOSED').length;
  const conversionRate = totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) + '%' : '0%';

  const newLeads = leads.filter((l) => l.status === 'NEW').length;
  const contactedLeads = leads.filter((l) => l.status === 'CONTACTED').length;
  const followUpLeads = leads.filter((l) => l.status === 'FOLLOW_UP').length;
  const meetingBookedLeads = leads.filter((l) => l.status === 'MEETING_BOOKED').length;

  const stats = [
    { label: t('ov_total_leads'), value: totalLeads.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20', trend: '+12%' },
    { label: t('ov_active_pipeline'), value: activePipeline.toLocaleString(), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20', trend: '+8%' },
    { label: t('ov_conversion'), value: conversionRate, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/20', trend: '+2.4%' },
    { label: t('ov_closed_deals'), value: closedDeals.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', trend: '+5%' },
  ];

  const pipelineStats = [
    { label: t('status_new'), count: newLeads, percentage: totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0, color: 'bg-emerald-500' },
    { label: t('status_contacted'), count: contactedLeads, percentage: totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0, color: 'bg-blue-500' },
    { label: t('status_follow_up'), count: followUpLeads, percentage: totalLeads > 0 ? (followUpLeads / totalLeads) * 100 : 0, color: 'bg-amber-500' },
    { label: t('status_meeting_booked'), count: meetingBookedLeads, percentage: totalLeads > 0 ? (meetingBookedLeads / totalLeads) * 100 : 0, color: 'bg-purple-500' },
  ];

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(day);
    const dayLeads = leads.filter((l) => {
      const created = l.createdAt ? new Date(l.createdAt) : new Date();
      return created >= dayStart && created < new Date(dayStart.getTime() + 86400000);
    }).length;
    return { name: format(day, 'EEE'), leads: dayLeads };
  });

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 10);

  if (error) {
    return (
      <div className="p-8 text-center bg-[#0c1220]/50 border border-white/5 rounded-2xl max-w-xl mx-auto mt-10 backdrop-blur-sm shadow-xl">
        <p className="text-red-400 font-bold mb-4">{t('error_occurred')}</p>
        <Button onClick={() => refetch()} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">{t('try_reload')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-amber-400 dark:via-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">{t('ov_page_title')}</span>
            <Sparkles size={18} className="text-emerald-500 animate-pulse" />
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            {t('ov_last_updated')} {format(new Date(), 'PPp')}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 backdrop-blur-md rounded-xl h-9">
          <RefreshCw size={14} className="mr-2" />
          {t('ov_refresh')}
        </Button>
      </div>

      {/* Usage Tracker for Free Users */}
      {user?.plan === 'free' && (
        <div className="rounded-2xl border border-white/5 bg-[#0c1220]/50 p-6 backdrop-blur-sm shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
           
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-1">
                 <h4 className="text-sm font-black text-white flex items-center gap-2">
                   <TrendingUp size={16} className="text-emerald-400" />
                   {t('ov_quota_title')}
                 </h4>
                 <p className="text-[11px] font-bold text-slate-400">{t('ov_quota_desc')}</p>
              </div>
              
              <div className="flex-1 max-w-md w-full space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <span>{totalLeads} / 100 {t('ov_quota_records')}</span>
                  <span className={totalLeads >= 80 ? "text-rose-400 animate-pulse" : "text-emerald-400"}>
                    %{Math.min((totalLeads / 100) * 100, 100).toFixed(0)} {t('ov_quota_occupancy')}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out",
                      totalLeads >= 90 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    )}
                    style={{ width: `${Math.min((totalLeads / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = '/billing'}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-5 rounded-xl text-xs gap-2 shrink-0 shadow-lg shadow-emerald-500/10"
              >
                <Sparkles size={14} className="fill-current" />
                {t('ov_remove_limits')}
              </Button>
           </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0c1220]/50 hover:border-white/15 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-emerald-500/10 group backdrop-blur-sm"
          >
            {/* Subtle glow on hover */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-100 mt-1.5">{stat.value}</h3>
                <div className="flex items-center gap-1 mt-1.5">
                  <ArrowUpRight size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400">{stat.trend}</span>
                  <span className="text-[9px] font-bold text-slate-500">{t('bu_hafta')}</span>
                </div>
              </div>
              <div className={cn("p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts & Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Card */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0c1220]/50 shadow-xl overflow-hidden backdrop-blur-sm group hover:border-white/15 transition-colors">
          <div className="p-5 border-b border-white/5 flex items-center justify-between relative bg-[#080b10]/30">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-500 opacity-5 rounded-full blur-2xl pointer-events-none group-hover:opacity-10 transition-opacity" />
            <div className="relative z-10">
              <h3 className="text-sm font-black text-slate-100">{t('ov_chart_title')}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{t('ov_chart_subtitle')}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">{t('ov_live')}</span>
            </div>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="h-[280px] w-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-2xl bg-white/5" />
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#71717a', fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#71717a', fontWeight: 700}} />
                    <Tooltip 
                      contentStyle={{
                        borderRadius: '16px', 
                        border: '1px solid rgba(52, 211, 153, 0.2)', 
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        backgroundColor: 'rgba(9, 9, 11, 0.95)',
                        backdropFilter: 'blur(10px)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 900
                      }}
                      itemStyle={{ color: '#34d399' }}
                    />
                    <Area type="monotone" dataKey="leads" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pipeline + Recent Leads */}
        <div className="space-y-6">
          
          {/* Pipeline Status Card */}
          <div className="rounded-2xl border border-white/5 bg-[#0c1220]/50 shadow-xl overflow-hidden backdrop-blur-sm group hover:border-white/15 transition-colors">
            <div className="p-5 border-b border-white/5 flex items-center justify-between relative bg-[#080b10]/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 opacity-5 rounded-full blur-2xl pointer-events-none group-hover:opacity-10 transition-opacity" />
               <h3 className="text-sm font-black text-slate-100 relative z-10">{t('ov_pipeline_status')}</h3>
              <BarChart3 size={15} className="text-slate-400 relative z-10" />
            </div>
            <div className="p-5 space-y-4">
              {pipelineStats.map((stat) => (
                <div key={stat.label} className="space-y-2">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-300">{stat.label}</span>
                    <span className="text-xs font-black text-slate-100">{stat.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
                    <div 
                      className={`h-full ${stat.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(stat.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads Card */}
          <div className="rounded-2xl border border-white/5 bg-[#0c1220]/50 shadow-xl overflow-hidden backdrop-blur-sm group hover:border-white/15 transition-colors">
            <div className="p-5 border-b border-white/5 flex items-center justify-between relative bg-[#080b10]/30">
              <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-5 rounded-full blur-2xl pointer-events-none group-hover:opacity-10 transition-opacity" />
               <h3 className="text-sm font-black text-slate-100 relative z-10">{t('ov_recent_leads')}</h3>
              <Clock size={15} className="text-slate-400 relative z-10" />
            </div>
            <div className="p-3">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-9 w-9 rounded-xl bg-white/5" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28 bg-white/5" />
                        <Skeleton className="h-2.5 w-20 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentLeads.length > 0 ? (
                <div className="space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {recentLeads.map((lead) => (
                    <div key={lead.id || lead._id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group/lead relative z-10">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-200 truncate group-hover/lead:text-emerald-400 transition-colors">
                           {lead.businessName || lead.name || t('ov_unknown')}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">
                           {lead.category || t('ov_uncategorized')}
                        </p>
                      </div>
                      <Badge className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg ml-2", STATUS_COLORS[lead.status || ''] || 'bg-zinc-500/10 text-slate-400 border border-zinc-500/20')}>
                        {STATUS_LABELS[lead.status || ''] || lead.status || t('ov_unknown')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('ov_no_leads_yet')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


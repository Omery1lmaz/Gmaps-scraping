import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  BarChart3
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

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  FOLLOW_UP: 'Follow-up',
  MEETING_BOOKED: 'Meeting Booked',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-indigo-100 text-indigo-800',
  FOLLOW_UP: 'bg-amber-100 text-amber-800',
  MEETING_BOOKED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-slate-100 text-slate-800',
};

export function Overview() {
  interface Lead {
    id?: string;
    _id?: string;
    businessName?: string;
    name?: string;
    category?: string;
    status?: string;
    createdAt?: string;
  }

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
    { label: 'Total Leads', value: totalLeads.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Pipeline', value: activePipeline.toLocaleString(), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Conversion Rate', value: conversionRate, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Closed Deals', value: closedDeals.toLocaleString(), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const pipelineStats = [
    { label: 'New', count: newLeads, percentage: totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0 },
    { label: 'Contacted', count: contactedLeads, percentage: totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0 },
    { label: 'Follow-up', count: followUpLeads, percentage: totalLeads > 0 ? (followUpLeads / totalLeads) * 100 : 0 },
    { label: 'Meeting Booked', count: meetingBookedLeads, percentage: totalLeads > 0 ? (meetingBookedLeads / totalLeads) * 100 : 0 },
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
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Failed to load leads data. Please try again.</p>
        <Button onClick={() => refetch()} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
          <p className="text-sm text-slate-400 mt-1">
            Last updated: {format(new Date(), 'PPp')}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-white overflow-hidden group hover:scale-[1.02] transition-transform">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
                </div>
                <div className={stat.bg + " p-3 rounded-2xl " + stat.color}>
                  <stat.icon size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Leads Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Pipeline Status</CardTitle>
              <BarChart3 size={16} className="text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelineStats.map((stat) => (
                  <div key={stat.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">{stat.label}</span>
                      <span className="text-sm font-bold text-slate-800">{stat.count}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Recent Leads</CardTitle>
              <Clock size={16} className="text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentLeads.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {lead.businessName || lead.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {lead.category || 'Uncategorized'}
                        </p>
                      </div>
                      <Badge className={STATUS_COLORS[lead.status || ''] || 'bg-slate-100 text-slate-800'}>
                        {STATUS_LABELS[lead.status || ''] || lead.status || 'Unknown'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No recent leads</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

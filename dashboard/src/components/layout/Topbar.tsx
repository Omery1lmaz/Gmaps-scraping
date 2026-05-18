import React from 'react';
import { Search, Bell, Moon, Sun, PanelLeft, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from '../../lib/router';

const WA_ENGINE_URL = import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002';

export function Topbar() {
  const navigate = useNavigate();
  const { data: waStatus } = useQuery({
    queryKey: ['wa-status-global'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${WA_ENGINE_URL}/status/mock-admin-user-id`);
        return res.data?.status || 'OFFLINE';
      } catch (err) {
        return 'OFFLINE';
      }
    },
    refetchInterval: 5000
  });

  const isWaConnected = waStatus === 'CONNECTED';

  return (
    <header className="h-16 border-b border-slate-50 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden p-2 hover:bg-slate-50 rounded-lg text-slate-400">
          <PanelLeft size={20} />
        </button>
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Kayıt, görev veya raporlarda ara..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500/20 transition-all text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-blue-600">
            <Bell size={18} />
          </button>
          <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500">
            <Sun size={18} />
          </button>
        </div>
        <div className="h-8 w-px bg-slate-100 mx-1" />
        <Button 
          variant="ghost" 
          onClick={() => navigate('/whatsapp')}
          className="rounded-xl font-bold text-xs gap-2 px-3 transition-colors hover:bg-slate-50 border border-slate-100 hover:border-slate-200 shadow-3xs"
          title={isWaConnected ? "WhatsApp Bağlı ve Aktif. Detaylar için tıklayın." : "WhatsApp Bağlantısı Koptu! Bağlanmak ve QR Kod okutmak için tıklayın."}
        >
          <MessageCircle size={14} className={isWaConnected ? "text-emerald-500 animate-pulse" : "text-rose-500 animate-bounce"} />
          <span className={`size-2 rounded-full ${isWaConnected ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 animate-ping"}`} />
          <span className={isWaConnected ? "text-emerald-700" : "text-rose-600"}>
            {isWaConnected ? 'WP Aktif' : 'WP Koptu (Tıkla Bağlan)'}
          </span>
        </Button>
      </div>
    </header>
  );
}

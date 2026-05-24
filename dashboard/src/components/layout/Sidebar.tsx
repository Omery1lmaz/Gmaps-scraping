import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Layout,
  Zap,
  MessageCircle,
  FileText,
  Command,
  CreditCard,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLocation, Link } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import { useWhatsApp } from '../../features/whatsapp/WhatsAppProvider';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useT } from '../../lib/i18n';

const menuSections = [
  {
    title: 'sidebar_section_core',
    items: [
      { id: 'overview', path: '/overview', icon: LayoutDashboard, label: 'sidebar_overview' },
      { id: 'leads', path: '/leads', icon: Users, label: 'sidebar_leads' },
      { id: 'pipeline', path: '/pipeline', icon: Layout, label: 'sidebar_pipeline' },
      { id: 'templates', path: '/templates', icon: FileText, label: 'sidebar_templates' },
      { id: 'sequences', path: '/sequences', icon: Zap, label: 'sidebar_sequences' },
    ],
  },
  {
    title: 'sidebar_section_crm',
    items: [
      { id: 'whatsapp_web', path: '/whatsapp', icon: MessageCircle, label: 'sidebar_whatsapp_web' },
      { id: 'whatsapp_accounts', path: '/whatsapp/accounts', icon: Users, label: 'sidebar_accounts' },
    ],
  },
  {
    title: 'sidebar_section_outreach',
    items: [
      { id: 'billing', path: '/billing', icon: CreditCard, label: 'sidebar_billing' },
    ],
  },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useWhatsApp();
  const t = useT();
  const [searchValue, setSearchValue] = useState('');

  const userInitials = React.useMemo(() => {
    if (!user?.name) return 'LD';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, [user]);

  return (
    <aside className="w-72 border-r border-white/10 bg-slate-950/95 backdrop-blur-xl text-slate-100 flex flex-col h-screen overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.35)]">
      <div className="px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-3xl bg-slate-800 shadow-sm flex items-center justify-center overflow-hidden">
            <img src="/favicon.svg" alt="WPAIFlow logo" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">{t('sidebar_mailwise')}</p>
            <h1 className="text-lg font-bold tracking-tight text-white">WPAIFlow</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="px-1 text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">
              {t(section.title)}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.path || (pathname === '/' && item.path === '/leads');
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200',
                      isActive
                        ? 'text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <item.icon size={18} className={cn(isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
                    <span className="text-sm font-semibold truncate">{t(item.label)}</span>
                    {item.id === 'whatsapp_web' && unreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-lg shadow-rose-500/20">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 rounded-3xl border border-white/5 bg-slate-900/85 p-4 shadow-inner shadow-black/10">
          <Avatar className="h-11 w-11 rounded-3xl bg-slate-800 text-slate-200 shadow-sm">
            <AvatarFallback className="bg-transparent text-slate-200 text-xs font-black">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Heaven Admin'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@leadflow.pro'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-black uppercase tracking-[0.24em] text-slate-400 transition hover:border-rose-500/30 hover:text-rose-400"
        >
          {t('sidebar_logout')}
        </button>
      </div>
    </aside>
  );
}

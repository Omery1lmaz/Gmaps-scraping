import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layout, 
  Zap,
  MessageCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Command,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Calendar,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLocation, Link } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import { useWhatsApp } from '../../features/whatsapp/WhatsAppProvider';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { useNavigate } from '../../lib/router';
import { useT } from '../../lib/i18n';

const menuItems = [
  { id: 'overview', path: '/overview', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'leads', path: '/leads', icon: Users, label: 'Leads' },
  { id: 'pipeline', path: '/pipeline', icon: Layout, label: 'Pipeline' },
  { id: 'templates', path: '/templates', icon: FileText, label: 'WP Şablonlar' },
  { id: 'sequences', path: '/sequences', icon: Zap, label: 'WP Otomasyon' },
  { id: 'calendar', path: '/calendar', icon: Calendar, label: 'Takvim' },
  { 
    id: 'whatsapp_dropdown', 
    icon: MessageCircle, 
    label: 'WhatsApp',
    isDropdown: true,
    children: [
      { id: 'whatsapp_web', path: '/whatsapp', label: 'Web' },
      { id: 'whatsapp_accounts', path: '/whatsapp/accounts', label: 'Hesaplar' },
    ]
  },
  { id: 'billing', path: '/billing', icon: CreditCard, label: 'Abonelik & Ödeme' },
  { id: 'settings', path: '/settings', icon: Settings, label: 'Ayarlar' },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useWhatsApp();
  const navigate = useNavigate();
  const t = useT();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Collapsible state initialized from localStorage for persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Extract initials for the avatar
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
    <TooltipProvider>
      <aside 
        className={cn(
          "border-r border-slate-100/5 dark:border-slate-800/50 bg-white/5 dark:bg-slate-900/70 backdrop-blur-md flex flex-col h-screen shrink-0 relative transition-all duration-300 ease-in-out z-30 shadow-[4px_0_24px_rgba(0,0,0,0.5)]",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Floating Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-[-14px] top-10 size-7 bg-[#0c1220] border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:scale-110 shadow-sm cursor-pointer z-50 transition-all duration-200"
          title={isCollapsed ? t('expand_menu') : t('collapse_menu')}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo Section */}
        <div className={cn(
          "p-5 border-b border-white/5 flex items-center gap-3 h-16 transition-all duration-300",
          isCollapsed ? "justify-center" : "px-6"
        )}>
          <div className="bg-gradient-to-tr from-emerald-500 to-green-600 size-9 rounded-xl flex items-center justify-center text-black shadow-lg shadow-emerald-500/20 hover:rotate-12 transition-transform duration-300">
            <Command size={18} className="animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
                WPAIFlow 
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm">
                  PRO
                </span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                Gmaps Scraper
              </span>
            </div>
          )}
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin">
          {menuItems.map((item) => {
            if (item.isDropdown) {
              const isDropdownOpen = openDropdown === item.id;
              const isActive = item.children?.some(child => pathname === child.path);

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => setOpenDropdown(isDropdownOpen ? null : item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group border border-transparent",
                      isActive ? "bg-white/10 text-white font-extrabold" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <item.icon size={19} className={cn("transition-transform duration-200", isActive ? "text-emerald-400" : "text-slate-400")} />
                      {!isCollapsed && <span className="text-sm font-extrabold tracking-tight">{item.label}</span>}
                    </div>
                    {!isCollapsed && (isDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </button>
                  {isDropdownOpen && !isCollapsed && item.children?.map(child => (
                    <Link
                      key={child.id}
                      to={child.path || '#'}
                      className={cn(
                        "flex items-center justify-between w-full px-12 py-2 text-xs font-semibold rounded-xl transition-colors",
                        pathname === child.path ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      <span>{child.label}</span>
                      {child.id === 'whatsapp_web' && unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-rose-500/20">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              );
            }

            const isActive = pathname === item.path || (pathname === '/' && item.path === '/leads');
            const linkContent = (
              <Link
                key={item.id}
                to={item.path || '#'}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group relative border border-transparent",
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-black font-extrabold shadow-[0_4px_20px_rgba(16,185,129,0.25)] border-0" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                )}
              >
                <div className={cn("flex items-center gap-3.5", isCollapsed && "mx-auto")}>
                  <div className="relative">
                    <item.icon size={19} className={cn("transition-transform duration-200 group-hover:scale-110", isActive ? "text-black" : "text-slate-400 group-hover:text-slate-300")} />
                    {item.id === 'whatsapp_dropdown' && isCollapsed && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] font-black text-white items-center justify-center">
                          {unreadCount > 9 ? '!' : unreadCount}
                        </span>
                      </span>
                    )}
                  </div>
                  {!isCollapsed && <span className="text-sm font-extrabold tracking-tight">{t(item.id)}</span>}
                </div>
                {!isCollapsed && item.id === 'whatsapp_dropdown' && unreadCount > 0 && (
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg",
                    isActive ? "bg-black text-white" : "bg-rose-500 text-white shadow-rose-500/20"
                  )}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-bold text-xs bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-0 shadow-lg px-2.5 py-1.5 rounded-lg">
                    {t(item.id)}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Footer Area: Unified Profile & Dropdown */}
        <div className="p-4 border-t border-white/5">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full outline-none">
              {isCollapsed ? (
                <div className="flex justify-center cursor-pointer group">
                  <Avatar className="size-10 border-2 border-white dark:border-slate-800 shadow-md shadow-emerald-500/5 bg-gradient-to-tr from-emerald-500 to-green-600 text-black font-extrabold group-hover:scale-105 transition-transform">
                    <AvatarFallback className="bg-transparent text-black text-xs font-black">{userInitials}</AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div className="bg-[#0c1220]/80 rounded-2xl p-4 border border-white/5 hover:bg-white/5 transition-all duration-200 shadow-xl backdrop-blur-sm group cursor-pointer text-left">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border-2 border-white dark:border-slate-800 shadow-md shadow-emerald-500/5 bg-gradient-to-tr from-emerald-500 to-green-600 text-black font-extrabold group-hover:scale-105 transition-transform">
                      <AvatarFallback className="bg-transparent text-black text-xs font-black">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-100 truncate flex items-center gap-1">
                        {user?.name || 'Heaven Admin'}
                        <Sparkles size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 truncate">
                        {user?.email || 'admin@leadflow.pro'}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {user?.plan ? `${user.plan.toUpperCase()} PLAN` : 'FREE PLAN'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent 
              side={isCollapsed ? "right" : "top"} 
              align={isCollapsed ? "end" : "center"}
              sideOffset={isCollapsed ? 12 : 8}
              className="w-56 p-1.5 border border-white/10 bg-[#0c1220]/95 backdrop-blur-md shadow-2xl rounded-2xl z-50"
            >
              <div className="p-2.5 flex flex-col gap-0.5">
                <span className="text-xs font-black text-slate-200">{user?.name}</span>
                <span className="text-[10px] font-bold text-slate-500">{user?.email}</span>
              </div>
              
              <DropdownMenuSeparator className="bg-white/5" />
              
              <DropdownMenuItem 
                onClick={() => navigate('/overview')}
                className="flex items-center gap-2 p-2 text-xs font-extrabold text-slate-300 hover:text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400 rounded-xl cursor-pointer transition-colors"
              >
                <LayoutDashboard size={14} />
                {t('overview')}
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => navigate('/whatsapp')}
                className="flex items-center gap-2 p-2 text-xs font-extrabold text-slate-300 hover:text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400 rounded-xl cursor-pointer transition-colors"
              >
                <MessageCircle size={14} />
                {t('whatsapp')}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-white/5" />
              
              <DropdownMenuItem 
                onClick={() => logout()} 
                className="flex items-center gap-2 p-2 text-xs font-extrabold text-rose-500 hover:bg-rose-500/10 focus:bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
              >
                <Zap size={14} className="rotate-180" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}

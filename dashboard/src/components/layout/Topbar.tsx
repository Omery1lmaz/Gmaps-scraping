import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  Moon,
  Sun,
  PanelLeft,
  MessageCircle,
  LogOut,
  Command,
  Check,
  Trash2,
  User,
  Settings,
  Activity,
  Sparkles,
  ChevronRight,
  Database,
  ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from '../../lib/router';
import { useApp } from '../../lib/context';
import { useAuth } from '../../lib/auth';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { useLanguage } from '../../lib/language';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { useT } from '../../lib/i18n';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const WA_ENGINE_URL = import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002';

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'success' | 'info' | 'warning';
}

export function Topbar() {
  const navigate = useNavigate();
  const { theme, setTheme } = useApp();
  const { language, setLanguage } = useLanguage();
  const { user, token, logout } = useAuth();
  const t = useT();

  // Search Command Dialog state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      title: "Tarama Başarıyla Tamamlandı",
      description: "Google Haritalar taramasından 45 yeni potansiyel müşteri bulundu.",
      time: "10 dakika önce",
      read: false,
      type: 'success'
    },
    {
      id: 2,
      title: "WhatsApp Bağlantısı Aktif",
      description: "WhatsApp servisiniz arka planda başarıyla bağlandı ve kararlı durumda.",
      time: "1 saat önce",
      read: false,
      type: 'info'
    },
    {
      id: 3,
      title: "Otomasyon Çalıştırıldı",
      description: "'VIP Müşteriler' kampanyası için ilk aşama mesaj gönderimi başladı.",
      time: "5 saat önce",
      read: true,
      type: 'info'
    }
  ]);

  // Unread notifications count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Keyboard shortcut listener for Command Menu (CMD+K or Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch WhatsApp Engine Status
  const { data: waStatus } = useQuery({
    queryKey: ['wa-status-global'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${WA_ENGINE_URL}/status/${user?.id}`);
        return res.data?.status || 'OFFLINE';
      } catch (err) {
        return 'OFFLINE';
      }
    },
    enabled: Boolean(user?.id && token),
    refetchInterval: 5000
  });

  const isWaConnected = waStatus === 'CONNECTED';
  const isWaInitializing = ['INITIALIZING', 'AUTHENTICATED', 'QR_READY'].includes(waStatus || '');
  const isWaDisconnected = waStatus === 'DISCONNECTED' || waStatus === 'OFFLINE' || !waStatus;

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success(t('mark_all_read'));
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
    toast.info(t('cleared_all'));
  };

  // Dismiss a single notification
  const handleDismissNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // User initials for Topbar Avatar
  const userInitials = useMemo(() => {
    if (!user?.name) return 'US';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, [user]);

  // Command items for quick navigation
  const searchCommands = [
    { label: 'Gösterge Paneli (Dashboard)', path: '/overview', desc: 'Raporlar ve istatistik analizi' },
    { label: 'Potansiyel Müşteriler (Leads)', path: '/leads', desc: 'Müşteri kayıtlarını yönetin' },
    { label: 'Satış Boru Hattı (Pipeline)', path: '/pipeline', desc: 'Sürükle-bırak aşama yönetimi' },
    { label: 'WhatsApp Şablonları', path: '/templates', desc: 'Hazır mesaj içerikleri oluşturun' },
    { label: 'WhatsApp Otomasyonu (Sequences)', path: '/sequences', desc: 'Otomatik mesaj dizileri ve akışlar' },
    { label: 'WhatsApp Bağlantı Paneli', path: '/whatsapp', desc: 'QR kod okutun ve durum izleyin' },
  ];

  // Filter commands based on input search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return searchCommands;
    return searchCommands.filter(c =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleNavigateCommand = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  return (
    <>
      <header className="h-16 border-b border-slate-100/5 dark:border-slate-800/50 bg-white/5 dark:bg-slate-900/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-all duration-200">

        {/* Left Section: Search Input Trigger */}
        <div className="flex items-center gap-4 flex-1">
          <button className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-slate-400">
            <PanelLeft size={20} />
          </button>

          {/* Decorative Command Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 w-full max-w-sm px-3.5 py-2 bg-[#0c1220]/50 hover:bg-white/5 border border-white/5 hover:border-white/15 rounded-xl transition-all text-sm font-medium text-slate-400 group cursor-pointer"
          >
            <Search className="text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" size={16} />
            <span className="flex-1 text-left text-slate-400 dark:text-slate-500 font-semibold text-xs truncate">
              {t('quick_search_placeholder')}
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#0c1220] border border-white/10 rounded-md text-slate-400 select-none shadow-3xs shrink-0">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Section: Widgets & Menus */}
        <div className="flex items-center gap-3">

          {/* Dynamic WhatsApp Connection Badge */}
          <Button
            variant="ghost"
            onClick={() => navigate('/whatsapp')}
            className={cn(
              "rounded-xl font-extrabold text-xs gap-2 px-3 h-10 border transition-all duration-300 shadow-3xs hover:scale-[1.02] cursor-pointer",
              isWaConnected
                ? "bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30 hover:bg-emerald-500/10"
                : isWaInitializing
                ? "bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30 hover:bg-amber-500/10"
                : "bg-slate-500/5 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
            title={
              isWaConnected 
                ? t('whatsapp_connected_detail') 
                : isWaInitializing 
                ? t('whatsapp_initializing') 
                : t('whatsapp_not_connected')
            }
          >
            <MessageCircle 
              size={14} 
              className={cn(
                isWaConnected ? "text-emerald-500 animate-pulse" : 
                isWaInitializing ? "text-amber-500 animate-pulse" : 
                "text-slate-400"
              )} 
            />
            <span className={cn(
              "size-1.5 rounded-full shadow-sm shrink-0",
              isWaConnected ? "bg-emerald-500 animate-ping" : 
              isWaInitializing ? "bg-amber-500 animate-pulse" : 
              "bg-slate-400"
            )} />
            <span className="hidden sm:inline tracking-tight font-black">
              {isWaConnected 
                ? t('whatsapp_active') 
                : isWaInitializing 
                ? t('whatsapp_initializing') 
                : t('whatsapp_not_connected')
              }
            </span>
          </Button>

          {/* Theme Switcher & Notification Popover */}
          <div className="flex items-center gap-1 bg-[#0c1220]/50 p-1 rounded-xl border border-white/5">

            {/* Notification Popover */}
            <Popover>
              <PopoverTrigger className="p-2 hover:bg-white dark:hover:bg-slate-950 hover:shadow-2xs rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 relative cursor-pointer">
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 size-3.5 bg-emerald-500 text-[8px] font-black text-black rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-900 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 border border-white/10 bg-[#0c1220]/90 backdrop-blur-md shadow-2xl rounded-xl z-50">
                <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 rounded-t-xl">
                  <h3 className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">{t('notifications')} ({unreadCount})</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] font-extrabold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer">
                      <Check size={11} /> {t('read_all')}
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-xs font-bold">{t('no_notifications')}</p>
                    </div>
                  ) : notifications.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all text-left flex gap-3 relative cursor-pointer",
                        !item.read && "bg-emerald-500/[0.02]"
                      )}
                      onClick={() => setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n))}
                    >
                      <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        {item.type === 'success' ? <Check size={15} className="text-emerald-500" /> : <Activity size={15} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11.5px] font-black text-slate-800 dark:text-slate-200 leading-normal">{item.title}</p>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                        <span className="text-[8px] font-bold text-slate-400 mt-2 block">{item.time}</span>
                      </div>
                      {!item.read && (
                        <span className="size-1.5 bg-emerald-500 rounded-full shrink-0 absolute top-4 right-4" />
                      )}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Language Selector */}
            <div className="hidden sm:block">
              <Select value={language} onValueChange={(val) => setLanguage(val as 'tr' | 'en')}>
                <SelectTrigger size="sm" className="h-8 rounded-lg border-none bg-transparent hover:bg-white dark:hover:bg-slate-950 hover:shadow-2xs text-[10px] font-black px-2 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all uppercase tracking-wider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-white/10 bg-[#0c1220]/90 backdrop-blur-md shadow-2xl rounded-xl z-50">
                  <SelectItem value="tr" className="text-[10px] font-black uppercase tracking-wider focus:bg-emerald-500/10 focus:text-emerald-400">TR</SelectItem>
                  <SelectItem value="en" className="text-[10px] font-black uppercase tracking-wider focus:bg-emerald-500/10 focus:text-emerald-400">EN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 hover:bg-white dark:hover:bg-slate-950 hover:shadow-2xs rounded-lg transition-all text-slate-500 dark:text-slate-400 cursor-pointer"
              title={theme === 'light' ? t('switch_to_dark') : t('switch_to_light')}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>

          <div className="h-8 w-px bg-white/10 mx-1" />

          {/* Dynamic Premium User Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200/40 dark:hover:border-slate-800/50 rounded-xl transition-all cursor-pointer select-none">
              <Avatar className="size-8.5 border-2 border-white dark:border-slate-800 shadow-md shadow-emerald-500/5 bg-gradient-to-tr from-emerald-500 to-green-600 text-black font-extrabold">
                <AvatarFallback className="bg-transparent text-black text-xs font-black">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left pr-1.5">
                <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 max-w-[100px] truncate leading-tight flex items-center gap-0.5">
                  {user?.name || 'Heaven Admin'}
                </div>
                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate leading-none">
                  {user?.email || 'admin@leadflow.pro'}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1 border border-white/10 bg-[#0c1220]/90 backdrop-blur-md shadow-2xl rounded-xl z-50">
              <div className="p-2.5 flex flex-col gap-0.5">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{user?.name}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{user?.email}</span>
                <div className="mt-2 flex">
                  <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t('profile_role')}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/overview')} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer">
                <User className="size-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('overview')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/whatsapp')} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer">
                <MessageCircle className="size-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('whatsapp')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info(t('system_settings'))} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer">
                <Settings className="size-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('system_settings')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-2 text-slate-500 dark:text-slate-400">
                <Activity className="size-3.5 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-500">{t('api_status')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer animate-pulse-once"
              >
                <LogOut className="size-4 text-rose-500" />
                <span className="text-xs font-bold">{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      {/* Premium Interactive Command Search Dialog (CMD+K Modal) */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-lg p-0 bg-[#0c1220]/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50">

          {/* Header search bar */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-900">
            <Search className="text-emerald-500 shrink-0" size={18} />
            <input
              type="text"
              placeholder="Sayfa veya özellik ismi arayın... (ör. Leads, Otomasyon)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-200 font-semibold text-sm placeholder:text-slate-400"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-md text-slate-400 dark:text-slate-500 select-none shadow-3xs shrink-0">
              ESC
            </kbd>
          </div>

          {/* List of actions/commands */}
          <div className="p-2 max-h-80 overflow-y-auto scrollbar-thin">
            <div className="px-2 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('quick_navs')}
            </div>

            <div className="space-y-0.5 mt-1">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-semibold text-xs">
                  {t('no_results')}
                </div>
              ) : (
                filteredCommands.map((command) => (
                  <button
                    key={command.path}
                    onClick={() => handleNavigateCommand(command.path)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                        <Command size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
                          {command.label}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {command.desc}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Footer of the command dialog */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[10px] font-extrabold text-slate-400 select-none">
            <span className="flex items-center gap-1.5">
              <Database size={11} className="text-slate-400" />
              {t('search_cmd_footer')}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-0.5">
                <ChevronRight size={10} className="mt-0.5" /> {t('enter_to_select')}
              </span>
              <span className="flex items-center gap-0.5">
                <ChevronRight size={10} className="mt-0.5" /> {t('esc_to_close')}
              </span>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}

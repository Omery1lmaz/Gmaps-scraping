import React from 'react';
import { Search, RefreshCcw, LogOut, ChevronDown, Smartphone } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { cn, safeFormatDate } from '../../../lib/utils';
import { useT } from '../../../lib/i18n';
import { displayName } from '../whatsapp-utils';

interface ChatListProps {
  chats: any[];
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
  search: string;
  setSearch: (search: string) => void;
  filter: string;
  setFilter: (filter: string) => void;
  chatsLoading: boolean;
  connected: boolean;
  chatTags: Record<string, string[]>;
  AVAILABLE_TAGS: any[];
  // Connection and Session control props
  sessionInfo?: any;
  onSync?: () => void;
  onLogout?: () => void;
  onRestart?: () => void;
  syncPending?: boolean;
  logoutPending?: boolean;
  restartPending?: boolean;
  sessions?: any[];
  selectedSessionId?: string | null;
  onSessionChange?: (id: string) => void;
}

export function ChatList({
  chats,
  selectedChatId,
  setSelectedChatId,
  search,
  setSearch,
  filter,
  setFilter,
  chatsLoading,
  connected,
  chatTags,
  AVAILABLE_TAGS,
  sessionInfo,
  onSync,
  onLogout,
  onRestart,
  syncPending = false,
  logoutPending = false,
  restartPending = false,
  sessions = [],
  selectedSessionId,
  onSessionChange
}: ChatListProps) {
  const t = useT();

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/5 bg-[#0c1220]/60 backdrop-blur-xl shadow-2xl overflow-hidden group">
      {/* WhatsApp Connection Bar inside Chat List */}
      <div className="p-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center w-full">
            <span className={cn(
              "absolute left-2.5 z-10 size-2 rounded-full",
              connected ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"
            )} />
            <select
              value={selectedSessionId || ''}
              onChange={(e) => onSessionChange?.(e.target.value)}
              className="bg-white/5 text-[11px] font-black text-slate-200 pl-6 pr-8 py-2 rounded-xl border border-white/5 outline-none cursor-pointer appearance-none min-w-[130px] max-w-[155px] truncate hover:bg-white/10 transition-colors"
            >
              {sessions.map((s: any) => (
                <option key={s._id} value={s._id} className="bg-slate-900 text-white">
                  {s.sessionName}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="text-slate-500 absolute right-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Small inline Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {connected && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-400 transition-all active:scale-95"
              onClick={onSync}
              disabled={syncPending}
              title={t('wp_sync_history_title') || 'Senkronize Et'}
            >
              <RefreshCcw className={cn('size-3.5', syncPending && 'animate-spin')} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-xl hover:bg-white/5 hover:text-white text-slate-400 transition-all active:scale-95"
            onClick={onRestart}
            disabled={restartPending}
            title={t('wp_restart_title') || 'Yeniden Başlat'}
          >
            <RefreshCcw className={cn('size-3.5', restartPending && 'animate-spin')} />
          </Button>

          {connected && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all active:scale-95"
              onClick={onLogout}
              disabled={logoutPending}
              title="Bağlantıyı Kes"
            >
              <LogOut className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="p-5 space-y-4 border-b border-white/5 relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[60px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        
        <div className="relative group/search">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-emerald-500 transition-colors" />
          <Input 
            value={search} 
            onChange={(event) => setSearch(event.target.value)} 
            placeholder={t('wp_search_chats')} 
            className="h-11 w-full rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 pl-10 text-xs font-bold text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-emerald-500/30 transition-all shadow-inner" 
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5 flex-1 overflow-x-auto no-scrollbar">
            {['all', 'unread', 'leads', 'groups'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 min-w-[70px] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap",
                  filter === f
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                {t(`wp_tab_${f}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1.5 p-3">
          {chatsLoading ? (
            <div className="space-y-2 px-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 shadow-xl animate-pulse">
                  <div className="size-11 rounded-xl bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded-md bg-white/10" />
                    <div className="h-2 w-1/2 rounded-md bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600">
                <Search size={20} />
              </div>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                {!connected ? t('wp_chats_loading') : t('wp_no_chats_found')}
              </p>
            </div>
          ) : chats.map((chat: any) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={cn(
                'w-full rounded-2xl border p-3.5 text-left transition-all duration-300 active:scale-98',
                selectedChatId === chat.id
                  ? 'border-emerald-500/30 bg-emerald-500/10 shadow-inner'
                  : 'border-transparent hover:bg-white/5',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-xl font-black text-sm transition',
                  selectedChatId === chat.id ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-slate-400'
                )}>
                  {displayName(chat).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-black text-white">{displayName(chat)}</p>
                    {chat.lastMessageAt && <span className="text-[10px] font-bold text-slate-400">{safeFormatDate(chat.lastMessageAt, 'HH:mm')}</span>}
                  </div>
                  <p className="mt-1 truncate text-[11px] font-semibold text-slate-400 leading-tight">
                    {chat.lastMessagePreview || chat.messages?.[0]?.body || (chat.jid ? chat.jid.split('@')[0] : 'Yeni Sohbet')}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1">
                    {chat.leadId && <Badge className="border-none bg-emerald-500/10 text-[8px] font-black text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5">LEAD</Badge>}
                    {chat.isGroup && <Badge className="border-none bg-white/5 bg-white/5 text-[8px] font-black text-slate-100 px-1.5 py-0.5">GRUP</Badge>}
                    {chat.unreadCount > 0 && (
                      <Badge className="border-none bg-emerald-500 text-[8px] font-black text-white px-1.5 py-0.5 animate-bounce">
                        {chat.unreadCount} YENİ
                      </Badge>
                    )}
                    {chatTags[chat.id]?.map((tagId) => {
                      const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span key={tagId} className="inline-block rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-200/50 dark:bg-slate-700/50 text-slate-100">
                          {tag.name.split(' ')[1] || tag.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

import React from 'react';
import { Tag, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ChatSearchBar } from './Chat/ChatSearchBar';

import { cn } from '../../../lib/utils';
import { displayName } from '../whatsapp-utils';

interface ChatHeaderProps {
  selectedChat: any;
  messageSearchQuery: string;
  setMessageSearchQuery: (query: string) => void;
  searchedMsgIds: string[];
  highlightedMsgIndex: number;
  navigateSearchResult: (direction: 'up' | 'down') => void;
  AVAILABLE_TAGS: any[];
  chatTags: Record<string, string[]>;
  toggleTag: (chatId: string, tagId: string) => void;
}

export function ChatHeader({
  selectedChat,
  messageSearchQuery,
  setMessageSearchQuery,
  searchedMsgIds,
  highlightedMsgIndex,
  navigateSearchResult,
  AVAILABLE_TAGS,
  chatTags,
  toggleTag
}: ChatHeaderProps) {
  return (
    <div className="flex flex-col border-b border-white/5 p-5 bg-[#0c1220]/60 backdrop-blur-xl gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white tracking-tight">{displayName(selectedChat)}</h3>
          <p className="text-[11px] font-bold text-slate-500">{selectedChat.contact?.phone || selectedChat.jid}</p>
        </div>
        <div className="flex items-center gap-2">
          <ChatSearchBar chatId={selectedChat.id} onSearch={setMessageSearchQuery} />
          <Badge className={cn('border-none px-3 py-1 text-[9px] font-black tracking-widest uppercase rounded-xl', selectedChat.leadId ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-400')}>
            {selectedChat.leadId ? '⭐ LEAD BAĞLI' : '👤 KİŞİ KAYDI'}
          </Badge>
        </div>
      </div>

      {/* Search results navigation */}
      {messageSearchQuery && searchedMsgIds.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 animate-in slide-in-from-top-2 duration-300">
          <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
            {highlightedMsgIndex + 1}/{searchedMsgIds.length} EŞLEŞME BULUNDU
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-emerald-500/20 text-emerald-400" onClick={() => navigateSearchResult('up')}>
              <ChevronUp className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-emerald-500/20 text-emerald-400" onClick={() => navigateSearchResult('down')}>
              <ChevronDown className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-rose-500/20 text-rose-400" onClick={() => setMessageSearchQuery('')}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Tags Selector */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Tag size={12} /> Etiketler:</span>
        {AVAILABLE_TAGS.map((tag) => {
          const isActive = (chatTags[selectedChat.id] || []).includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(selectedChat.id, tag.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-[9px] font-black transition-all active:scale-95 duration-200 border uppercase tracking-wider',
                isActive
                  ? 'bg-emerald-500 text-black border-transparent shadow-lg shadow-emerald-500/10'
                  : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300 hover:bg-white/10'
              )}
            >
              {tag.name.includes(' ') ? tag.name.split(' ')[1] : tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

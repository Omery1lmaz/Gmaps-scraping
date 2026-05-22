import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useT } from '../../../../lib/i18n';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';

export function ChatSearchBar({ chatId, onSearch }: { chatId: string; onSearch: (query: string) => void }) {
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  return (
    <div className="relative">
      {searchOpen ? (
        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 2) onSearch(e.target.value);
              if (e.target.value === '') onSearch('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
              if (e.key === 'Escape') { setSearchOpen(false); onSearch(''); }
            }}
            placeholder={t('wp_search_msgs')}
            className="h-8 rounded-xl border-slate-200/80 dark:border-zinc-800/60 dark:border-slate-700 bg-[#0c1220]/50 backdrop-blur-sm/80 bg-slate-100/80 dark:bg-zinc-900/80 pl-3 text-xs font-bold focus-visible:ring-emerald-500/20"
          />
          <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-xl" onClick={() => { setSearchOpen(false); onSearch(''); }}>
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setSearchOpen(true)} title="Mesajlarda ara">
          <Search className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

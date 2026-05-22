import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  MessageSquare, 
  Search, 
  User, 
  Send, 
  Clock, 
  CheckCheck,
  MoreVertical,
  Phone,
  Globe,
  Tag as TagIcon,
  Sparkles,
  RefreshCcw
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { cn, safeFormatDate } from '../lib/utils';
import { toast } from 'sonner';



export function InboxPage() {
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: inbox = [], isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const res = await api.get('/inbox');
      return res.data;
    },
    refetchInterval: 10000
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedLeadId],
    queryFn: async () => {
      const res = await api.get(`/messages/${selectedLeadId}`);
      return res.data;
    },
    enabled: !!selectedLeadId,
    refetchInterval: 5000
  });

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      return api.post('/whatsapp/enqueue', {
        leadId: selectedLeadId,
        content: replyText
      });
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedLeadId] });
      toast.success('Yanıt gönderildi');
    }
  });

  const suggestReplyMutation = useMutation({
    mutationFn: async () => {
      const history = messages.slice(-5).map((m: any) => `${m.direction}: ${m.content}`).join('\n');
      const res = await api.post('/ai/suggest-reply', {
        leadId: selectedLeadId,
        history
      });
      return res.data;
    },
    onSuccess: (data) => {
      setReplyText(data.suggestion);
      toast.success('AI yanıt önerisi oluşturuldu');
    }
  });

  const selectedLead = inbox.find((item: any) => item.leadId === selectedLeadId)?.lead;

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* Sidebar - Conversation List */}
      <div className="w-80 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <Input 
            placeholder="Mesajlarda ara..." 
            className="pl-10 rounded-xl bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 focus:border-emerald-500/50 shadow-xl font-bold text-xs h-11 text-zinc-150 placeholder-slate-400 dark:placeholder-zinc-500" 
          />
        </div>
        
        <ScrollArea className="flex-1 rounded-2xl bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 shadow-xl overflow-hidden">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-black text-emerald-500/60 uppercase tracking-widest animate-pulse">Yükleniyor...</div>
            ) : inbox.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-zinc-550">Mesaj bulunamadı.</div>
            ) : inbox.map((item: any) => (
              <button
                key={item.leadId}
                onClick={() => setSelectedLeadId(item.leadId)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl transition-all group relative border",
                  selectedLeadId === item.leadId 
                    ? "bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]" 
                    : "hover:bg-zinc-800/30 border-transparent"
                )}
              >
                <div className="flex gap-3 items-start">
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/60 flex items-center justify-center text-slate-400 shrink-0">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">{item.lead.businessName}</h4>
                      <span className="text-[9px] font-bold text-slate-500">{safeFormatDate(item.createdAt, 'HH:mm')}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 truncate leading-relaxed">
                       {item.direction === 'OUTGOING' && <span className="text-emerald-400 mr-1 font-bold">Sen:</span>}
                       {item.content}
                    </p>
                  </div>
                </div>
                {item.direction === 'INCOMING' && item.status === 'UNREAD' && (
                  <div className="absolute right-4 bottom-4 size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main - Chat View */}
      <div className="flex-1 bg-[#0c1220]/50 backdrop-blur-sm rounded-[32px] shadow-xl border border-white/5 hover:border-white/15 flex flex-col overflow-hidden">
        {selectedLeadId ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  {selectedLead?.businessName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-amber-400 dark:via-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent leading-tight">{selectedLead?.businessName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                     <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Phone size={10} className="text-emerald-500" /> {selectedLead?.phone}
                     </span>
                     <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                       <span className="relative flex h-1.5 w-1.5">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                       </span>
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Çevrimiçi</span>
                     </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-zinc-800/40 transition-colors"><Globe size={18} /></Button>
                 <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-zinc-800/40 transition-colors"><TagIcon size={18} /></Button>
                 <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-zinc-800/40 transition-colors"><MoreVertical size={18} /></Button>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-6 bg-white/90 dark:bg-zinc-950/60">
              <div className="space-y-6">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={cn("flex", msg.direction === 'OUTGOING' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] p-4 rounded-2xl shadow-sm",
                      msg.direction === 'OUTGOING' 
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 font-semibold rounded-tr-none shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                        : "bg-slate-100/80 dark:bg-zinc-900/80 text-white rounded-tl-none border border-slate-200/80 dark:border-zinc-800/60 shadow-md"
                    )}>
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                      <div className={cn(
                        "mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter",
                        msg.direction === 'OUTGOING' ? "text-emerald-950/70 justify-end" : "text-zinc-550"
                      )}>
                        {safeFormatDate(msg.createdAt, 'HH:mm')}
                        {msg.direction === 'OUTGOING' && <CheckCheck size={12} className="text-emerald-950/70" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-6 border-t border-white/5 hover:border-white/15 bg-white dark:bg-zinc-950/30 backdrop-blur-md">
              <div className="relative group">
                <Textarea 
                  placeholder="Mesajınızı buraya yazın..." 
                  className="min-h-[100px] rounded-2xl border-slate-200/80 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/50 p-6 pr-20 font-medium text-sm text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all resize-none"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
                <Button 
                  className="absolute right-4 bottom-4 size-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 border-none"
                  disabled={!replyText || sendReplyMutation.isPending}
                  onClick={() => sendReplyMutation.mutate()}
                >
                  <Send size={20} />
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500">Shift + Enter ile yeni satır, Enter ile gönder.</p>
                <div className="flex items-center gap-2">
                   <Badge 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 border-none font-black text-[9px] px-3 py-1.5 rounded-full cursor-pointer hover:from-emerald-450 hover:to-emerald-350 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
                    onClick={() => suggestReplyMutation.mutate()}
                   >
                     {suggestReplyMutation.isPending ? <RefreshCcw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                     AI Yanıt Öner
                   </Badge>
                   <Badge className="bg-white/5 border border-white/5 text-slate-400 hover:text-slate-100 font-black text-[9px] px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 transition-all">Hızlı Yanıtlar</Badge>
                   <Badge className="bg-white/5 border border-white/5 text-slate-400 hover:text-slate-100 font-black text-[9px] px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 transition-all">Şablonlar</Badge>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#0c1220]/50 backdrop-blur-sm">
             <div className="bg-white/90 dark:bg-zinc-950/60 border border-white/5 hover:border-white/15 p-8 rounded-[40px] shadow-xl mb-6">
                <MessageSquare className="size-16 text-emerald-500/20" />
             </div>
             <h3 className="text-xl font-black bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-amber-400 dark:via-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">Mesajlaşmaya Başlayın</h3>
             <p className="text-sm text-slate-400 font-medium mt-2 max-w-xs">Soldaki listeden bir lead seçerek görüşmeleri görüntüleyebilir ve yanıtlayabilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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

const API_URL = 'http://localhost:3001/api';
const MOCK_USER_ID = 'mock-admin-user-id';

export function InboxPage() {
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: inbox = [], isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/inbox`);
      return res.data;
    },
    refetchInterval: 10000
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedLeadId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/messages/${selectedLeadId}`);
      return res.data;
    },
    enabled: !!selectedLeadId,
    refetchInterval: 5000
  });

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      return axios.post(`${API_URL}/whatsapp/enqueue`, {
        leadId: selectedLeadId,
        content: replyText,
        userId: MOCK_USER_ID
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
      const res = await axios.post(`${API_URL}/ai/suggest-reply`, {
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input placeholder="Mesajlarda ara..." className="pl-10 rounded-xl bg-white border-none shadow-sm font-bold text-xs h-11" />
        </div>
        
        <ScrollArea className="flex-1 rounded-3xl bg-white shadow-sm border border-slate-50 overflow-hidden">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Yükleniyor...</div>
            ) : inbox.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">Mesaj bulunamadı.</div>
            ) : inbox.map((item: any) => (
              <button
                key={item.leadId}
                onClick={() => setSelectedLeadId(item.leadId)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl transition-all group relative",
                  selectedLeadId === item.leadId ? "bg-blue-50 shadow-sm border border-blue-100" : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <div className="flex gap-3 items-start">
                  <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-black text-slate-800 truncate">{item.lead.businessName}</h4>
                      <span className="text-[9px] font-bold text-slate-400">{safeFormatDate(item.createdAt, 'HH:mm')}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 truncate leading-relaxed">
                       {item.direction === 'OUTGOING' && <span className="text-blue-500 mr-1 font-bold">Sen:</span>}
                       {item.content}
                    </p>
                  </div>
                </div>
                {item.direction === 'INCOMING' && item.status === 'UNREAD' && (
                  <div className="absolute right-4 bottom-4 size-2 rounded-full bg-blue-600 shadow-lg shadow-blue-200" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main - Chat View */}
      <div className="flex-1 bg-white rounded-[32px] shadow-sm border border-slate-50 flex flex-col overflow-hidden">
        {selectedLeadId ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                  {selectedLead?.businessName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{selectedLead?.businessName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                     <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Phone size={10} /> {selectedLead?.phone}
                     </span>
                     <Badge className="bg-green-50 text-green-600 border-none font-black text-[9px] px-2 py-0.5 rounded-full">Çevrimiçi</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" className="rounded-xl text-slate-400"><Globe size={18} /></Button>
                 <Button variant="ghost" size="icon" className="rounded-xl text-slate-400"><TagIcon size={18} /></Button>
                 <Button variant="ghost" size="icon" className="rounded-xl text-slate-400"><MoreVertical size={18} /></Button>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-6 bg-slate-50/30">
              <div className="space-y-6">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={cn("flex", msg.direction === 'OUTGOING' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] p-4 rounded-3xl shadow-sm",
                      msg.direction === 'OUTGOING' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                    )}>
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                      <div className={cn(
                        "mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter",
                        msg.direction === 'OUTGOING' ? "text-blue-100 justify-end" : "text-slate-400"
                      )}>
                        {safeFormatDate(msg.createdAt, 'HH:mm')}
                        {msg.direction === 'OUTGOING' && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-6 border-t border-slate-50 bg-white">
              <div className="relative group">
                <Textarea 
                  placeholder="Mesajınızı buraya yazın..." 
                  className="min-h-[100px] rounded-3xl border-slate-100 bg-slate-50/50 p-6 pr-20 font-medium text-sm focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
                <Button 
                  className="absolute right-4 bottom-4 size-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-transform active:scale-95"
                  disabled={!replyText || sendReplyMutation.isPending}
                  onClick={() => sendReplyMutation.mutate()}
                >
                  <Send size={20} />
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400">Shift + Enter ile yeni satır, Enter ile gönder.</p>
                <div className="flex items-center gap-2">
                   <Badge 
                    className="bg-blue-600 text-white border-none font-black text-[9px] px-2 py-1 rounded-full cursor-pointer hover:bg-blue-700 flex items-center gap-1"
                    onClick={() => suggestReplyMutation.mutate()}
                   >
                     {suggestReplyMutation.isPending ? <RefreshCcw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                     AI Yanıt Öner
                   </Badge>
                   <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] px-2 py-1 rounded-full cursor-pointer hover:bg-slate-200">Hızlı Yanıtlar</Badge>
                   <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] px-2 py-1 rounded-full cursor-pointer hover:bg-slate-200">Şablonlar</Badge>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/30">
             <div className="bg-white p-8 rounded-[40px] shadow-sm mb-6">
                <MessageSquare className="size-16 text-blue-100" />
             </div>
             <h3 className="text-xl font-black text-slate-800">Mesajlaşmaya Başlayın</h3>
             <p className="text-sm text-slate-400 font-medium mt-2 max-w-xs">Soldaki listeden bir lead seçerek görüşmeleri görüntüleyebilir ve yanıtlayabilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}

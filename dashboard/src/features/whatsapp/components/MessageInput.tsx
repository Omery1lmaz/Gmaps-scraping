import React from 'react';
import { Clock, X, ImageIcon, Music4, Video, FileText, Sparkles, Loader2, Paperclip, Send } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { cn } from '../../../lib/utils';

interface MessageInputProps {
  messageText: string;
  setMessageText: (text: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isSchedulerOpen: boolean;
  setIsSchedulerOpen: (open: boolean) => void;
  scheduleTime: string;
  setScheduleTime: (time: string) => void;
  scheduleText: string;
  setScheduleText: (text: string) => void;
  scheduleMessage: () => void;
  templates: any[];
  selectedTemplateId: string;
  handleTemplateChange: (id: string) => void;
  suggestReply: (context?: string) => void;
  suggestReplyPending: boolean;
  handleSend: () => void;
  sendPending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  connected?: boolean;
}

export function MessageInput({
  messageText,
  setMessageText,
  selectedFile,
  setSelectedFile,
  isSchedulerOpen,
  setIsSchedulerOpen,
  scheduleTime,
  setScheduleTime,
  scheduleText,
  setScheduleText,
  scheduleMessage,
  templates,
  selectedTemplateId,
  handleTemplateChange,
  suggestReply,
  suggestReplyPending,
  handleSend,
  sendPending,
  fileInputRef,
  connected = false
}: MessageInputProps) {
  return (
    <div className="border-t border-white/5 p-5 bg-[#0c1220]/60 backdrop-blur-xl relative">
      {!connected && (
        <div className="absolute inset-x-0 -top-10 flex justify-center z-20">
          <div className="bg-amber-500 text-black text-[10px] font-black px-4 py-1.5 rounded-t-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 uppercase tracking-widest">
            <Clock size={12} className="animate-pulse" /> Mesaj Gönderimi İçin Bağlantı Bekleniyor
          </div>
        </div>
      )}
      {/* Scheduled Message Inline Form */}
      {isSchedulerOpen && (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest"><Clock className="size-4" /> Mesajı İleri Bir Tarihe Zamanla</span>
            <button onClick={() => setIsSchedulerOpen(false)} className="text-slate-500 hover:text-white transition active:scale-90"><X className="size-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Gönderim Tarihi & Saati</label>
              <Input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-11 rounded-xl border-white/5 bg-white/5 text-xs font-bold text-white focus:border-emerald-500/30 transition-all shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mesaj İçeriği</label>
              <Textarea
                placeholder="Zaman geldiğinde otomatik olarak gönderilecek mesajı buraya yazın..."
                value={scheduleText}
                onChange={(e) => setScheduleText(e.target.value)}
                className="min-h-[44px] h-11 resize-none rounded-xl border-white/5 bg-white/5 text-xs font-semibold py-3 text-white focus-visible:ring-emerald-500/20 placeholder:text-slate-600 transition-all shadow-inner"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="px-5 py-2 rounded-xl text-xs font-black text-slate-500 hover:text-slate-300 transition-all active:scale-95 uppercase tracking-wider" onClick={() => setIsSchedulerOpen(false)}>İptal</button>
            <Button size="sm" className="h-10 px-6 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/10 active:scale-95 transition-all uppercase tracking-wider" onClick={scheduleMessage}>Zamanla & Planla</Button>
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-50 bg-white/5 border border-slate-200/80 dark:border-zinc-800/60 px-4 py-2 text-xs font-bold text-slate-100 animate-slide-in">
          <span className="flex min-w-0 items-center gap-2 truncate">
            {selectedFile.type.startsWith('image/') ? <ImageIcon className="size-4 text-emerald-500" /> :
              selectedFile.type.startsWith('audio/') ? <Music4 className="size-4 text-purple-500" /> :
                selectedFile.type.startsWith('video/') ? <Video className="size-4 text-blue-500" /> :
                  <FileText className="size-4 text-slate-500" />}
            {selectedFile.name}
          </span>
          <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-100 dark:hover:text-slate-200 transition"><X className="size-4" /></button>
        </div>
      )}

      {/* AI suggested reply buttons directly above input */}
      <div className="mb-4 flex flex-wrap items-center gap-2 animate-in fade-in duration-500">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-amber-500 animate-pulse" /> Akıllı AI Draft:
        </span>
        <Button
          variant="outline"
          className="h-8.5 rounded-xl text-[10px] font-black border-white/5 bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all active:scale-95 duration-200 uppercase tracking-wider"
          disabled={suggestReplyPending}
          onClick={() => suggestReply('İşletmeye sunduğumuz B2B gmaps lead scraper ve WhatsApp otomasyon çözümlerimiz hakkında detaylı bilgi ver, özelliklerinden bahset.')}
        >
          💡 Bilgi Ver
        </Button>
        <Button
          variant="outline"
          className="h-8.5 rounded-xl text-[10px] font-black border-white/5 bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all active:scale-95 duration-200 uppercase tracking-wider"
          disabled={suggestReplyPending}
          onClick={() => suggestReply('İşletmeye 15 dakikalık ücretsiz bir demo ve randevu teklif et, uygun günlerini sor.')}
        >
          📅 Randevu Al
        </Button>
        <Button
          variant="outline"
          className="h-8.5 rounded-xl text-[10px] font-black border-white/5 bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all active:scale-95 duration-200 uppercase tracking-wider"
          disabled={suggestReplyPending}
          onClick={() => suggestReply('İşletmeye bugüne özel %20 indirim fırsatı sunan cazip bir teklif yap.')}
        >
          🎁 Özel Teklif Yap
        </Button>

        {suggestReplyPending && (
          <span className="text-[10px] font-black text-amber-400 flex items-center gap-2 ml-auto uppercase tracking-widest">
            <Loader2 className="size-3.5 animate-spin text-amber-500" /> AI Düşünüyor...
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
        <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-90 shadow-inner shrink-0" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="size-5" />
        </Button>
        <Textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (connected) handleSend();
            }
          }}
          placeholder={connected ? "Göndermek üzere bir mesaj yazın veya şablon ekleyin..." : "Bağlantı koptuğu için şu an mesaj gönderemezsiniz..."}
          disabled={!connected}
          className="min-h-14 flex-1 resize-none rounded-2xl border-white/5 bg-white/5 p-4 text-xs font-bold text-white focus-visible:ring-emerald-500/10 placeholder:text-slate-600 shadow-inner transition-all disabled:opacity-50"
        />
        <Button 
          className="h-14 w-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/10 active:scale-90 transition-all shrink-0 disabled:bg-slate-800 disabled:text-slate-500" 
          disabled={sendPending || !connected || (!messageText.trim() && !selectedFile)} 
          onClick={handleSend}
        >
          {sendPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedTemplateId} onValueChange={(value) => handleTemplateChange(value || '')}>
            <SelectTrigger className="h-10 w-52 rounded-xl border-white/5 bg-white/5 text-[10px] font-black text-slate-300 uppercase tracking-widest focus:ring-emerald-500/20 transition-all shadow-inner">
              <SelectValue placeholder="📄 Şablon seç & doldur" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 bg-slate-900 text-white font-black">
              {(templates || []).map((template: any) => (
                <SelectItem key={template.id} value={template.id} className="text-[10px] focus:bg-emerald-500 focus:text-black">
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className={cn(
              'h-10 px-5 rounded-xl text-[10px] font-black transition-all active:scale-95 duration-200 border uppercase tracking-widest flex items-center gap-2 shadow-inner',
              isSchedulerOpen 
                ? 'bg-emerald-500 text-black border-transparent shadow-emerald-500/20' 
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
            )}
            onClick={() => setIsSchedulerOpen(!isSchedulerOpen)}
          >
            <Clock size={14} className={cn(isSchedulerOpen && 'animate-pulse')} /> Mesaj Zamanla
          </Button>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-inner">
          <Clock size={12} className="text-emerald-500/60" /> Otomatik gecikme koruması aktif
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Loader2, ChevronUp, MessageCircle as MessageCircleIcon, X, Clock, Check, CheckCheck, Phone, User as UserIcon, AlertCircle, MapPin, Music4 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn, safeFormatDate } from '../../../lib/utils';
import { getDateLabel } from '../whatsapp-utils';
import { highlightText } from './Chat/highlightText';
import { MediaPreview } from './Chat/MediaPreview';

interface MessageListProps {
  allMessages: any[];
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  messageSearchQuery: string;
  searchedMsgIds: string[];
  highlightedMsgIndex: number;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scheduledMessages: any[];
  selectedChatId: string;
  cancelScheduledMessage: (id: string) => void;
}

export function MessageList({
  allMessages,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  messageSearchQuery,
  searchedMsgIds,
  highlightedMsgIndex,
  messagesContainerRef,
  messagesEndRef,
  handleScroll,
  scheduledMessages,
  selectedChatId,
  cancelScheduledMessage
}: MessageListProps) {
  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-transparent p-5"
    >
      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-emerald-500" />
          <span className="ml-2 text-xs font-bold text-slate-400">Daha eski mesajlar yükleniyor...</span>
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-100" onClick={() => fetchNextPage()}>
            <ChevronUp className="size-3.5 mr-1" /> Daha eski mesajları yükle
          </Button>
        </div>
      )}

      <div className="space-y-4 pb-4">
        {allMessages.length === 0 && !isFetchingNextPage ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center py-16 text-slate-300 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative flex size-20 items-center justify-center rounded-3xl bg-white/5 mb-6 shadow-inner animate-in fade-in">
              <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 animate-ping opacity-20" />
              <MessageCircleIcon className="size-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-200">Henüz Mesaj Yok</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 max-w-[250px] text-center leading-relaxed">
              Bu sohbet için henüz bir mesaj bulunmuyor. Yeni bir mesaj göndererek veya geçmişi senkronize ederek başlayın.
            </p>
          </div>
        ) : allMessages.map((message: any, index: number) => {
          const isSearchHighlighted = messageSearchQuery && (searchedMsgIds.includes(message._id || message.id)) &&
            (searchedMsgIds[highlightedMsgIndex] === (message._id || message.id));
          
          const prevMessage = index > 0 ? allMessages[index - 1] : null;
          const currentDate = new Date(message.timestamp).toDateString();
          const prevDate = prevMessage ? new Date(prevMessage.timestamp).toDateString() : null;
          const showDateSeparator = currentDate !== prevDate;

          return (
            <React.Fragment key={message._id || message.id || index}>
              {showDateSeparator && (
                <div className="flex justify-center my-6">
                  <span className="px-4 py-1.5 bg-white/5 text-[10px] font-black text-slate-400 rounded-xl border border-white/5 shadow-2xl animate-in fade-in duration-300 uppercase tracking-widest">
                    {getDateLabel(message.timestamp)}
                  </span>
                </div>
              )}
              <div
                id={`msg-${message._id || message.id}`}
                className={cn(
                  'flex transition-all duration-300 rounded-2xl animate-in fade-in slide-in-from-bottom-2',
                  message.direction === 'OUTGOING' ? 'justify-end' : 'justify-start',
                  isSearchHighlighted && 'ring-2 ring-emerald-500/50 ring-offset-4 ring-offset-[#080b10] bg-emerald-500/10 scale-[1.02]'
                )}
              >
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-5 py-3.5 shadow-2xl transition duration-300',
                  message.direction === 'OUTGOING'
                    ? 'rounded-tr-sm bg-gradient-to-tr from-emerald-600 to-emerald-500 text-black font-semibold shadow-emerald-500/10'
                    : 'rounded-tl-sm border border-white/5 bg-white/5 text-slate-200',
                )}>
                  {message.body && (
                    <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed">
                      {messageSearchQuery ? (
                        highlightText(message.body, messageSearchQuery)
                      ) : (
                        message.body
                      )}
                    </p>
                  )}

                  {(message.type === 'call' || message.type === 'call_log') && (
                    <div className="flex items-center gap-2 py-1 text-slate-400 italic text-xs font-bold">
                      <Phone size={14} className="text-rose-500" />
                      <span>{message.body || 'Cevapsız Arama'}</span>
                    </div>
                  )}

                  {message.type === 'ciphertext' && (
                    <div className="flex items-center gap-2 py-1 text-slate-500 italic text-[11px]">
                      <Clock size={12} />
                      <span>Bu mesaj henüz gelmedi. Lütfen telefonunuzu kontrol edin.</span>
                    </div>
                  )}

                  {message.type === 'revoked' && (
                    <div className="flex items-center gap-2 py-1 text-slate-500 italic text-[11px]">
                      <AlertCircle size={12} />
                      <span>Bu mesaj silindi.</span>
                    </div>
                  )}

                  {message.type === 'vcard' && (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/5 mt-1">
                      <UserIcon size={20} className="text-emerald-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">Kişi Kartı</p>
                        <p className="text-[10px] text-slate-500 truncate">VCard Paylaşıldı</p>
                      </div>
                    </div>
                  )}

                  {message.type === 'location' && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-2 py-1 text-slate-400 font-bold text-xs">
                        <MapPin size={14} className="text-emerald-500" />
                        <span>Konum Paylaşıldı</span>
                      </div>
                      {message.body && <p className="text-[11px] text-slate-300">{message.body}</p>}
                    </div>
                  )}

                  {message.type === 'ptt' && (
                    <div className="flex items-center gap-2 py-1 text-slate-400 font-bold text-xs">
                      <Music4 size={14} className="text-emerald-500" />
                      <span>Sesli Mesaj</span>
                    </div>
                  )}

                  {['gp2', 'notification_template', 'e2e_notification', 'groups_v2_notification'].includes(message.type) && (
                    <div className="flex items-center gap-2 py-1 text-slate-500 italic text-[10px]">
                      <span>{message.body || 'Sistem Bildirimi'}</span>
                    </div>
                  )}

                  {!['chat', 'image', 'video', 'ptt', 'audio', 'document', 'vcard', 'location', 'call', 'call_log', 'ciphertext', 'revoked', 'gp2', 'notification_template', 'e2e_notification', 'groups_v2_notification'].includes(message.type) && (
                    <div className="flex items-center gap-2 py-1 text-slate-500 italic text-[11px]">
                      <span>Sistem Mesajı ({message.type})</span>
                    </div>
                  )}

                  {message.media?.map((media: any) => <MediaPreview key={media.id || media._id} media={media} />)}

                  <div className={cn('mt-2 flex flex-col items-end gap-1.5 text-[9px] font-black', message.direction === 'OUTGOING' ? 'text-emerald-100' : 'text-slate-400')}>
                    <div className="flex items-center gap-1.5">
                      <span>{safeFormatDate(message.timestamp, 'HH:mm')}</span>
                      {message.direction === 'OUTGOING' && (
                        <div className="flex items-center ml-0.5">
                          {message.status === 'QUEUED' || message.status === 'PENDING' ? (
                            <Clock size={10} className="text-amber-400" />
                          ) : message.status === 'SENT' ? (
                            <Check size={12} className="text-slate-300" />
                          ) : message.status === 'DELIVERED' ? (
                            <CheckCheck size={12} className="text-slate-300" />
                          ) : message.status === 'READ' ? (
                            <CheckCheck size={12} className="text-sky-400" />
                          ) : message.status === 'FAILED' ? (
                            <AlertCircle size={10} className="text-rose-400" />
                          ) : (
                            <span className="uppercase text-[7px]">{message.status}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {message.status === 'FAILED' && (
                      <span className="text-[9px] text-rose-200 mt-0.5 max-w-[200px] text-right break-words bg-rose-900/30 px-2 py-1 rounded-md border border-rose-500/30 shadow-xl leading-tight">
                        Hata: {(message.error && message.error.length > 1) ? message.error : 'Mesaj gönderilemedi. WhatsApp bağlantınızı kontrol edin.'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Scheduled Messages List */}
        {scheduledMessages.filter((m) => m.chatId === selectedChatId).length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200/50 bg-amber-50/20 p-4 space-y-3.5 shadow-xl animate-fade-in">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5"><Clock className="size-3.5 animate-pulse text-amber-500" /> Bu Sohbet İçin Zamanlanmış Mesajlar</p>
            <div className="space-y-2">
              {scheduledMessages.filter((m) => m.chatId === selectedChatId).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-[#0c1220]/50 backdrop-blur-sm bg-white dark:bg-zinc-950 border border-slate-100/80 dark:border-slate-800 p-3 text-xs font-semibold text-slate-100 shadow-xl transition hover:border-amber-200/50 duration-200">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-[12px] font-black text-white leading-normal">{m.text}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">🗓️ Gönderim Tarihi: {new Date(m.time).toLocaleString('tr-TR')}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-xl text-rose-600 hover:bg-rose-50 active:scale-95 transition"
                    onClick={() => cancelScheduledMessage(m.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

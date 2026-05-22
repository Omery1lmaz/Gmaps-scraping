import React from 'react';
import { Sparkles, ShieldCheck, Lock, Flame, UserPlus, Loader2, Shield, Notebook, Gauge, Activity, Layers, Zap, CheckCircle2, Phone } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { displayName } from '../whatsapp-utils';

interface RightSidebarProps {
  showRightPanel: boolean;
  activeRightTab: 'copilot' | 'antiban';
  setActiveRightTab: (tab: 'copilot' | 'antiban') => void;
  connected: boolean;
  selectedChat: any;
  chatNotes: Record<string, string>;
  updateNotes: (chatId: string, note: string) => void;
  suggestReply: (context?: string) => void;
  suggestReplyPending: boolean;
  convertLead: () => void;
  convertLeadPending: boolean;
  antiBanMode: 'safe' | 'normal' | 'fast';
  setAntiBanMode: (mode: 'safe' | 'normal' | 'fast') => void;
  antiBanAudit: { score: number; rules: string[] };
  customDelayMin: number;
  setCustomDelayMin: (val: number) => void;
  customDelayMax: number;
  setCustomDelayMax: (val: number) => void;
  dailyWarmingLimit: number;
  setDailyWarmingLimit: (val: number) => void;
  metrics: { latency: string; ramUsage: string; cpuLoad: string; sandbox: string };
  newPhone: string;
  setNewPhone: (val: string) => void;
  startChat: () => void;
  startChatPending: boolean;
  isSheet?: boolean;
}

export function RightSidebar({
  showRightPanel,
  activeRightTab,
  setActiveRightTab,
  connected,
  selectedChat,
  chatNotes,
  updateNotes,
  suggestReply,
  suggestReplyPending,
  convertLead,
  convertLeadPending,
  antiBanMode,
  setAntiBanMode,
  antiBanAudit,
  customDelayMin,
  setCustomDelayMin,
  customDelayMax,
  setCustomDelayMax,
  dailyWarmingLimit,
  setDailyWarmingLimit,
  metrics,
  newPhone,
  setNewPhone,
  startChat,
  startChatPending,
  isSheet = false
}: RightSidebarProps) {
  const content = (
    <>
      {/* Tab Selection */}
      <div className="flex rounded-2xl bg-white/5 p-1 font-bold mb-4">
        <button
          onClick={() => setActiveRightTab('copilot')}
          className={cn(
            'flex-1 text-center py-2.5 text-xs rounded-xl font-black transition-all flex items-center justify-center gap-1.5 duration-200',
            activeRightTab === 'copilot' ? 'bg-white/10 shadow-xl text-white' : 'text-slate-400 hover:text-slate-100'
          )}
        >
          <Sparkles size={14} className={activeRightTab === 'copilot' ? 'text-amber-500' : 'text-slate-400'} /> Copilot & Lead
        </button>
        <button
          onClick={() => setActiveRightTab('antiban')}
          className={cn(
            'flex-1 text-center py-2.5 text-xs rounded-xl font-black transition-all flex items-center justify-center gap-1.5 duration-200',
            activeRightTab === 'antiban' ? 'bg-white/10 shadow-xl text-white' : 'text-slate-400 hover:text-slate-100'
          )}
        >
          <ShieldCheck size={14} className={activeRightTab === 'antiban' ? 'text-emerald-500' : 'text-slate-400'} /> Güvenlik & Hız
        </button>
      </div>

      {!connected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative bg-gradient-to-tr from-slate-700 to-slate-800 p-4.5 rounded-2xl shadow-xl shadow-black/20 mb-4 animate-pulse z-10">
            <Lock className="size-8 text-slate-400" />
          </div>
          <h4 className="text-sm font-black text-white mb-2 z-10">Bağlantı Bekleniyor</h4>
          <p className="text-xs font-semibold text-slate-400 max-w-[220px] leading-relaxed z-10">
            Müşteri profil kartı, AI Copilot asistanı ve akıllı güvenlik yapılandırmaları WhatsApp hesabınız bağlandığında aktif olacaktır.
          </p>
        </div>
      ) : activeRightTab === 'copilot' ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {selectedChat ? (
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Müşteri Profil Kartı</h3>
                <div className="mt-2.5 rounded-2xl bg-white/5 border border-white/5 p-4 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-white truncate">{displayName(selectedChat)}</p>
                    <Badge className="border-none bg-emerald-500/10 text-emerald-400 text-[8px] font-black flex items-center gap-0.5">
                      <Flame size={10} className="text-amber-500 fill-amber-500 animate-pulse" /> YÜKSEK
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">{selectedChat.contact?.phone || selectedChat.jid}</p>

                  {selectedChat.lead ? (
                    <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                        <span>Sektör (Gmaps):</span>
                        <span className="text-slate-100 font-bold">{selectedChat.lead.category || 'Belirtilmemiş'}</span>
                      </div>
                      {selectedChat.lead.city && (
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Bölge:</span>
                          <span className="text-slate-100 font-bold">{selectedChat.lead.city}</span>
                        </div>
                      )}
                      {selectedChat.lead.rating && (
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Puan (Yorum):</span>
                          <span className="text-slate-100 font-bold">{selectedChat.lead.rating} ★ ({selectedChat.lead.reviews || selectedChat.lead.reviewCount || 0})</span>
                        </div>
                      )}
                      {selectedChat.lead.website && (
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Web:</span>
                          <a href={selectedChat.lead.website} target="_blank" rel="noreferrer" className="text-emerald-500 font-bold truncate max-w-40 hover:underline">{selectedChat.lead.website}</a>
                        </div>
                      )}

                      {/* AI Scores if available */}
                      {selectedChat.lead.aiQualityScore && (
                        <div className="mt-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black text-emerald-400">
                            <span>AI Kalite Puanı:</span>
                            <span>{selectedChat.lead.aiQualityScore}/100</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${selectedChat.lead.aiQualityScore}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                        Bu kişi henüz lead havuzuna dahil edilmemiş. Lead'e dönüştürerek teklif şablonlarını otomatik veriyle doldurabilir ve AI asistanını aktif edebilirsiniz.
                      </p>
                      <Button
                        className="mt-4.5 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold shadow-lg shadow-emerald-500/10 active:scale-95 transition-all duration-200"
                        disabled={!selectedChat.contact?.id && !selectedChat.id || convertLeadPending}
                        onClick={convertLead}
                      >
                        {convertLeadPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />} Lead'e Dönüştür
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* AI Quick offer Generator */}
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">AI Copilot Hızlı Aksiyon</h3>
                <div className="mt-3 space-y-2.5">
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-2xl border-white/5 bg-white/5 text-xs font-black hover:bg-white/10 text-slate-100 active:scale-98 transition duration-200"
                    disabled={suggestReplyPending}
                    onClick={() => suggestReply('İşletmenin sektörel zayıflıklarını kapatacak özel bir %15 hoş geldin indirimi ve B2B otomasyon avantajları sun.')}
                  >
                    🎁 Hoş Geldin İndirimi Sun
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-2xl border-white/5 bg-white/5 text-xs font-black hover:bg-white/10 text-slate-100 active:scale-98 transition duration-200"
                    disabled={suggestReplyPending}
                    onClick={() => suggestReply('İşletme sahibiyle 10 dakikalık çok kısa bir B2B verimlilik analizi zoom çağrısı planlamak için teklif et.')}
                  >
                    📅 Zoom Görüşmesi Teklif Et
                  </Button>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Customer Sticky Notes Widget */}
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5"><Notebook size={13} className="text-amber-500" /> Müşteri Sticky Notları</h3>
                <div className="mt-3 relative">
                  <textarea
                    value={chatNotes[selectedChat.id] || ''}
                    onChange={(e) => updateNotes(selectedChat.id, e.target.value)}
                    placeholder="Bu müşteri hakkında önemli notlar alın..."
                    className="w-full min-h-[90px] rounded-2xl border border-white/5 bg-amber-500/5 p-3.5 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-y transition duration-200 leading-relaxed"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[9px] font-black text-slate-500 tracking-wider">✍️ OTOMATİK KAYDEDİLİR</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <p className="text-xs font-bold text-slate-500">Aktif bir sohbet seçtiğinizde, lead analizi ve AI menüleri burada belirecektir.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          {/* Anti-ban mode select */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Shield size={14} className="text-emerald-500" /> Akıllı Anti-Ban Presets
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-white/5 p-1 font-bold">
              {(['safe', 'normal', 'fast'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAntiBanMode(mode)}
                  className={cn(
                    'text-center py-2 text-[10px] rounded-xl font-black capitalize transition-all duration-200',
                    antiBanMode === mode ? 'bg-white/10 shadow-xl text-white' : 'text-slate-400 hover:text-slate-100'
                  )}
                >
                  {mode === 'safe' ? 'Güvenli' : mode === 'normal' ? 'Normal' : 'Hızlı'}
                </button>
              ))}
            </div>
          </div>

          {/* Anti-Ban Audit Score Gauge */}
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Isınma & Güvenlik Skoru</span>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-black',
                antiBanAudit.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                  antiBanAudit.score >= 50 ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400 animate-pulse'
              )}>
                {antiBanAudit.score} / 100
              </span>
            </div>

            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500 ease-out',
                  antiBanAudit.score >= 80 ? 'bg-emerald-500' :
                    antiBanAudit.score >= 50 ? 'bg-amber-500' :
                      'bg-rose-500'
                )}
                style={{ width: `${antiBanAudit.score}%` }}
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/5">
              {antiBanAudit.rules.map((rule, idx) => (
                <p key={idx} className="text-[10px] font-bold leading-normal text-slate-400 flex items-start gap-1">{rule}</p>
              ))}
            </div>
          </div>

          {/* Slider simulation config details */}
          <div className="rounded-2xl bg-white/5 border border-white/5 p-3.5 space-y-3.5 text-xs font-bold text-slate-100">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Min Gecikme:</span>
                <span className="text-emerald-400">{customDelayMin}sn</span>
              </div>
              <input
                type="range"
                min="5"
                max="180"
                value={customDelayMin}
                onChange={(e) => setCustomDelayMin(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Max Gecikme:</span>
                <span className="text-emerald-400">{customDelayMax}sn</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                value={customDelayMax}
                onChange={(e) => setCustomDelayMax(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Günlük Limit:</span>
                <span className="text-emerald-400">{dailyWarmingLimit} /gün</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                value={dailyWarmingLimit}
                onChange={(e) => setDailyWarmingLimit(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Health and system metrics */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Gauge size={14} className="text-emerald-500" /> Sistem Metrikleri
            </h3>
            <div className="mt-3 space-y-2 text-xs font-bold text-slate-100">
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 border border-white/5">
                <span className="flex items-center gap-1.5"><Activity size={12} className="text-emerald-500 animate-pulse" /> Ping</span>
                <span className="text-emerald-400 font-black">{metrics.latency}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 border border-white/5">
                <span className="flex items-center gap-1.5"><Layers size={12} className="text-amber-500" /> RAM</span>
                <span className="text-white font-black">{metrics.ramUsage}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 border border-white/5">
                <span className="flex items-center gap-1.5"><Zap size={12} className="text-indigo-400" /> CPU</span>
                <span className="text-white font-black">{metrics.cpuLoad}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick new chat starter input */}
      <div className="mt-auto border-t border-white/5 pt-4.5">
        <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Hızlı Yeni Sohbet Başlat</h3>
        <div className="mt-2.5 space-y-2">
          <Input 
            value={newPhone} 
            onChange={(event) => setNewPhone(event.target.value)} 
            placeholder="Telefon (+90...)" 
            className="h-10 rounded-xl border-white/5 bg-white/5 text-xs font-bold text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-emerald-500/30 transition-all" 
          />
          <Button
            className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow-lg shadow-emerald-600/10 active:scale-95 transition-all duration-200"
            disabled={!newPhone || startChatPending}
            onClick={startChat}
          >
            {startChatPending ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="mr-1.5 size-3.5" />} Yeni Sohbet Aç
          </Button>
        </div>
      </div>
    </>
  );

  if (isSheet) {
    return content;
  }

  return (
    <aside className={cn(showRightPanel ? 'block' : 'hidden', 'md:flex min-h-0 flex-col gap-4 rounded-3xl border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm shadow-xl backdrop-blur-md p-4.5')}>
      {content}
    </aside>
  );
}

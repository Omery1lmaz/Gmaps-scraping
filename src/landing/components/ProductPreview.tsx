import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Brain, Star, Search, Sparkles, Filter, MapPin, Zap, MessageCircle } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../locales/translations'

export function ProductPreview() {
  const { language } = useLanguage()
  const t = translations[language].productPreview
  const [activeTab, setActiveTab] = useState<'leads' | 'ai' | 'analytics'>('leads')

  const leadsData = [
    { 
      name: language === 'tr' ? 'Lincoln Diş Kliniği' : 'Lincoln Dental Care', 
      cat: language === 'tr' ? 'Diş Hekimi' : 'Dentist', 
      rating: 4.8, 
      reviews: 142, 
      phone: '+1 (312) 555-0199', 
      website: 'lincolndental.com', 
      status: 'Enriched' 
    },
    { 
      name: language === 'tr' ? 'Apex Oto Servis' : 'Apex Auto Garage', 
      cat: language === 'tr' ? 'Oto Tamir' : 'Auto Repair', 
      rating: 4.9, 
      reviews: 88, 
      phone: '+1 (312) 555-0122', 
      website: 'apexgarages.com', 
      status: 'Sent' 
    },
    { 
      name: language === 'tr' ? 'Orchard Pastane & Kafe' : 'Orchard Roast Cafe', 
      cat: language === 'tr' ? 'Kafe / Fırın' : 'Cafe / Bakery', 
      rating: 4.7, 
      reviews: 215, 
      phone: '+1 (312) 555-0188', 
      website: 'orchardroast.com', 
      status: 'Replied' 
    },
    { 
      name: language === 'tr' ? 'Greenfield Çiçekçilik' : 'Greenfield Florist', 
      cat: language === 'tr' ? 'Çiçekçi' : 'Florist', 
      rating: 4.5, 
      reviews: 54, 
      phone: '+1 (312) 555-0104', 
      website: 'greenfieldflorist.com', 
      status: 'Scraped' 
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enriched': 
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{language === 'tr' ? 'AI Zenginleştirildi' : 'AI Enriched'}</span>
      case 'Sent': 
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{language === 'tr' ? 'Mesaj Gönderildi' : 'Message Sent'}</span>
      case 'Replied': 
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{language === 'tr' ? 'Yanıtlandı' : 'Replied'}</span>
      default: 
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{language === 'tr' ? 'Çekildi' : 'Scraped'}</span>
    }
  }

  return (
    <section id="features" className="py-24 bg-[#080b10] relative overflow-hidden bg-grid-pattern">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            {t.title} <span className="text-gradient-tw">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal">
            {t.desc}
          </p>
        </motion.div>

        {/* Unified Application Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-5xl mx-auto rounded-2xl border border-white/10 bg-[#0c1220]/60 backdrop-blur-md overflow-hidden shadow-2xl"
        >
          
          {/* Top Application Bar */}
          <div className="bg-slate-900/80 px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            {/* Left side: Window dots + Name */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 shrink-0">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
              </div>
              <span className="text-sm font-bold text-white tracking-wide ml-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> {language === 'tr' ? 'LeadFlow Web Paneli' : 'LeadFlow Web Portal'}
              </span>
            </div>

            {/* Right side: Tabs matching actual apps */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
              {[
                { id: 'leads', label: t.tabs.leads, icon: Database },
                { id: 'ai', label: t.tabs.ai, icon: Brain },
                { id: 'analytics', label: t.tabs.analytics, icon: MessageCircle },
              ].map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

          </div>

          {/* Active Content Window */}
          <div className="p-6 min-h-[380px] bg-slate-950/20 text-left">
            <AnimatePresence mode="wait">
              
              {/* Tab 1: Lead Database (LeadsPage) */}
              {activeTab === 'leads' && (
                <motion.div
                  key="leads"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <div className="text-xs font-bold text-slate-400 tracking-wider">{t.leadsTable.title}</div>
                    <div className="flex gap-2">
                      <button className="bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" /> {language === 'tr' ? 'Filtrele' : 'Filter'}
                      </button>
                      <button className="bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        <Search className="w-3.5 h-3.5" /> {language === 'tr' ? 'Ara' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-medium text-slate-300">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/5">
                          <th className="py-3 text-left font-bold">{t.leadsTable.colName}</th>
                          <th className="py-3 text-left font-bold">{t.leadsTable.colCategory}</th>
                          <th className="py-3 text-left font-bold">{t.leadsTable.colRating}</th>
                          <th className="py-3 text-left font-bold">{t.leadsTable.colPhone}</th>
                          <th className="py-3 text-left font-bold">Website</th>
                          <th className="py-3 text-right font-bold">{t.leadsTable.colStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {leadsData.map((lead, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 font-bold text-white">{lead.name}</td>
                            <td className="py-4 text-slate-400">{lead.cat}</td>
                            <td className="py-4">
                              <span className="flex items-center gap-1 font-bold text-yellow-500">
                                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                {lead.rating} <span className="text-[10px] text-slate-500 font-medium">({lead.reviews})</span>
                              </span>
                            </td>
                            <td className="py-4 text-slate-300 font-mono">{lead.phone}</td>
                            <td className="py-4 text-green-400 truncate max-w-[120px]">{lead.website}</td>
                            <td className="py-4 text-right">{getStatusBadge(lead.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Visual Sequence Builder (SequenceBuilder) */}
              {activeTab === 'ai' && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <div className="text-xs font-bold text-slate-400 tracking-wider">{t.aiModel.title}</div>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black">
                      {language === 'tr' ? 'SÜRÜKLE BIRAK AKIŞ' : 'DRAG-AND-DROP CANVAS'}
                    </span>
                  </div>

                  {/* Flow Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center pt-2">
                    
                    {/* Node 1: Trigger */}
                    <div className="bg-[#121824] p-4 rounded-xl border border-white/5 relative group hover:border-indigo-500/30 transition-all min-h-[120px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 text-[9px] font-black text-indigo-400 uppercase">
                          <MapPin className="w-3 h-3" /> TRIGGER
                        </div>
                        <div className="text-[11px] font-bold text-white mb-1">Google Maps Scan</div>
                        <p className="text-[9px] text-slate-400 leading-normal">
                          {language === 'tr' ? 'Eklentiden senkronize edilen yeni potansiyel müşteriler.' : 'New incoming leads synced from browser extension.'}
                        </p>
                      </div>
                      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 hidden md:block text-slate-600 font-bold text-sm">→</div>
                    </div>

                    {/* Node 2: AI Template */}
                    <div className="bg-[#121824] p-4 rounded-xl border border-white/5 relative group hover:border-indigo-500/30 transition-all min-h-[120px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 text-[9px] font-black text-purple-400 uppercase">
                          <Brain className="w-3 h-3" /> AI TEMPLATE
                        </div>
                        <div className="text-[11px] font-bold text-white mb-1">Personalize Intro</div>
                        <p className="text-[9px] text-slate-400 leading-normal">
                          {language === 'tr' ? 'Yorumları incele, {rating} değerine göre tebrik oluştur.' : 'Inspect maps review details, customize greeting context.'}
                        </p>
                      </div>
                      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 hidden md:block text-slate-600 font-bold text-sm">→</div>
                    </div>

                    {/* Node 3: Wait Step */}
                    <div className="bg-[#121824] p-4 rounded-xl border border-white/5 relative group hover:border-indigo-500/30 transition-all min-h-[120px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 text-[9px] font-black text-blue-400 uppercase">
                          <Zap className="w-3 h-3" /> DELAY TIMER
                        </div>
                        <div className="text-[11px] font-bold text-white mb-1">Wait 45 Minutes</div>
                        <p className="text-[9px] text-slate-400 leading-normal">
                          {language === 'tr' ? 'İnsan benzeri bekleme aralığı ile spam riskini engelle.' : 'Wait delay block to guarantee non-spammy behavior patterns.'}
                        </p>
                      </div>
                      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 hidden md:block text-slate-600 font-bold text-sm">→</div>
                    </div>

                    {/* Node 4: Send Action */}
                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 group hover:border-emerald-500/40 transition-all min-h-[120px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 text-[9px] font-black text-green-400 uppercase">
                          <MessageCircle className="w-3 h-3" /> OUTBOUND
                        </div>
                        <div className="text-[11px] font-bold text-white mb-1">Send WhatsApp</div>
                        <p className="text-[9px] text-slate-400 leading-normal">
                          {language === 'tr' ? 'Kuyruk yöneticisi vasıtasıyla mesajı alıcıya ilet.' : 'Deliver outbound campaign text to client queue.'}
                        </p>
                      </div>
                    </div>

                  </div>

                  <div className="bg-[#121824] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 text-xs">
                    <span className="text-slate-400">
                      {language === 'tr' ? '💡 Görsel Kampanya Sihirbazında tasarladığınız akışlar, arka plan Puppeteer işçileri tarafından otomatik icra edilir.' : '💡 Workflows designed in Visual Canvas are parsed and executed by background Node.js Puppeteer worker nodes.'}
                    </span>
                    <button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold px-4 py-2 rounded-lg shrink-0 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      {language === 'tr' ? 'Akışı Test Et' : 'Test Sequence'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: WhatsApp Sessions (WhatsAppPage) */}
              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-6"
                >
                  
                  {/* Left Column: QR Code Authenticator (5 Columns) */}
                  <div className="md:col-span-5 bg-[#121824] rounded-xl p-4 border border-white/5 flex flex-col justify-between items-center space-y-4">
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
                        {language === 'tr' ? 'HESAP BAĞLANTI SIHİRBAZI' : 'ACCOUNT QR AUTH'}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>

                    {/* QR Code Scanner Placeholder Visual */}
                    <div className="relative w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                      {/* Scanning Line overlay */}
                      <div className="absolute left-0 right-0 h-[2px] bg-emerald-500 top-0 animate-bounce" style={{ animationDuration: '3s' }} />
                      <div className="grid grid-cols-5 gap-2 opacity-90 select-none pointer-events-none">
                        {Array.from({ length: 25 }).map((_, i) => {
                          const isFilled = (i % 2 === 0 && i % 3 !== 0) || i % 5 === 0
                          return (
                            <div key={i} className={`w-5 h-5 rounded-sm ${isFilled ? 'bg-slate-900' : 'bg-transparent'}`} />
                          )
                        })}
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] text-slate-300 font-bold mb-1">
                        {language === 'tr' ? 'WhatsApp Web ile QR Kodu Taratın' : 'Scan to Link WhatsApp Account'}
                      </p>
                      <p className="text-[8px] text-slate-500">
                        {language === 'tr' ? 'Node.js Puppeteer oturumu otomatik başlatılır.' : 'Initiates automated puppeteer worker instances.'}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Connected Sessions List (7 Columns) */}
                  <div className="md:col-span-7 bg-[#121824] rounded-xl p-4 border border-white/5 space-y-3.5 flex flex-col justify-between">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <div className="text-xs font-bold text-slate-400 tracking-wider">{t.analyticsPreview.title}</div>
                      <span className="text-[9px] text-green-400 font-mono font-bold bg-green-500/10 px-1.5 py-0.5 rounded">
                        {language === 'tr' ? '3 AKTİF CİHAZ' : '3 ACTIVE DEVICES'}
                      </span>
                    </div>

                    {/* Session Rows */}
                    <div className="space-y-2">
                      {[
                        { num: '+90 532 555 4321', label: language === 'tr' ? 'Satış Hattı' : 'Sales Outbound', msgCount: '3,842', rate: '85.4%', active: true },
                        { num: '+1 (312) 555-8890', label: language === 'tr' ? 'Chicago Bölgesi' : 'Chicago Outreach', msgCount: '2,912', rate: '81.2%', active: true },
                        { num: '+90 541 555 8899', label: language === 'tr' ? 'Yedek Hesap' : 'Backup Channel', msgCount: '0', rate: '-', active: false }
                      ].map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <div>
                              <span className="font-bold text-white font-mono text-[11px]">{s.num}</span>
                              <span className="text-[8px] text-slate-400 block">{s.label}</span>
                            </div>
                          </div>

                          <div className="flex gap-4 items-center">
                            <div className="text-right">
                              <span className="text-[8px] text-slate-500 block font-bold">{language === 'tr' ? 'İLETİLEN' : 'SENT'}</span>
                              <span className="font-black text-white font-mono text-[10px]">{s.msgCount}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] text-slate-500 block font-bold">{language === 'tr' ? 'YANIT' : 'REPLIES'}</span>
                              <span className="font-black text-green-400 font-mono text-[10px]">{s.rate}</span>
                            </div>
                            <div>
                              {s.active ? (
                                <span className="text-[8px] text-green-400 font-black bg-green-500/10 px-1.5 py-0.5 rounded select-none">CONNECTED</span>
                              ) : (
                                <button className="text-[8px] text-white font-black bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded transition-colors">
                                  {language === 'tr' ? 'QR Göster' : 'Link QR'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-white/5 text-[9px] text-slate-400 flex items-center justify-between font-mono">
                      <span>{language === 'tr' ? 'Kampanya Otomasyonu' : 'Campaign Queue Dispatcher'}</span>
                      <span className="font-bold text-white">{language === 'tr' ? 'DURUM: BEKLEMEDE' : 'STATUS: IDLE'}</span>
                    </div>

                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </motion.div>

      </div>
    </section>
  )
}
"use client";
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Play, MessageCircle, MapPin, Sparkles, CheckCircle2, Bot, Zap, Globe, Cpu, Terminal, ShieldAlert, Brain } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { translations } from '../../locales/translations'

export function Hero() {
  const { language } = useLanguage()
  const t = translations[language].hero

  // Live simulation states
  const [leadsCount, setLeadsCount] = useState(148)
  const [progress, setProgress] = useState(35)
  const [currentLeadName, setCurrentLeadName] = useState(language === 'tr' ? 'Merkez Diş Kliniği' : 'Central Dental Clinic')
  const [activeStep, setActiveStep] = useState(0) // 0: Scrape, 1: AI Enrich, 2: Send WhatsApp
  const [simulationLogs, setSimulationLogs] = useState<string[]>([])

  useEffect(() => {
    // Initial logs based on active language
    setSimulationLogs(
      language === 'tr' 
        ? ['Sistem başlatıldı...', 'Arama: "İstanbul Diş Hekimleri"', 'Taramalar yapılıyor: 24 kayıt bulundu']
        : ['System initialized...', 'Found query: "dentists in Chicago"', 'Scraping results: 24 listings found']
    )
  }, [language])

  // Simulation Loop
  useEffect(() => {
    const leadNames = language === 'tr' ? [
      'Merkez Oto Tamir',
      'Limon Ağacı Kafe',
      'Akıncı Hukuk Bürosu',
      'Zirve CrossFit Salonu',
      'Saygın Diş Polikliniği',
      'Doğa Peyzaj Tasarım'
    ] : [
      'Downtown Auto Repair',
      'Orchard Cafe & Bakery',
      'Midwest Law Group',
      'Apex CrossFit Gym',
      'Premier Dental Care',
      'Greenfield Landscaping'
    ]
    let leadIndex = 0

    const interval = setInterval(() => {
      // Advance Step
      setActiveStep((prev) => {
        const next = (prev + 1) % 3
        
        if (next === 0) {
          // Increment leads when starting scrape phase again
          setLeadsCount(c => c + 1)
          leadIndex = (leadIndex + 1) % leadNames.length
          const nextLead = leadNames[leadIndex]
          setCurrentLeadName(nextLead)
          
          setProgress(15)
          setSimulationLogs(prevLogs => [
            ...prevLogs.slice(-2),
            language === 'tr' 
              ? `📍 Çekildi: "${nextLead}"`
              : `📍 Scraped: "${nextLead}"`,
            language === 'tr'
              ? `📞 Telefon: +90 532-555-${Math.floor(1000 + Math.random() * 9000)}`
              : `📞 Extracted Phone: +1 312-555-${Math.floor(1000 + Math.random() * 9000)}`
          ])
        } else if (next === 1) {
          // AI enrichment phase
          setProgress(60)
          setSimulationLogs(prevLogs => [
            ...prevLogs.slice(-2),
            language === 'tr'
              ? `🤖 AI: Yorumlar analiz ediliyor...`
              : `🤖 AI: Analyzing reviews...`,
            language === 'tr'
              ? `✨ Giriş üretildi: "Merhaba ${leadNames[leadIndex]} ekibi! Yorumlarınızı beğendik..."`
              : `✨ Generated: "Hi ${leadNames[leadIndex]} team! Love your reviews..."`
          ])
        } else if (next === 2) {
          // WhatsApp outreach phase
          setProgress(100)
          setSimulationLogs(prevLogs => [
            ...prevLogs.slice(-2),
            language === 'tr'
              ? `💬 WhatsApp sosyal yardım mesajı gönderiliyor...`
              : `💬 Sending personalized WhatsApp campaign...`,
            language === 'tr'
              ? `✅ Kuyruğa başarıyla iletildi!`
              : `✅ Outreach delivered to queue successfully!`
          ])
        }

        return next
      })

    }, 4500)

    return () => clearInterval(interval)
  }, [language])

  const pitchPoints = [
    { text: language === 'tr' ? 'Harita React Uyumluluğu ile Tek Tıkla Tarama' : 'One-Click Scraping with Maps React Compatibility', icon: MapPin, color: 'text-green-400' },
    { text: language === 'tr' ? 'Yapay Zeka Kişiselleştirme (Özelleştirilmiş Girişler & Şablonlar)' : 'AI Personalization (Intros, Services, Contextual Templates)', icon: Sparkles, color: 'text-emerald-400' },
    { text: language === 'tr' ? 'Güvenli WhatsApp Otomasyonu (Rastgele Gecikmeler & Engel Önleme)' : 'Safe WhatsApp Outreach with Smart Delays & Anti-Ban', icon: MessageCircle, color: 'text-blue-400' }
  ]

  const trustMetrics = [
    { val: '98%', label: t.statDelivery },
    { val: '3x+', label: t.statRating },
    { val: '24/7', label: t.statPersonalized }
  ]

  return (
    <section className="relative min-h-screen pt-28 pb-20 overflow-hidden bg-radial-at-t from-[#0e1626] via-[#080b10] to-[#080b10] bg-grid-pattern">
      {/* Background Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-green-500/5 to-indigo-500/5 rounded-full blur-[160px] animate-spin-slow" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Text & Pitch */}
          <div className="lg:col-span-6 space-y-8 text-left">
            {/* Glow Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> {t.liveScraper}
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-3xl font-extrabold text-white leading-tight tracking-tight"
            >
              {t.title}{' '}
              <span className="text-gradient-tw drop-shadow-sm">{t.titleHighlight}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-300 max-w-xl font-normal leading-relaxed"
            >
              {t.desc}
            </motion.p>

            {/* Pitch Points */}
            <motion.ul
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-3"
            >
              {pitchPoints.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-300">
                  <div className="bg-white/5 p-1.5 rounded-lg border border-white/10 flex items-center justify-center">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="font-medium text-sm sm:text-base">{item.text}</span>
                </li>
              ))}
            </motion.ul>

            {/* CTA Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4"
            >
              <a
                href="#pricing"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-center px-8 py-4 rounded-xl shadow-xl shadow-green-500/10 hover:shadow-green-500/25 transition-all group flex items-center justify-center gap-2"
              >
                {t.ctaTrial}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <button
                onClick={() => {
                  const el = document.getElementById('features')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="font-bold px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 text-white bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                {t.ctaDemo}
              </button>
            </motion.div>

            {/* Trust Metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="pt-6 border-t border-white/10 grid grid-cols-3 gap-6 text-left"
            >
              {trustMetrics.map((m, idx) => (
                <div key={idx}>
                  <div className="text-xl sm:text-2xl font-black text-white">{m.val}</div>
                  <div className="text-xs sm:text-sm text-slate-400 font-medium">{m.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Unified Cyberpunk SaaS Control Deck */}
          <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:max-w-none relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-3xl border border-white/10 bg-[#060a12]/80 backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_50px_-12px_rgba(34,197,94,0.12)] overflow-hidden"
            >
              {/* Spinning gradient blob under visualizer */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-green-500/10 rounded-full blur-[80px] animate-pulse" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '6s' }} />

              {/* Control Deck Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-5 text-left">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider ml-2 uppercase">
                    {language === 'tr' ? 'Müşteri Kazanım Otomasyonu' : 'Lead Flow Control Panel'}
                  </span>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-0.5 text-[9px] font-black text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {language === 'tr' ? 'OTOMASYON ÇALIŞIYOR' : 'PIPELINE RUNNING'}
                </div>
              </div>

              {/* Connected Visual Pipeline Map (Horizontal Flow Nodes) */}
              <div className="bg-[#0b101b] rounded-xl p-3 border border-white/5 mb-5 relative">
                <div className="flex justify-between items-center relative z-10 text-[9px]">
                  
                  {/* Node 1: Gmaps Extension */}
                  <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeStep === 0 ? 'scale-105 font-bold text-green-400' : 'opacity-50 text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${activeStep === 0 ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'bg-white/5 border-white/5'}`}>
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span>{language === 'tr' ? '1. Harita Verisi' : '1. Gmaps Lead'}</span>
                  </div>

                  {/* Flow Connector Line 1 */}
                  <div className="flex-1 h-[2px] bg-white/5 mx-2 relative overflow-hidden">
                    <div className={`absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent to-green-500 ${activeStep === 0 ? 'animate-flow-progress' : ''}`} />
                  </div>

                  {/* Node 2: AI Core */}
                  <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeStep === 1 ? 'scale-105 font-bold text-indigo-400' : 'opacity-50 text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${activeStep === 1 ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'bg-white/5 border-white/5'}`}>
                      <Brain className="w-3.5 h-3.5" />
                    </div>
                    <span>{language === 'tr' ? '2. Yapay Zeka' : '2. AI Synthesizer'}</span>
                  </div>

                  {/* Flow Connector Line 2 */}
                  <div className="flex-1 h-[2px] bg-white/5 mx-2 relative overflow-hidden">
                    <div className={`absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent to-indigo-500 ${activeStep === 1 ? 'animate-flow-progress' : ''}`} />
                  </div>

                  {/* Node 3: WP AI Outreach */}
                  <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeStep === 2 ? 'scale-105 font-bold text-emerald-400' : 'opacity-50 text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${activeStep === 2 ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/5'}`}>
                      <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                    <span>{language === 'tr' ? '3. WhatsApp' : '3. WhatsApp dispatch'}</span>
                  </div>

                </div>

                {/* Styled CSS animation classes injected dynamically */}
                <style>{`
                  @keyframes flowProgress {
                    0% { left: -100%; }
                    100% { left: 100%; }
                  }
                  .animate-flow-progress {
                    animation: flowProgress 1.5s infinite linear;
                  }
                `}</style>
              </div>

              {/* Main Content Layout: Two-Column Control Interface */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                
                {/* Left Side: Diagnostics and Log Terminals (5 Columns) */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                  
                  {/* Extension Extract Log Module */}
                  <div className="bg-[#0b101b] rounded-xl p-3.5 border border-white/5 space-y-3 text-left">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>{language === 'tr' ? 'Eklentisi Durumu' : 'Extension Status'}</span>
                      <span className="text-green-400">ACTIVE</span>
                    </div>

                    <div className="bg-slate-900 border border-white/5 rounded p-1.5 text-[9px] text-slate-300 font-mono flex items-center gap-1.5 select-none">
                      <span className="text-slate-500">📍</span>
                      <span className="truncate">{language === 'tr' ? 'İstanbul Diş Hekimleri' : 'Dentists in Chicago'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[#121824] p-1.5 rounded border border-white/5">
                        <div className="text-[8px] text-slate-500 font-bold leading-tight">{language === 'tr' ? 'ÇEKİLEN' : 'SCRAPED'}</div>
                        <div className="text-sm font-black text-green-400 font-mono mt-0.5">{leadsCount}</div>
                      </div>
                      <div className="bg-[#121824] p-1.5 rounded border border-white/5 flex flex-col justify-center">
                        <div className="text-[8px] text-slate-500 font-bold leading-tight">VERSION</div>
                        <div className="text-[10px] font-black text-white font-mono mt-0.5">V3 MANIFEST</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Copywriter Parameters */}
                  <div className="bg-[#0b101b] rounded-xl p-3.5 border border-white/5 space-y-2.5 text-left flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        {language === 'tr' ? 'Yapay Zeka Yönergesi' : 'AI Cognition Core'}
                      </div>
                      <div className="bg-slate-900/60 border border-white/5 rounded p-2 text-[8px] text-slate-400 leading-normal font-mono select-none">
                        {language === 'tr' ? 'Grup: Google Haritalar Yorum Analizi. Şablon: {rating}★ ve yorum ifadelerini alıntıla.' : 'Group: Google Maps Profile Analyzer. Rule: custom greets referencing stars rating.'}
                      </div>
                    </div>

                    {/* Progress tracking details */}
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold mb-1 uppercase tracking-wider">
                        <span>{language === 'tr' ? 'İşlenen Veri' : 'Enriched Node'}</span>
                        <span className="text-indigo-400">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#121824] rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                          initial={{ width: '0%' }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Side: High-Fidelity WhatsApp Outbound Hub Console (7 Columns) */}
                <div className="md:col-span-7 rounded-xl border-2 border-green-500/40 bg-[#070b13] p-4 shadow-[0_0_24px_rgba(16,185,129,0.12)] flex flex-col justify-between space-y-4">
                  
                  {/* WhatsApp Simulator Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
                    <div className="flex items-center gap-2 text-left">
                      <div className="w-6.5 h-6.5 bg-emerald-500 rounded-lg flex items-center justify-center shadow shadow-emerald-500/30">
                        <MessageCircle className="w-4 h-4 text-white fill-white" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-white tracking-wide uppercase">WP AI Outbound</h4>
                        <span className="text-[7.5px] text-slate-500 font-mono font-medium block">
                          {language === 'tr' ? 'Yapay Zeka Kampanyası' : 'Autonomous Outreach'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 text-[8px] font-black text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      {language === 'tr' ? 'WP AI AKTİF' : 'WP AI ACTIVE'}
                    </div>
                  </div>

                  {/* Simulated Mobile Chat UI Frame */}
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-white/5 flex flex-col justify-between min-h-[140px] relative">
                    
                    {/* Receiver Contact Bar */}
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-1.5 border border-white/5 text-left mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-green-500 to-indigo-500 flex items-center justify-center text-[9px] font-extrabold text-white">
                          {currentLeadName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-white block leading-none">{currentLeadName}</span>
                          <span className="text-[7px] text-slate-400 font-mono font-medium block mt-0.5">
                            {language === 'tr' ? 'Numara Doğrulandı' : 'Contact Authenticated'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[7px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-black font-mono">
                        API EXEMPT
                      </span>
                    </div>

                    {/* Chat Bubble Feed */}
                    <div className="space-y-3.5 flex-1 flex flex-col justify-end text-[9px] pb-1.5">
                      <div className="self-center bg-slate-900 border border-white/5 rounded px-2.5 py-0.5 text-[7px] text-slate-500 font-mono text-center tracking-wider">
                        {language === 'tr' ? 'WHATSAPP WEB SİMÜLASYONU' : 'CONNECTED INBOX GATEWAY'}
                      </div>

                      {/* Chat Bubble with Typewriter slide in */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentLeadName}
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.4 }}
                          className="self-end bg-emerald-600/10 border border-emerald-500/20 text-slate-100 rounded-xl rounded-tr-sm p-3 max-w-[95%] text-left"
                        >
                          <div className="flex items-center gap-1 text-[7.5px] text-emerald-400 font-black mb-1 uppercase tracking-wider select-none">
                            <Bot className="w-2.5 h-2.5" />
                            {language === 'tr' ? '🤖 AI ŞABLONUNA GÖRE YAZILDI' : '🤖 Synthesized by AI'}
                          </div>
                          <p className="leading-relaxed text-[9px] sm:text-[9.5px]">
                            {language === 'tr' 
                              ? `Merhaba ${currentLeadName} ekibi! 😊 Google Haritalar profilinizdeki yüksek puanları gördük. Müşteri memnuniyetiniz harika. Bu memnuniyeti kullanarak daha çok yeni randevu getirecek bir WhatsApp sistemi planladık, kısa bir bilgi ister misiniz?`
                              : `Hi ${currentLeadName} team! 😊 Noticed your local business profile on Google Maps. Love the positive reviews. We prepared a custom WhatsApp outbound solution designed for your niche to increase local bookings. Open to a quick chat?`}
                          </p>
                          <div className="flex justify-end items-center gap-1 mt-1.5 text-[7px] text-slate-500 font-mono">
                            <span>{new Date().toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            {activeStep === 2 ? (
                              <span className="text-green-400 font-black">✓✓</span>
                            ) : (
                              <span>✓</span>
                            )}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Chat Footer info */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[8px] text-slate-500">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full ${activeStep === 2 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                        {activeStep === 2 
                          ? (language === 'tr' ? 'Kampanya Otomatik İletiliyor' : 'Queue Delivering Campaign')
                          : (language === 'tr' ? 'Yapay zeka akışı bekliyor' : 'Awaiting next queue step')}
                      </span>
                      <span className="text-green-400 font-black font-mono">
                        {language === 'tr' ? 'RANDELE GECİKMELER AKTİF' : 'HUMAN RETRIES ON'}
                      </span>
                    </div>

                  </div>

                </div>

              </div>

              {/* Bottom Scraper Logs Console overlay */}
              <div className="mt-4 bg-[#050811] rounded-xl p-3 border border-white/5 font-mono text-[9px] text-left space-y-1.5 overflow-hidden min-h-[75px] max-h-[75px] relative">
                <div className="text-slate-500 font-black border-b border-white/5 pb-1 mb-1 tracking-wider uppercase text-[7.5px] flex justify-between items-center font-mono select-none">
                  <span className="flex items-center gap-1 font-mono text-slate-400">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    {language === 'tr' ? 'Otomasyon Günlük Akışı' : 'Automation Live Output'}
                  </span>
                  <span className="text-green-400 font-black font-mono">SYSTEM LOG</span>
                </div>
                <div className="space-y-0.5">
                  {simulationLogs.map((log, index) => (
                    <div key={index} className="text-slate-300 truncate font-mono flex items-center gap-1">
                      <span className="text-slate-600 select-none font-mono">&gt;</span> 
                      <span className="font-mono text-slate-300">{log}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
export default Hero;

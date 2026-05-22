"use client";
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Brain, Rocket, BarChart3, ChevronRight, MapPin } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { translations } from '../../locales/translations'

export function HowItWorks() {
  const { language } = useLanguage()
  const t = translations[language].howItWorks
  const [activeStep, setActiveStep] = useState(0)

  const stepIcons = [Search, Brain, Rocket, BarChart3]
  const stepColors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-indigo-500 to-blue-500'
  ]
  const stepAccents = ['blue', 'purple', 'green', 'indigo']

  const steps = t.steps.map((step, idx) => ({
    id: idx,
    icon: stepIcons[idx],
    badge: step.badge,
    title: step.title,
    description: step.desc,
    color: stepColors[idx],
    accent: stepAccents[idx]
  }))

  // Render mock screen based on active step index
  const renderMockScreen = () => {
    switch (activeStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-[#121824] rounded-xl border border-white/5 p-4 font-sans space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] text-slate-400 font-mono">
                {language === 'tr' ? 'HARİTA ARAMASI: "Diş Hekimi Chicago"' : 'MAP SEARCH: "Dentist Chicago"'}
              </span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            </div>
            
            {/* Scrape Animation mock listings */}
            <div className="space-y-2">
              {[
                { name: language === 'tr' ? 'Chicago Gülüş Tasarımı' : 'Chicago Smiles Dental', phone: '+1 312-555-0199', rate: '4.9 ★' },
                { name: language === 'tr' ? 'Lincoln Park Diş Kliniği' : 'Lincoln Park Dentistry', phone: '+1 312-555-0122', rate: '4.8 ★' },
              ].map((l, i) => (
                <div key={i} className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5 flex items-center justify-between text-left">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-green-400" /> {l.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{l.phone}</div>
                  </div>
                  <div className="text-right">
                    <span className="bg-green-500/10 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {l.rate}
                    </span>
                    <div className="text-[8px] text-slate-500 mt-1">{language === 'tr' ? 'ÇEKİLDİ' : 'EXTRACTED'}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-center text-xs text-green-400 font-semibold">
              🔄 {language === 'tr' ? 'Tarama için 24 işletme daha kuyrukta...' : '24 more leads queued for extraction...'}
            </div>
          </motion.div>
        )

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-[#121824] rounded-xl border border-white/5 p-4 font-sans space-y-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] text-slate-400 font-mono">{language === 'tr' ? 'YAPAY ZEKA ZENGİNLEŞTİRME' : 'AI PROMPT ENRICHMENT'}</span>
              <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">CLAUDE 3.5</span>
            </div>

            {/* Variable Builder */}
            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">{language === 'tr' ? 'Giriş Şablonu' : 'Input Template'}</div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5 font-mono text-[10px] text-slate-300">
                {language === 'tr' 
                  ? '"Merhaba {{name}}! Haritalar\'daki {{rating}} yıldızlı yorumlarınızı gördük..."'
                  : '"Hi {{name}}! Saw your {{rating}} star review on Google Maps..."'}
              </div>

              <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">{language === 'tr' ? 'Üretilen Yapay Zeka Çıktısı' : 'Generated Output'}</div>
              <div className="bg-purple-500/5 border border-purple-500/20 p-2.5 rounded-lg text-slate-200 leading-relaxed text-[11px]">
                🤖 {language === 'tr' 
                  ? <>"Merhaba <b>Chicago Gülüş Tasarımı</b> ekibi! Haritalar'daki <b>4.9 yıldızlı</b> puanınızı çok beğendik. 124 mutlu müşteriniz olduğunu fark ettik..."</>
                  : <>"Hi <b>Chicago Smiles Dental</b> team! Love your <b>4.9 star</b> rating on Google Maps. We noticed you have 124 happy patients..."</>}
              </div>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-[#121824] rounded-xl border border-white/5 p-4 font-sans space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] text-slate-400 font-mono">{language === 'tr' ? 'WHATSAPP GÖNDERİM ÖNİZLEME' : 'WHATSAPP OUTBOX PREVIEW'}</span>
              <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">{language === 'tr' ? 'GÖNDERİM AKTİF' : 'SENDING ACTIVE'}</span>
            </div>

            {/* WhatsApp Chat view */}
            <div className="space-y-3 max-w-[90%] mx-auto text-left">
              <div className="bg-slate-900 rounded-lg p-2.5 border border-white/5 text-[10px] text-slate-400 flex items-center justify-between">
                <span>To: +1 312-555-0199 ({language === 'tr' ? 'Gülüş Tasarımı' : 'Smile Dental'})</span>
                <span className="text-green-400 font-bold">{language === 'tr' ? 'Kuyruk #1' : 'Queue #1'}</span>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 text-slate-200 rounded-xl p-2.5 text-xs ml-8 relative shadow">
                <span className="text-[9px] font-bold text-green-400 block mb-1">LeadFlow Bot</span>
                {language === 'tr'
                  ? 'Merhaba Chicago Gülüş Tasarımı! Haritalar\'da 4.9★ puanınızı gördük. Yeni implant hastaları kabul ediyor musunuz?'
                  : 'Hi Chicago Smiles Dental! Saw your 4.9★ rating on Maps. Do you accept new implants patients?'}
                <div className="text-[8px] text-slate-500 text-right mt-1.5">{language === 'tr' ? 'İletildi 10:24' : 'Delivered 10:24 AM'} ✓✓</div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400">
              ⏳ {language === 'tr' ? 'Engel önleme beklemesi aktif:' : 'Random anti-ban delay active:'} <span className="text-green-400 font-mono">{language === 'tr' ? '14sn kaldı' : '14s left'}</span>
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-[#121824] rounded-xl border border-white/5 p-4 font-sans space-y-3"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] text-slate-400 font-mono">{language === 'tr' ? 'DASHBOARD RAPOR EŞLEME' : 'LEADFLOW DASHBOARD REPORT'}</span>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold">{language === 'tr' ? 'SENKRONİZE EDİLDİ' : 'SYNC OK'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: language === 'tr' ? 'Senkronize Adaylar' : 'Synced Leads', val: '4,841', color: 'text-indigo-400' },
                { label: language === 'tr' ? 'Gönderilen Mesaj' : 'Outreach Sent', val: '3,200', color: 'text-blue-400' },
                { label: language === 'tr' ? 'Toplam Cevaplar' : 'Total Replies', val: '840', color: 'text-green-400' },
              ].map((c, i) => (
                <div key={i} className="bg-slate-900/60 p-2 rounded-lg border border-white/5 text-center">
                  <div className="text-[8px] text-slate-500 font-bold uppercase">{c.label}</div>
                  <div className={`text-xs sm:text-sm font-black mt-1 ${c.color}`}>{c.val}</div>
                </div>
              ))}
            </div>

            {/* Small Bar Graph mockup */}
            <div className="h-16 bg-slate-900/40 rounded-lg flex items-end justify-around p-2 border border-white/5">
              {[20, 40, 35, 60, 50, 75, 90].map((h, idx) => (
                <div key={idx} className="bg-gradient-to-t from-indigo-500 to-indigo-300 w-4 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
        )
      default:
        return null
    }
  }

  return (
    <section id="how-it-works" className="py-24 bg-[#080b10] relative overflow-hidden bg-dot-pattern">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            {t.title} <span className="text-gradient-tw">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal">
            {t.desc}
          </p>
        </motion.div>

        {/* Split Interactive Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Timeline Selectors (7 Columns) */}
          <div className="lg:col-span-6 space-y-4">
            {steps.map((step) => {
              const isActive = activeStep === step.id
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-4 ${
                    isActive
                      ? 'bg-[#0e1626]/80 border-green-500/30 shadow-lg translate-x-1 shadow-green-500/5'
                      : 'bg-transparent border-white/5 hover:border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Step Icon */}
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color} text-white shrink-0 shadow`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  
                  {/* Step Description */}
                  <div className="space-y-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                      {step.badge}
                    </span>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {step.title}
                      {isActive && <ChevronRight className="w-4 h-4 text-green-400" />}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400 font-medium">
                      {step.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Column: Dynamic Mockup Preview (6 Columns) */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-white/10 bg-[#0c1220]/60 backdrop-blur-xl p-5 shadow-2xl flex items-center justify-center min-h-[300px]">
              
              {/* Window Tabs Bar */}
              <div className="absolute top-4 left-4 flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
              </div>
              <div className="absolute top-4 right-4 text-[9px] text-slate-500 font-mono tracking-wider">
                {language === 'tr' ? 'GÖSTERİM EKRANI' : 'PREVIEW SCREEN'}
              </div>

              {/* Render Animated View */}
              <div className="w-full pt-8 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {renderMockScreen()}
                </AnimatePresence>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
export default HowItWorks;

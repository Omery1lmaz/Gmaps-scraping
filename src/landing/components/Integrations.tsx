import { motion } from 'framer-motion'
import { Zap, Globe, Bot, Brain, MessageSquare, Database, Share2, Link } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../locales/translations'
import { useEffect, useState } from 'react'

export function Integrations() {
  const { language } = useLanguage()
  const t = translations[language].integrations
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const integrations = [
    { name: 'Google Maps', desc: language === 'tr' ? 'Doğrudan arama ayrıştırıcı' : 'Direct search parser', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { name: 'WhatsApp Web', desc: language === 'tr' ? 'Kampanya çıkış senkronizasyonu' : 'Campaign outlet sync', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
    { name: 'OpenAI GPT', desc: language === 'tr' ? 'Yapay zeka kişiselleştirme metni' : 'AI personalization text', icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { name: 'Claude AI', desc: language === 'tr' ? 'Gelişmiş yönlendirme modeli' : 'Advanced prompt model', icon: Brain, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { name: 'Zapier', desc: language === 'tr' ? 'İş akışı tetikleme otomasyonu' : 'Workflow trigger automation', icon: Link, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { name: 'HubSpot', desc: language === 'tr' ? 'CRM veritabanı besleme' : 'CRM database hydration', icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { name: 'Slack Alerts', desc: language === 'tr' ? 'Anlık yanıt uyarıları' : 'Instant reply alerts', icon: Share2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ]

  return (
    <section id="integrations" className="py-32 bg-[#000000] relative overflow-hidden border-t border-white/5">
      
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-sm font-semibold mb-6">
            <Link size={14} />
            <span>Seamless Connectivity</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            {t.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-normal">
            {t.desc}
          </p>
        </motion.div>

        {/* Orbit Diagram Container */}
        <div className="relative flex items-center justify-center h-[500px] max-w-3xl mx-auto">
          
          {/* Dashed Orbit Rings (Perfectly Centered) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] border border-white/10 border-dashed rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] sm:w-[260px] sm:h-[260px] border border-white/5 border-dashed rounded-full pointer-events-none" />

          {/* Central Pulsing Node (LeadFlow AI) */}
          <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse" />
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-20 h-20 sm:w-24 sm:h-24 bg-zinc-950 border border-emerald-500/30 rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-emerald-500/20 backdrop-blur-xl"
            >
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 fill-emerald-400/20 mb-1" />
              <span className="text-white text-[10px] font-black uppercase tracking-widest">{t.centralNode}</span>
            </motion.div>
          </div>

          {/* Orbital Nodes positioned dynamically using math */}
          {isMounted && integrations.map((item, idx) => {
            const total = integrations.length
            const angle = (idx / total) * 2 * Math.PI
            // Alternate radius to distribute them on two different rings
            const isOuter = idx % 2 === 0
            const radius = typeof window !== 'undefined' && window.innerWidth < 640 
              ? (isOuter ? 150 : 90) 
              : (isOuter ? 225 : 130)
            
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius

            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                animate={{
                  y: [y, y - 10, y],
                }}
                transition={{
                  y: { repeat: Infinity, duration: 3 + (idx % 3), ease: 'easeInOut' },
                  opacity: { duration: 0.5, delay: idx * 0.1 },
                  scale: { duration: 0.5, delay: idx * 0.1 }
                }}
                className="absolute z-40 top-1/2 left-1/2 group"
                style={{
                  marginLeft: `${x}px`,
                  marginTop: `${y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Orbital Node Bubble */}
                <div className="relative flex flex-col items-center">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center hover:scale-110 hover:border-emerald-500/50 transition-all duration-300 shadow-xl shadow-black/50 cursor-pointer`}>
                    <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${item.color}`} />
                  </div>
                  
                  {/* Tooltip Hover Info */}
                  <div className="absolute top-16 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none min-w-[140px] bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center shadow-2xl z-50">
                    <div className="text-xs font-bold text-zinc-100 mb-1">{item.name}</div>
                    <div className="text-[10px] text-zinc-400 leading-tight">{item.desc}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}

        </div>

      </div>
    </section>
  )
}
"use client";
import { motion } from 'framer-motion'
import { Zap, Bot, Brain, MessageSquare, ArrowRight } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { translations } from '../../locales/translations'

export function Integrations() {
  const { language } = useLanguage()
  const t = translations[language].integrations // Note: You might want to update this translation key or handle it differently

  return (
    <section id="features" className="py-32 bg-[#000000] relative overflow-hidden border-t border-white/5">
      <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-sm font-semibold mb-6">
            <Zap size={14} className="fill-emerald-400/20" />
            <span>WPAIFlow Core</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            {language === 'tr' ? 'Otomasyonun Gücü' : 'The Power of Automation'}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div 
            className="relative overflow-hidden bg-[#09090b] border border-white/10 rounded-3xl p-8 flex flex-col justify-between min-h-[320px]"
          >
            <h3 className="text-2xl font-bold text-white mb-2">{language === 'tr' ? 'Doğrudan Akış' : 'Direct Pipeline'}</h3>
            <p className="text-zinc-400">{language === 'tr' ? 'Google Haritalar\'dan verileri çekin ve doğrudan WhatsApp\'a gönderin.' : 'Extract leads from Google Maps and send them directly to WhatsApp.'}</p>
            <div className="mt-10 flex items-center gap-4 bg-black/50 border border-white/5 rounded-2xl p-6 justify-between">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-500" />
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="relative overflow-hidden bg-[#09090b] border border-white/10 rounded-3xl p-8 flex flex-col justify-between min-h-[320px]"
          >
            <h3 className="text-xl font-bold text-white mb-2">{language === 'tr' ? 'Yapay Zeka Kişiselleştirme' : 'AI Personalization'}</h3>
            <p className="text-sm text-zinc-400">{language === 'tr' ? 'GPT modelleri ile müşterilerinize özel, akıllı ve dönüşüm odaklı mesajlar hazırlayın.' : 'Craft hyper-personalized, high-converting messages using advanced AI models.'}</p>
            <div className="mt-8 flex justify-center items-center relative h-32">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div className="w-12 h-12 bg-pink-500/10 border border-pink-500/30 rounded-full flex items-center justify-center translate-x-4">
                <Brain className="w-5 h-5 text-pink-400" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
export default Integrations;

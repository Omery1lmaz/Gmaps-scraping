"use client";
import { motion } from 'framer-motion'
import { Check, X, Zap } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { translations } from '../../locales/translations'

export function Solution() {
  const { language } = useLanguage()
  const t = translations[language].solution

  const comparisonItems = t.items.map((item) => ({
    name: item.name,
    traditional: item.manual,
    ai: item.custom
  }))

  return (
    <section className="py-24 bg-[#080b10] relative overflow-hidden">
      
      {/* Background visual element */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-green-400">{t.badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            {t.title} <span className="text-gradient-tw">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-normal">
            {t.desc}
          </p>
        </motion.div>

        {/* Matrix Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-white/10 bg-[#0c1220]/60 backdrop-blur-md overflow-hidden shadow-2xl"
        >
          {/* Table Headers */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-white/10 bg-slate-900/50">
            <div className="p-5 text-sm font-extrabold text-slate-300 uppercase tracking-wider text-left">
              {language === 'tr' ? 'Özellikler' : 'Capabilities'}
            </div>
            <div className="p-5 text-sm font-extrabold text-slate-400 uppercase tracking-wider text-center border-x border-white/5">
              {language === 'tr' ? 'Geleneksel Yöntem' : 'Traditional Way'}
            </div>
            <div className="p-5 text-sm font-extrabold text-green-400 uppercase tracking-wider text-center bg-green-500/5">
              {language === 'tr' ? 'WPAIFlow Yöntemi' : 'WPAIFlow Way'}
            </div>
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-white/5">
            {comparisonItems.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-3 hover:bg-white/5 transition-colors duration-150"
              >
                {/* Feature Name */}
                <div className="p-5 text-sm sm:text-base font-bold text-white text-left flex items-center">
                  {item.name}
                </div>

                {/* Traditional Column */}
                <div className="p-5 text-xs sm:text-sm text-slate-400 text-center border-x border-white/5 flex items-center justify-center gap-2">
                  <X className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-semibold text-slate-400">{item.traditional}</span>
                </div>

                {/* WPAIFlow Column */}
                <div className="p-5 text-xs sm:text-sm text-white text-center bg-green-500/5 flex items-center justify-center gap-2 font-bold">
                  <Check className="w-5 h-5 text-green-400 shrink-0" />
                  <span className="text-white">{item.ai}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom Banner */}
        <div className="mt-12 text-center">
          <p className="text-sm font-semibold text-slate-500">
            {language === 'tr' 
              ? '* Tipik manuel kopyalama iş akışlarına karşı karşılaştırmalı performans testine dayanmaktadır.'
              : '* Based on comparative performance testing against typical browser-copy workflows.'}
          </p>
        </div>

      </div>
    </section>
  )
}
export default Solution;

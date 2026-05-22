"use client";
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { translations } from '../../locales/translations'

export function FAQ() {
  const { language } = useLanguage()
  const t = translations[language].faq
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-[#080b10] relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-[#0c1220] border border-white/5 rounded-full px-4 py-2 mb-6">
            <HelpCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            {t.title} <span className="text-gradient-tw">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-normal">
            {t.desc}
          </p>
        </motion.div>

        {/* Accordions */}
        <div className="space-y-4">
          {t.items.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`border rounded-2xl overflow-hidden bg-[#0c1220]/40 backdrop-blur-sm transition-all duration-300 ${
                  isOpen ? 'border-green-500/20 shadow-lg shadow-green-500/5' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between transition-colors text-white"
                >
                  <span className="font-bold text-sm sm:text-base pr-4">{faq.q}</span>
                  <div className={`p-1.5 rounded-lg bg-white/5 border border-white/5 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-green-400 border-green-500/20' : 'text-slate-400'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-1 border-t border-white/5 text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
export default FAQ;

"use client";
import { motion } from 'framer-motion'
import { Search, FileSpreadsheet, Bot, TrendingDown, AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { translations } from '../../locales/translations'

export function Problem() {
  const { language } = useLanguage()
  const t = translations[language].problem

  const icons = [Search, FileSpreadsheet, Bot, TrendingDown]
  const colors = ['text-rose-400', 'text-amber-400', 'text-orange-400', 'text-red-400']
  const borders = ['border-rose-500/20', 'border-amber-500/20', 'border-orange-500/20', 'border-red-500/20']
  const bgColors = ['bg-rose-500/5', 'bg-amber-500/5', 'bg-orange-500/5', 'bg-red-500/5']

  const problems = t.cards.map((item, idx) => ({
    icon: icons[idx],
    title: item.title,
    description: item.desc,
    color: colors[idx],
    border: borders[idx],
    bgColor: bgColors[idx]
  }))

  return (
    <section className="py-24 bg-[#080b10] relative overflow-hidden bg-dot-pattern">
      
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-full px-4 py-2 mb-6">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">{t.badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            {t.title} <span className="text-rose-500">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal">
            {t.desc}
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`group flex flex-col justify-between p-6 bg-[#0e1626]/40 backdrop-blur-sm rounded-2xl border ${problem.border} hover:border-rose-500/40 transition-all shadow-xl relative`}
            >
              <div>
                {/* Icon Circle */}
                <div className={`w-12 h-12 ${problem.bgColor} rounded-xl flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                  <problem.icon className={`w-6 h-6 ${problem.color}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-rose-400 transition-colors">
                  {problem.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400 font-medium">
                  {problem.description}
                </p>
              </div>

              {/* Red Bottom Border Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
export default Problem;

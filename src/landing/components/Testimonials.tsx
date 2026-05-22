import { motion } from 'framer-motion'
import { Quote, Star } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../locales/translations'

export function Testimonials() {
  const { language } = useLanguage()
  const t = translations[language].testimonials

  const colors = [
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'bg-green-500/20 text-green-400 border-green-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30'
  ]
  const initialsList = ['SJ', 'MY', 'DC']

  const testimonials = t.items.map((item, idx) => {
    const metrics = [
      language === 'tr' ? '%22 Yanıt Oranı' : '22% Response Rate',
      language === 'tr' ? '10 Kat Hız' : '10x Speed',
      language === 'tr' ? 'Meta API Ücretsiz' : 'Meta API Free'
    ]

    return {
      name: item.name,
      role: item.role,
      content: item.text,
      initials: initialsList[idx] || 'TF',
      color: colors[idx % colors.length],
      metric: metrics[idx] || 'Verified'
    }
  })

  return (
    <section className="py-24 bg-[#080b10] relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[140px] pointer-events-none" />

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

        {/* Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-[#0c1220]/50 rounded-2xl p-6 sm:p-8 border border-white/5 hover:border-white/12 transition-all shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Stars + Quote icon */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, starIdx) => (
                      <Star key={starIdx} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-green-400/40" />
                </div>
                
                {/* Feedback Content */}
                <p className="text-sm leading-relaxed text-slate-200 mb-6 italic">
                  "{testimonial.content}"
                </p>
              </div>

              {/* Author & Metric Footer */}
              <div className="flex items-center justify-between border-t border-white/5 pt-5 mt-4">
                <div className="flex items-center gap-3">
                  {/* Initials Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${testimonial.color}`}>
                    {testimonial.initials}
                  </div>
                  
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-bold text-white">{testimonial.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{testimonial.role}</div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-sm font-extrabold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/10">
                    {testimonial.metric}
                  </div>
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
import { motion } from 'framer-motion'
import { MapPin, Globe, Brain, MessageCircle, GitBranch, LayoutDashboard, Shield, Plug } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../locales/translations'

export function Features() {
  const { language } = useLanguage()
  const t = translations[language].features

  const icons = [MapPin, Globe, Brain, MessageCircle, GitBranch, LayoutDashboard, Shield, Plug]
  const gradients = [
    'from-green-500 to-emerald-500',
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-lime-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-blue-500',
    'from-teal-500 to-emerald-500',
    'from-pink-500 to-rose-500'
  ]
  const glows = [
    'group-hover:shadow-green-500/10',
    'group-hover:shadow-blue-500/10',
    'group-hover:shadow-purple-500/10',
    'group-hover:shadow-green-500/10',
    'group-hover:shadow-orange-500/10',
    'group-hover:shadow-indigo-500/10',
    'group-hover:shadow-teal-500/10',
    'group-hover:shadow-pink-500/10'
  ]
  const sizes = [
    'md:col-span-2 row-span-1',
    'md:col-span-1 row-span-1',
    'md:col-span-1 row-span-1',
    'md:col-span-1 row-span-1',
    'md:col-span-1 row-span-1',
    'md:col-span-2 row-span-1',
    'md:col-span-1 row-span-1',
    'md:col-span-1 row-span-1'
  ]

  const features = t.items.map((item, idx) => ({
    icon: icons[idx],
    gradient: gradients[idx],
    glow: glows[idx],
    size: sizes[idx],
    title: item.title,
    description: item.desc
  }))

  return (
    <section id="features" className="py-24 bg-[#080b10] relative overflow-hidden bg-grid-pattern">
      
      {/* Background blur decorative blobs */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-[#25D366]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

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

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`${feature.size} group relative flex`}
            >
              {/* Card Container */}
              <div className={`w-full bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 group-hover:border-white/15 transition-all duration-300 shadow-xl ${feature.glow} flex flex-col justify-between overflow-hidden relative`}>
                
                {/* Background gradient hint */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
                
                <div>
                  {/* Icon Circle */}
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400 font-medium">
                    {feature.description}
                  </p>
                </div>

                {/* Decorative glow bottom slider */}
                <div className={`absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
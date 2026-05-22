import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ArrowRight, Zap } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../locales/translations'

export function Pricing() {
  const { language } = useLanguage()
  const t = translations[language].pricing
  const [isAnnual, setIsAnnual] = useState(false)

  const plans = t.plans.map((plan, idx) => {
    const popular = idx === 2
    const glows = [
      'hover:shadow-slate-500/5',
      'hover:shadow-indigo-500/5',
      'shadow-green-500/10 hover:shadow-green-500/20',
      'hover:shadow-purple-500/5'
    ]
    const borders = [
      'border-white/5 hover:border-white/15',
      'border-white/5 hover:border-white/15',
      'border-green-500/30',
      'border-white/5 hover:border-white/15'
    ]

    return {
      name: plan.name,
      monthly: plan.priceMonthly,
      annual: plan.priceAnnual,
      currency: plan.currency,
      description: plan.description,
      features: plan.features,
      popular,
      glow: glows[idx],
      borderColor: borders[idx]
    }
  })

  return (
    <section id="pricing" className="py-24 bg-[#080b10] relative overflow-hidden bg-grid-pattern">
      
      {/* Background visual glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[140px] pointer-events-none" />

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
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal mb-8">
            {t.desc}
          </p>

          {/* Billing Switcher */}
          <div className="inline-flex items-center gap-4 bg-white/5 border border-white/5 rounded-full p-1.5 shadow">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                !isAnnual ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.monthlyBilling}
            </button>
            
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAnnual ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.annualBilling}
              <span className="bg-green-400/20 text-green-400 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {t.save}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl p-6 sm:p-8 bg-[#0c1220]/50 backdrop-blur-sm border ${plan.borderColor} ${plan.glow} transition-all flex flex-col justify-between`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1 shadow-md">
                  <Zap className="w-3.5 h-3.5 fill-white text-white" /> {language === 'tr' ? 'EN POPÜLER' : 'MOST POPULAR'}
                </div>
              )}

              <div>
                {/* Plan Tier Name & Description */}
                <div className="mb-6 border-b border-white/5 pb-6">
                  <h3 className="text-xl font-extrabold text-white mb-2">{plan.name}</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed min-h-[32px]">{plan.description}</p>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl sm:text-5xl font-black text-white font-mono">
                      {plan.currency}{isAnnual ? plan.annual : plan.monthly}
                    </span>
                    <span className="text-slate-500 text-xs font-semibold font-sans">/{language === 'tr' ? 'ay' : 'month'}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3.5 mb-8 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-slate-300 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Call to Action Button */}
              <button
                className={`w-full py-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 group ${
                  plan.popular
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-green-500/25'
                    : 'border border-white/10 text-white bg-white/5 hover:bg-white/10'
                }`}
              >
                {t.plans[i].cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
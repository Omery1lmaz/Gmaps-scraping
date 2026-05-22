import { motion } from 'framer-motion'
import { TrendingUp, Users, MessageCircle, BarChart3, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../locales/translations'

export function Analytics() {
  const { language } = useLanguage()
  const t = translations[language].analytics

  const metrics = [
    { value: '84.2%', label: t.avgReply, icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/5', border: 'border-green-500/10' },
    { value: '12.8K', label: t.leadsToday, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/10' },
    { value: '95.8%', label: t.deliverySuccess, icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/10' },
    { value: '4.2x', label: t.roiBoost, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/10' },
  ]

  const chartData = [
    { label: 'Mon', trLabel: 'Pzt', val: 78, num: '85 Leads' },
    { label: 'Tue', trLabel: 'Sal', val: 92, num: '104 Leads' },
    { label: 'Wed', trLabel: 'Çar', val: 110, num: '128 Leads' },
    { label: 'Thu', trLabel: 'Per', val: 85, num: '95 Leads' },
    { label: 'Fri', trLabel: 'Cum', val: 125, num: '142 Leads' },
    { label: 'Sat', trLabel: 'Cmt', val: 62, num: '48 Leads' },
    { label: 'Sun', trLabel: 'Paz', val: 45, num: '30 Leads' }
  ]

  const funnelSteps = [
    { label: language === 'tr' ? 'Çekilen Potansiyel Müşteriler' : 'Scraped B2B Leads', value: '12,800', percent: '100%', width: 'w-full', color: 'bg-blue-500' },
    { label: language === 'tr' ? 'Doğrulanmış Telefon Numaraları' : 'Validated Phone Contacts', value: '11,264', percent: '88%', width: 'w-[88%]', color: 'bg-indigo-500' },
    { label: language === 'tr' ? 'Yapay Zeka İle Özelleştirilmiş' : 'AI Review Enriched', value: '10,780', percent: '84.2%', width: 'w-[84.2%]', color: 'bg-purple-500' },
    { label: language === 'tr' ? 'Başarılı WhatsApp Gönderimleri' : 'Delivered WhatsApp Chats', value: '9,504', percent: '74.2%', width: 'w-[74.2%]', color: 'bg-emerald-500' },
    { label: language === 'tr' ? 'Geri Dönüş Yapan İletişimler' : 'Outreach Response Actions', value: '4,527', percent: '35.3%', width: 'w-[35.3%]', color: 'bg-green-400' }
  ]

  return (
    <section className="py-24 bg-[#080b10] relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-green-500/5 rounded-full blur-[140px] pointer-events-none" />

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
            {language === 'tr' ? 'Gerçek Sonuçlar, ' : 'Real Results, '}<span className="text-gradient-tw">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal">
            {t.desc}
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.15 } }}
              className={`p-6 rounded-2xl bg-[#0c1220]/50 border ${metric.border} hover:border-white/10 transition-all text-center flex flex-col justify-between`}
            >
              <div>
                <div className={`w-10 h-10 ${metric.bg} rounded-lg flex items-center justify-center mx-auto mb-4 border border-white/5`}>
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div className={`text-2xl sm:text-3xl font-black ${metric.color} mb-1 font-mono`}>{metric.value}</div>
              </div>
              <div className="text-xs font-bold text-slate-400 mt-2">{metric.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Dual Showcase: Bar Chart & Conversion Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Daily Conversions Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 bg-[#0c1220]/50 rounded-2xl p-6 border border-white/5 shadow-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-lg font-bold text-white">{t.chartTitle}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t.chartDesc}</p>
              </div>
              <div className="bg-green-500/10 text-green-400 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> {t.chartWeekGlow}
              </div>
            </div>

            {/* Styled Bar Chart with Horizontal Axes */}
            <div className="relative h-60 flex items-end justify-between px-2 sm:px-6 py-4 bg-slate-950/30 border border-white/5 rounded-xl overflow-visible">
              {/* Y-Axis lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-4 opacity-10">
                <div className="border-b border-white w-full text-[9px] text-right text-white">150</div>
                <div className="border-b border-white w-full text-[9px] text-right text-white">100</div>
                <div className="border-b border-white w-full text-[9px] text-right text-white">50</div>
                <div className="w-full text-[9px] text-right text-white">0</div>
              </div>

              {chartData.map((item, idx) => (
                <div key={idx} className="relative flex flex-col items-center w-full max-w-[40px] group z-10 h-full justify-end">
                  {/* Tooltip bar value */}
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-mono -top-12 shadow-2xl pointer-events-none whitespace-nowrap z-50">
                    <div className="font-bold text-green-400">{item.num}</div>
                    <div className="text-[8px] text-slate-400">Rate: {item.val}%</div>
                  </div>
                  
                  {/* Visual bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(item.val / 150) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.05 }}
                    className="bg-gradient-to-t from-green-500/80 to-emerald-400 w-full rounded-t-lg hover:brightness-110 hover:shadow-lg hover:shadow-green-500/10 transition-all cursor-pointer border border-green-500/10"
                  />
                  
                  {/* Day label */}
                  <span className="text-[10px] text-slate-400 font-mono mt-2 select-none">
                    {language === 'tr' ? item.trLabel : item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Conversion Funnel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5 bg-[#0c1220]/50 rounded-2xl p-6 border border-white/5 shadow-2xl flex flex-col justify-between"
          >
            <div className="mb-6 pb-4 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">{t.funnelTitle}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.funnelDesc}</p>
            </div>

            <div className="space-y-4">
              {funnelSteps.map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>{step.label}</span>
                    <span className="font-mono text-slate-400">
                      {step.value} <span className="text-green-400 ml-1">({step.percent})</span>
                    </span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div className="h-2 bg-slate-950/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: step.percent }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full ${step.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  )
}
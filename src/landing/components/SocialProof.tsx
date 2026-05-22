import { motion } from 'framer-motion'
import { Users, MessageCircle, BarChart3, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export function SocialProof() {
  const { language } = useLanguage()

  const stats = [
    { value: '50K+', label: language === 'tr' ? 'Günlük Çekilen Liste' : 'Leads Scraped Daily', icon: Users, color: 'text-green-400', glow: 'shadow-green-500/10' },
    { value: '1.2M+', label: language === 'tr' ? 'Gönderilen Mesaj' : 'Outreach Delivered', icon: MessageCircle, color: 'text-indigo-400', glow: 'shadow-indigo-500/10' },
    { value: '84.2%', label: language === 'tr' ? 'Ortalama Geri Dönüş' : 'Average Response Rate', icon: BarChart3, color: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    { value: '99.9%', label: language === 'tr' ? 'Güvenlik & Uyum' : 'Safety Compliance', icon: ShieldCheck, color: 'text-blue-400', glow: 'shadow-blue-500/10' },
  ]

  const logos = [
    'Vercel', 'Stripe', 'Linear', 'Zapier', 'HubSpot', 'Clay', 'Wati', 'Instantly',
    'Salesforce', 'Pipedrive', 'Vercel', 'Stripe', 'Linear', 'Zapier' // duplicate for loop consistency
  ]

  return (
    <section className="py-20 border-y border-white/5 bg-[#090e18]/40 relative overflow-hidden">
      
      {/* Logos Ticker Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-8">
          {language === 'tr' ? 'Dünya çapında büyüme ekipleri ve lead ajansları tarafından güvenildi' : 'Trusted by growth teams and lead gen agencies worldwide'}
        </p>

        {/* Logo Slider Track */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
          <motion.div
            className="flex gap-16 whitespace-nowrap min-w-max items-center"
            animate={{ x: [0, -1000] }}
            transition={{
              ease: 'linear',
              duration: 25,
              repeat: Infinity,
            }}
          >
            {logos.map((logo, idx) => (
              <span
                key={idx}
                className="text-2xl font-black text-slate-500 tracking-tight hover:text-white transition-colors duration-300 select-none cursor-default font-sans"
              >
                {logo}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`relative bg-[#0d1424]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all shadow-lg ${stat.glow} flex flex-col items-center text-center group`}
            >
              {/* Icon Container */}
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 border border-white/5 group-hover:scale-110 transition-transform duration-300">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>

              {/* Metric Values */}
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2 font-mono">
                {stat.value}
              </div>
              <div className="text-sm font-semibold text-slate-400">
                {stat.label}
              </div>

              {/* Decorative Accent Glow */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#25D366]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>

    </section>
  )
}
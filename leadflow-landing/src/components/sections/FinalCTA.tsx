"use client";
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, ShieldCheck, Zap } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export function FinalCTA() {
  const { language } = useLanguage()

  return (
    <section className="py-28 bg-[#080b10] relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        
        {/* Glowing glass panel card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative bg-[#0e1626]/40 border border-white/10 rounded-3xl p-10 sm:p-16 overflow-hidden shadow-2xl glow-tw"
        >
          {/* Subtle logo accent */}
          <div className="inline-flex p-3 bg-green-500/20 rounded-2xl border border-green-500/30 text-green-400 mb-6 animate-bounce">
            <Zap className="w-6 h-6 fill-green-400" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
            {language === 'tr' ? (
              <>WhatsApp İletişiminizi <br className="hidden sm:inline" />
              <span className="text-gradient-tw">Büyütmeye Hazır Mısınız?</span></>
            ) : (
              <>Ready to Scale Your <br className="hidden sm:inline" />
              <span className="text-gradient-tw">WhatsApp Outreach?</span></>
            )}
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            {language === 'tr' 
              ? "Geri dönüş oranlarını ikiye katlamak için WPAIFlow kullanan 1000'den fazla ajans sahibine, pazarlamacıya ve yerel sosyal yardım uzmanına katılın."
              : "Join 1,000+ agency owners, marketers, and local outreach specialists using WPAIFlow to double response rates."}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <a
              href="#pricing"
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-center px-8 py-5 rounded-xl shadow-xl shadow-green-500/10 hover:shadow-green-500/25 transition-all group flex items-center justify-center gap-2"
            >
              {language === 'tr' ? 'Ücretsiz Denemeyi Başlat' : 'Start Free Trial'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            
            <button
              onClick={() => {
                const el = document.getElementById('pricing')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full sm:w-auto font-bold px-8 py-5 rounded-xl border border-white/10 hover:border-white/20 text-white bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 text-green-400" />
              {language === 'tr' ? 'Planları İncele' : 'View Pricing'}
            </button>
          </div>

          {/* Badges footer */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-10 border-t border-white/5 mt-10">
            <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm font-semibold">
              <ShieldCheck className="w-5 h-5 text-green-400" /> {language === 'tr' ? 'Kredi kartı gerekmez' : 'No credit card required'}
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm font-semibold">
              <Zap className="w-5 h-5 text-green-400" /> {language === 'tr' ? '14 günlük deneme süresi' : '14-day trial period'}
            </div>
          </div>

        </motion.div>
      </div>

    </section>
  )
}
export default FinalCTA;

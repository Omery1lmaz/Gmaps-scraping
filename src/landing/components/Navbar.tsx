import { useState, useEffect } from 'react'
import { Zap, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../locales/translations'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { language, setLanguage } = useLanguage()
  const t = translations[language].navbar

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: t.features, href: '#features' },
    { label: t.howItWorks, href: '#how-it-works' },
    { label: t.pricing, href: '#pricing' },
    { label: t.faq, href: '#faq' },
  ]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass shadow-lg' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <motion.a
            href="/"
            className="flex items-center gap-2 group"
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative">
              <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2 rounded-xl shadow-lg shadow-green-500/20">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xl font-black text-white">
              LeadFlow<span className="text-green-400">AI</span>
            </span>
          </motion.a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-400 transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-1 rounded-xl mr-2">
              <button
                onClick={() => setLanguage('tr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'tr' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                TR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'en' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              {language === 'tr' ? 'Giriş' : 'Login'}
            </button>
            <button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-emerald-500 hover:to-green-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-green-500/20 transition-all">
              {t.cta}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Language Switcher for Mobile */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-0.5 rounded-lg mr-2">
              <button
                onClick={() => setLanguage('tr')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  language === 'tr' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                TR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  language === 'en' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-4 border-t border-white/10">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-4 space-y-2">
                  <button className="w-full justify-start font-semibold text-slate-300 hover:text-white transition-colors">
                    {language === 'tr' ? 'Giriş Yap' : 'Login'}
                  </button>
                  <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-2 rounded-xl">
                    {t.cta}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  )
}
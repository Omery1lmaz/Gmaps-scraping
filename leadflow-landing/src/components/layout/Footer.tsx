"use client";
import { Zap } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export function Footer() {
  const { language } = useLanguage()

  const footerLinks = {
    [language === 'tr' ? 'Ürün' : 'Product']: [
      language === 'tr' ? 'Özellikler' : 'Features', 
      language === 'tr' ? 'Fiyatlandırma' : 'Pricing', 
      language === 'tr' ? 'Entegrasyonlar' : 'Integrations', 
      language === 'tr' ? 'Yenilikler' : 'Changelog'
    ],
    [language === 'tr' ? 'Kaynaklar' : 'Resources']: [
      language === 'tr' ? 'Dokümantasyon' : 'Documentation', 
      'API', 
      language === 'tr' ? 'Blog' : 'Blog', 
      language === 'tr' ? 'Topluluk' : 'Community'
    ],
    [language === 'tr' ? 'Şirket' : 'Company']: [
      language === 'tr' ? 'Hakkımızda' : 'About', 
      language === 'tr' ? 'Kariyer' : 'Careers', 
      language === 'tr' ? 'İletişim' : 'Contact', 
      language === 'tr' ? 'Yasal' : 'Legal'
    ],
    Social: ['Twitter', 'LinkedIn', 'GitHub', 'Discord'],
  }

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2 rounded-xl">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-black text-white">
                LeadFlow<span className="text-green-400">AI</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-xs">
              {language === 'tr' 
                ? 'Yapay zeka odaklı hassasiyetle müşteri oluşturma ve WhatsApp erişiminizi otomatikleştirin.'
                : 'Automate your lead generation and WhatsApp outreach with AI-powered precision.'}
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-bold text-white mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-slate-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
          <div className="text-slate-500 text-sm mb-4 md:mb-0">
            © 2026 WPAIFlow. {language === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
          </div>
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <svg className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors fill-current" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <svg className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
          </div>
        </div>
      </div>
    </footer>
  )
}
export default Footer;

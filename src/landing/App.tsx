import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { SocialProof } from './components/SocialProof'
import { Problem } from './components/Problem'
import { Solution } from './components/Solution'
import { Features } from './components/Features'
import { HowItWorks } from './components/HowItWorks'
import { ProductPreview } from './components/ProductPreview'
import { Integrations } from './components/Integrations'
import { Analytics } from './components/Analytics'
import { Pricing } from './components/Pricing'
import { Testimonials } from './components/Testimonials'
import { FAQ } from './components/FAQ'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'
import { LanguageProvider } from './contexts/LanguageContext'

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-[#080b10] text-slate-100 font-sans overflow-x-hidden selection:bg-green-500/30 selection:text-green-300">
        <Navbar />
        <Hero />
        <SocialProof />
        <Problem />
        <Solution />
        <Features />
        <HowItWorks />
        <ProductPreview />
        <Integrations />
        <Analytics />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </LanguageProvider>
  )
}

export default App
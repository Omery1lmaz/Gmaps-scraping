"use client";

import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/sections/Hero';
import SocialProof from '@/components/sections/SocialProof';
import Problem from '@/components/sections/Problem';
import Solution from '@/components/sections/Solution';
import Features from '@/components/sections/Features';
import HowItWorks from '@/components/sections/HowItWorks';
import { LivePreview as ProductPreview } from '@/components/sections/ProductPreview';
import { Integrations } from '@/components/sections/Integrations';
import { Analytics } from '@/components/sections/Analytics';
import Pricing from '@/components/sections/Pricing';
import Testimonials from '@/components/sections/Testimonials';
import FAQ from '@/components/sections/FAQ';
import FinalCTA from '@/components/sections/FinalCTA';
import Footer from '@/components/layout/Footer';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function HomePage() {
  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
}
import React from 'react';
import { useAuth } from '../lib/auth';
import { Button } from './ui/button';
import { useNavigate } from '../lib/router';
import { Lock, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useT } from '../lib/i18n';

interface PlanGuardProps {
  children: React.ReactNode;
  minPlan: 'starter' | 'pro' | 'enterprise';
  featureName?: string;
  fallback?: React.ReactNode;
}

export function PlanGuard({ children, minPlan, featureName, fallback }: PlanGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const planWeights = {
    'free': 0,
    'starter': 1,
    'pro': 2,
    'enterprise': 3
  };

  const currentPlan = user?.plan || 'free';
  const hasAccess = planWeights[currentPlan] >= planWeights[minPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const planLabels = {
    'starter': 'Starter',
    'pro': 'Growth',
    'enterprise': 'Agency'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center bg-[#0c1220]/50 backdrop-blur-md border border-white/5 rounded-3xl space-y-6 min-h-[400px]"
    >
      <div className="relative">
        <div className="size-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
          <Lock size={32} className="text-emerald-500" />
        </div>
        <div className="absolute -top-1 -right-1 size-8 bg-amber-500 rounded-full flex items-center justify-center border-4 border-[#0c1220] shadow-lg animate-bounce">
          <Sparkles size={14} className="text-black fill-black" />
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-black text-white uppercase tracking-tight">
          {featureName || 'Bu Özellik Kilitli'}
        </h3>
        <p className="text-sm font-semibold text-slate-400">
          Bu aracı kullanabilmek için en az <span className="text-emerald-400 font-black">{planLabels[minPlan]}</span> paketine sahip olmanız gerekmektedir.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button 
          onClick={() => navigate('/billing')}
          className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all gap-2"
        >
          <Zap size={14} className="fill-slate-950" />
          Planı Yükselt
        </Button>
      </div>

      <div className="pt-4 border-t border-white/5 w-full flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" /> Güvenli Ödeme</span>
        <span className="flex items-center gap-1.5 text-blue-400"><Zap size={12} className="fill-blue-400" /> Anında Aktivasyon</span>
      </div>
    </motion.div>
  );
}

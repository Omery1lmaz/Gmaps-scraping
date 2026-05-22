import React from 'react';
import { Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../lib/utils';

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPlan?: string;
}

export function LimitModal({ isOpen, onClose, userPlan }: LimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#0c1220]/90 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/15 to-transparent rounded-bl-[100px] pointer-events-none" />
        
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="bg-gradient-to-tr from-amber-400 to-amber-600 p-4.5 rounded-3xl shadow-xl shadow-amber-500/20 animate-bounce">
            <Shield size={36} className="text-black" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight text-white uppercase leading-tight">
              Hesap Limitine <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">Ulaştınız!</span>
            </h3>
            <p className="text-slate-400 text-sm font-semibold max-w-sm mx-auto leading-relaxed">
              Mevcut paketinizdeki maksimum WhatsApp hesabı limitini aştınız. Daha fazla cihaz bağlamak için paketinizi yükseltin.
            </p>
          </div>

          {/* Current vs Next Limits comparison */}
          <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4.5 text-left space-y-3.5">
            <p className="text-xs font-black text-slate-300 uppercase tracking-wider">Plan Limitleri Karşılaştırması</p>
            
            <div className="space-y-2.5">
              {[
                { plan: 'Starter', limit: '1 Hesap', active: userPlan === 'starter' },
                { plan: 'Growth (PRO)', limit: '3 Hesap', active: userPlan === 'pro' },
                { plan: 'Agency (Enterprise)', limit: '10 Hesap', active: userPlan === 'enterprise' }
              ].map((item, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-colors",
                    item.active 
                      ? "bg-amber-500/10 border-amber-500/20 text-white font-bold" 
                      : "bg-white/5 border-white/5 text-slate-400"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={item.active ? "text-amber-400" : "text-slate-600"} />
                    {item.plan}
                  </span>
                  <span className={item.active ? "text-amber-400 font-black" : "font-bold"}>{item.limit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button 
              onClick={onClose}
              variant="outline" 
              className="border-white/10 bg-white/5 text-slate-300 hover:text-white px-6 h-12 rounded-2xl font-bold transition-all"
            >
              Kapat
            </Button>
            <Button 
              onClick={() => window.location.href = '/billing'}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 h-12 rounded-2xl gap-2 group transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
            >
              <Sparkles size={16} className="fill-current" />
              ÜYELİK PAKETİNİ YÜKSELT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { MessageCircle, MessageSquare, Zap, History, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export function ProPlanRestriction() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full relative">
        {/* Background Glows */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative bg-[#0c1220]/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="bg-gradient-to-tr from-emerald-500 to-green-600 p-5 rounded-3xl shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform duration-500">
              <MessageCircle size={40} className="text-black animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                WhatsApp CRM & <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Mesajlaşma Paneli</span>
              </h2>
              <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
                WhatsApp Web entegrasyonu, akıllı mesajlaşma ve müşteri yönetim paneli sadece <span className="text-emerald-400 font-black">PRO</span> üyelerimize özeldir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-4">
              {[
                { icon: MessageSquare, label: 'Müşterilerle Anlık Yazışma', desc: 'Panelden hiç çıkmadan WhatsApp mesajları gönderin.' },
                { icon: Zap, label: 'Akıllı Hazır Şablonlar', desc: 'Sık kullanılan mesajları tek tıkla müşteriye iletin.' },
                { icon: History, label: 'Gelişmiş Mesaj Geçmişi', desc: 'Müşteriyle olan tüm iletişimi tek bir yerden takip edin.' },
                { icon: ShieldCheck, label: 'Güvenli Bağlantı', desc: 'Resmi WhatsApp Web API altyapısı ile güvenli senkronizasyon.' }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-left hover:border-emerald-500/30 transition-colors">
                  <feature.icon size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-100">{feature.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 w-full flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => window.location.href = '/billing'}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-8 py-6 rounded-2xl text-base gap-3 group transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <Sparkles size={20} className="fill-current" />
                PRO'YA GEÇ VE KULLANMAYA BAŞLA
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="border-white/10 bg-white/5 text-slate-300 hover:text-white px-8 py-6 rounded-2xl font-bold transition-all"
              >
                Geri Dön
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

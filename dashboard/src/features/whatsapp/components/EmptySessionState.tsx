import React from 'react';
import { MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useT } from '../../../lib/i18n';

interface EmptySessionStateProps {
  handleAddNewSessionClick: () => void;
}

export function EmptySessionState({ handleAddNewSessionClick }: EmptySessionStateProps) {
  const t = useT();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-transparent">
      <div className="max-w-2xl w-full relative">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative bg-[#0c1220]/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl overflow-hidden group text-center space-y-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex flex-col items-center space-y-5">
            <div className="bg-gradient-to-tr from-emerald-500 to-green-600 p-6 rounded-3xl shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform duration-500">
              <MessageCircle size={44} className="text-black animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                WhatsApp CRM & <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Çoklu Oturum Yönetimi</span>
              </h2>
              <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
                İlk WhatsApp hesabınızı ekleyerek B2B müşterilerinizle otomatik şablonlar, AI yanıt önerileri ve akıllı gecikme koruması ile yazışmaya başlayın.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
            {[
              { title: 'Çoklu Oturum', desc: 'Birden fazla WhatsApp hesabını aynı anda bağlı tutun ve yönetin.' },
              { title: 'Hazır Şablonlar', desc: 'Müşteri verileriyle otomatik olarak doldurulan şablonlarla hız kazanın.' },
              { title: 'AI Copilot', desc: 'Müşterilerinizin profilini analiz eden akıllı AI asistanı.' }
            ].map((feature, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all duration-300">
                <p className="text-xs font-black text-emerald-400">{feature.title}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1.5 leading-normal">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleAddNewSessionClick}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-8 py-6 rounded-2xl text-base gap-2.5 transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
            >
              <UserPlus size={18} />
              İLK HESABI BAĞLA VE BAŞLA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

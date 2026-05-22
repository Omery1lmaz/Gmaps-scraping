import React from 'react';
import { RefreshCcw, Loader2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../../components/ui/button';

interface WhatsAppConnectorProps {
  status: string;
  qrCode: string | null;
  connectMutation: any;
  selectedSessionId: string | null;
  lastErrorMessage: string | null;
}

export function WhatsAppConnector({
  status,
  qrCode,
  connectMutation,
  selectedSessionId,
  lastErrorMessage
}: WhatsAppConnectorProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto space-y-8 animate-in fade-in duration-500">
      {/* Background Glows */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative space-y-3 z-10">
        <h3 className="text-2xl font-black text-white tracking-tight">
          WhatsApp Hesabınızı <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Bağlayın</span>
        </h3>
        <p className="text-slate-400 text-xs font-semibold max-w-sm mx-auto leading-relaxed">
          Hesabınızı entegre etmek için aşağıdaki adımları izleyin ve karekodu taratın.
        </p>
      </div>

      {/* QR Code / Spinner Container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[280px] w-full max-w-xs bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
        {status === 'QR_READY' && qrCode ? (
          <div className="space-y-4 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <QRCodeSVG 
              value={qrCode} 
              size={200} 
              level="H" 
              includeMargin={true} 
              className="rounded-2xl border border-white/10 bg-white p-2.5 shadow-2xl" 
            />
            <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
              Karekod Okutulmayı Bekliyor
            </div>
          </div>
        ) : status === 'INITIALIZING' || connectMutation.isPending ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8 animate-in fade-in duration-300">
            <Loader2 className="size-12 animate-spin text-emerald-500" />
            <p className="text-xs font-black text-slate-300">Tarayıcı & Bağlantı Başlatılıyor</p>
            <p className="text-[10px] font-semibold text-slate-500 max-w-[200px] leading-normal">
              Sistem arka planda güvenli bir Chromium oturumu oluşturuyor, lütfen bekleyin...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-5 py-6 text-center animate-in fade-in duration-300">
            <div className="size-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400">
              <AlertCircle className="size-8" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-300">Bağlantı Kurulmadı</p>
              {lastErrorMessage && (
                <p className="text-[10px] font-semibold text-rose-400 max-w-[200px] line-clamp-2 leading-relaxed">
                  {lastErrorMessage}
                </p>
              )}
            </div>
            <Button
              onClick={() => connectMutation.mutate(selectedSessionId as string)}
              disabled={connectMutation.isPending}
              className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl shadow-lg shadow-emerald-500/10 transition-all gap-2 active:scale-95 duration-200"
            >
              {connectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <RefreshCcw size={14} />
                  Karekod Üret & Bağlan
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/5 rounded-2xl p-5 text-left space-y-4">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Adım Adım Kurulum Kılavuzu</p>
        <div className="grid grid-cols-1 gap-3 text-xs font-bold text-slate-400">
          {[
            { num: '1', text: 'Telefonunuzda WhatsApp uygulamasını açın.' },
            { num: '2', text: 'Ayarlar > Bağlı Cihazlar menüsüne gidin.' },
            { num: '3', text: 'Cihaz Bağla butonuna tıklayın.' },
            { num: '4', text: 'Yukarıdaki karekodu telefon kameranız ile taratın.' }
          ].map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black">
                {step.num}
              </span>
              <span className="leading-relaxed">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

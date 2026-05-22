import React from 'react';
import { MessageSquare, X, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  newSessionName: string;
  setNewSessionName: (name: string) => void;
  onCreateSession: (name: string) => void;
  isPending: boolean;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  newSessionName,
  setNewSessionName,
  onCreateSession,
  isPending
}: CreateSessionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#0c1220]/90 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-bl-[80px] pointer-events-none" />
        
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <MessageSquare size={16} />
            </span>
            <span>Yeni WhatsApp Hesabı Ekle</span>
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Hesap Adı / Etiketi
            </label>
            <Input
              type="text"
              placeholder="Örn: Müşteri Destek, Satış Ekibi"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="h-11 rounded-xl border-white/5 bg-white/5 text-slate-100 placeholder-slate-500 focus-visible:ring-emerald-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCreateSession(newSessionName);
                }
              }}
            />
            <p className="text-[10px] font-semibold text-slate-500">
              Bu ismi hesabı ayırt etmek için panellerde kullanacaksınız.
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 border-white/5 bg-white/5 text-slate-300 hover:text-white rounded-xl font-bold transition-all"
            >
              İptal
            </Button>
            <Button
              onClick={() => onCreateSession(newSessionName)}
              disabled={isPending || !newSessionName.trim()}
              className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl shadow-lg shadow-emerald-500/10 transition-all gap-2"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Hesap Oluştur'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

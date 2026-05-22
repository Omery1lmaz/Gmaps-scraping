import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  Sparkles, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  Info,
  Type
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { toast } from 'sonner';
import { cn } from '../lib/utils';



const tones = [
  { id: 'PROFESSIONAL', label: 'Profesyonel' },
  { id: 'CASUAL', label: 'Samimi' },
  { id: 'LOCAL_FRIENDLY', label: 'Yerel/Esnaf' },
  { id: 'SHORT_DIRECT', label: 'Kısa & Net' },
  { id: 'HIGH_TICKET', label: 'Premium' }
];

interface AIPersonalizerProps {
  leadId: string;
  templateContent: string;
  onVariationGenerated: (text: string) => void;
}

export function AIPersonalizer({ leadId, templateContent, onVariationGenerated }: AIPersonalizerProps) {
  const [tone, setTone] = useState('PROFESSIONAL');
  const [generation, setGeneration] = useState<any>(null);

  const personalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ai/personalize', {
        leadId,
        template: templateContent,
        tone
      });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneration(data);
      onVariationGenerated(data.generatedText);
      toast.success('AI varyasyonu oluşturuldu');
    }
  });

  const getSpamLevel = (score: number) => {
    if (score < 0.3) return { label: 'DÜŞÜK', color: 'text-green-500', icon: CheckCircle2 };
    if (score < 0.6) return { label: 'ORTA', color: 'text-amber-500', icon: Info };
    return { label: 'YÜKSEK', color: 'text-red-500', icon: ShieldAlert };
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-blue-600" />
          <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest">AI Kişiselleştirme</h4>
        </div>
        <Badge className="bg-blue-600 text-white border-none font-black text-[9px] px-2 py-0.5 rounded-full">
          BETA
        </Badge>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={tone} onValueChange={(val) => setTone(val || 'PROFESSIONAL')}>
            <SelectTrigger className="rounded-xl border-blue-100 bg-white font-bold text-xs h-10">
              <SelectValue placeholder="Ton seçin" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              {tones.map(t => (
                <SelectItem key={t.id} value={t.id} className="rounded-lg font-bold text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 font-bold h-10 px-4 rounded-xl"
          onClick={() => personalizeMutation.mutate()}
          disabled={personalizeMutation.isPending}
        >
          {personalizeMutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : 'Oluştur'}
        </Button>
      </div>

      {generation && (
        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-white rounded-lg border border-blue-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Spam Skoru</p>
               <div className={cn("flex items-center gap-1.5 text-xs font-black", getSpamLevel(generation.spamScore || 0).color)}>
                  {React.createElement(getSpamLevel(generation.spamScore || 0).icon, { size: 12 })}
                  {getSpamLevel(generation.spamScore || 0).label}
               </div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-blue-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Okunabilirlik</p>
               <div className="text-xs font-black text-blue-600">YÜKSEK</div>
            </div>
          </div>
          
          {generation.spamScore > 0.7 && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex gap-2">
               <AlertCircle className="size-4 text-red-500 shrink-0" />
               <p className="text-[10px] font-bold text-red-700 leading-tight">
                 Bu mesaj önceki gönderimlerinize çok benzer. WhatsApp engellemesini önlemek için "Oluştur" butonuna tekrar basarak farklı bir varyasyon deneyin.
               </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

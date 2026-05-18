import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTemplates, createSequence } from '../lib/api';
import { useNavigate } from '../lib/router';
import { 
  Zap, 
  ArrowLeft, 
  Plus, 
  Trash2,
  Clock,
  ListTree,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export function CreateSequencePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([{ templateId: '', delayHours: 0 }]);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => createSequence(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success('Otomasyon dizisi başarıyla oluşturuldu');
      navigate('/sequences');
    },
    onError: () => toast.error('Otomasyon dizisi oluşturulamadı')
  });

  const addStep = () => setSteps([...steps, { templateId: '', delayHours: 24 }]);
  const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!name.trim()) return toast.error('Lütfen otomasyon dizisi için bir ad girin.');
    if (steps.some(s => !s.templateId)) return toast.error('Lütfen tüm adımlar için bir şablon seçin.');
    createMutation.mutate({ name, steps });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/sequences')} 
          className="rounded-full hover:bg-white text-slate-400 hover:text-slate-800"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <Plus className="text-amber-500" /> Yeni Otomasyon Dizisi
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">WhatsApp takip adımlarını sıraya dizin ve zaman aralıklarını kurgulayın.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Sequence Details & Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ListTree size={18} className="text-amber-500" /> Genel Bilgiler
            </h3>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Dizi (Otomasyon) Adı</label>
              <Input 
                placeholder="Örn: 3 Adımlı B2B Tanışma Takip Dizisi" 
                className="rounded-xl font-bold h-11 border-slate-200 focus:border-amber-500 focus:ring-amber-500/20"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Steps Editor */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" /> Otomasyon Adımları
              </h3>
              <Button 
                onClick={addStep} 
                className="bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold text-xs rounded-xl h-9 px-4 transition-colors"
              >
                + Adım Ekle
              </Button>
            </div>

            <div className="space-y-4 pt-2">
              {steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="relative p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-4 group hover:border-slate-200 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500 text-white font-black text-[10px] border-none px-2.5 py-0.5 rounded-full">
                      ADIM {idx + 1}
                    </Badge>
                    {idx > 0 && (
                      <button 
                        onClick={() => removeStep(idx)} 
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gönderilecek Şablon</label>
                      <div className="relative">
                        <select 
                          value={step.templateId} 
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '__create_new__') {
                              if (window.confirm('Yeni bir şablon oluşturmak için Şablonlar sayfasına yönlendirileceksiniz. Mevcut dizi ilerlemeniz kaybolabilir. Devam etmek istiyor musunuz?')) {
                                navigate('/templates');
                              }
                              return;
                            }
                            setSteps(s => s.map((st, i) => i === idx ? { ...st, templateId: val } : st));
                          }}
                          className="w-full rounded-xl font-bold text-sm bg-white border border-slate-200 h-10 px-3 pr-10 appearance-none focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-700"
                        >
                          <option value="" className="font-bold text-xs text-slate-400">Bir şablon seçin...</option>
                          <option value="__create_new__" className="font-black text-xs text-blue-600 bg-blue-50">+ Yeni Şablon Oluştur...</option>
                          {templates.map((t: any) => (
                            <option key={t._id || t.id} value={t._id || t.id} className="font-bold text-xs">
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {templates.length === 0 && (
                        <p className="text-[10px] font-black text-red-500 mt-1">
                          ⚠️ Henüz hiç şablon oluşturmadınız. <span className="underline cursor-pointer text-blue-600 hover:text-blue-700" onClick={() => navigate('/templates')}>Şimdi Şablon Oluştur</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gecikme Süresi (Saat)</label>
                      <div className="relative">
                        <Input 
                          type="number"
                          min="0"
                          className="rounded-xl font-bold text-sm bg-white border-slate-200 h-10 pr-12"
                          value={step.delayHours}
                          onChange={e => setSteps(s => s.map((st, i) => i === idx ? { ...st, delayHours: parseInt(e.target.value) || 0 } : st))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">Saat</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Info: Anti-Spam & Action */}
        <div className="space-y-6">
          <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-100 space-y-3">
            <h4 className="font-black text-amber-800 text-sm flex items-center gap-2">
              <ShieldCheck className="size-5 text-amber-500" /> Güvenlik Koruması
            </h4>
            <p className="text-xs font-semibold text-amber-700 leading-relaxed">
              Diziye eklenen işletmelerden herhangi biri size WhatsApp üzerinden yanıt verirse, yapay zeka tabanlı koruma sistemi bu diziyi o işletme için <strong>otomatik olarak askıya alır</strong>. Böylelikle spam riski ortadan kalkar.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Otomasyonu kaydettiğinizde aktif hale gelecektir. Ardından boru hattınızdaki işletmeleri bu diziye bağlayabilirsiniz.
            </p>
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
              onClick={handleSave}
              disabled={createMutation.isPending}
            >
              <Check size={18} /> Otomasyonu Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSequences, getTemplates, deleteSequence, updateSequence } from '../lib/api';
import { useNavigate } from '../lib/router';
import { 
  Zap, 
  Plus, 
  ChevronRight, 
  Clock, 
  Play, 
  Trash2,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function SequencesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences'],
    queryFn: getSequences
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteSequence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success('Dizi başarıyla silindi');
    },
    onError: () => toast.error('Dizi silinirken hata oluştu')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, steps }: { id: string, steps: any[] }) => updateSequence(id, { steps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success('Gecikme süresi güncellendi');
    },
    onError: () => toast.error('Güncelleme başarısız oldu')
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <Zap className="text-amber-500 fill-amber-500" /> WP Otomasyon
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Akıllı takip sekansları (Dizi) ve yanıt algılama sistemi oluşturun.</p>
        </div>
        <Button 
          onClick={() => navigate('/sequences/create')}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 rounded-xl shadow-lg shadow-amber-100"
        >
          <Plus size={18} /> Yeni Dizi Oluştur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Diziler Yükleniyor...</div>
        ) : sequences.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <Zap className="size-16 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Henüz otomasyon dizisi oluşturulmadı</p>
          </div>
        ) : sequences.map((seq: any) => (
          <Card key={seq._id} className="border-none shadow-sm hover:shadow-md transition-all bg-white rounded-3xl overflow-hidden group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className={cn("border-none text-white font-black text-[9px] px-2 py-0.5 rounded-full", seq.isActive ? "bg-emerald-500" : "bg-slate-400")}>
                  {seq.isActive ? 'AKTİF' : 'PASİF'}
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <Target size={12} className="text-blue-400" /> {seq._count?.leadStates || 0} Kişi Ekli
                </div>
              </div>
              <CardTitle className="text-xl font-black text-slate-800 line-clamp-1">{seq.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {seq.steps?.map((step: any, idx: number) => {
                  const tpl = templates.find((t: any) => t._id === step.templateId);
                  return (
                    <div key={step._id || idx} className="flex items-center gap-2 group/step">
                      <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-xs font-bold text-slate-600 truncate">{tpl ? tpl.name : 'Silinmiş Şablon'}</p>
                      </div>
                      <div 
                        className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase bg-slate-50 px-2 py-1 rounded-full border border-slate-200 cursor-pointer hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors"
                        onClick={() => {
                          const newDelay = window.prompt('Yeni gecikme süresini SAAT cinsinden girin (Hemen göndermek için 0 yazın):', step.delayHours.toString());
                          if (newDelay !== null && !isNaN(parseInt(newDelay))) {
                            const newSteps = [...seq.steps];
                            newSteps[idx].delayHours = parseInt(newDelay);
                            updateMutation.mutate({ id: seq._id, steps: newSteps });
                          }
                        }}
                        title="Tıklayarak Gecikme Süresini Değiştir"
                      >
                        <Clock size={10} /> {step.delayHours}s Gecikme
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-blue-600">
                       <Play size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500"
                      onClick={() => {
                        if(window.confirm('Bu diziyi silmek istediğinize emin misiniz?')) {
                          deleteMutation.mutate(seq._id);
                        }
                      }}
                    >
                       <Trash2 size={14} />
                    </Button>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => navigate(`/sequences/${seq._id}`)}
                   className="h-8 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl px-3"
                 >
                    İşletmeleri Gör <ChevronRight size={14} className="ml-1" />
                 </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

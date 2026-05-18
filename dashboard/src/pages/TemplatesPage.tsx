import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTemplates, createTemplate, deleteTemplate } from '../lib/api';
import { 
  FileText, 
  Plus, 
  Trash2,
  ListTree,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const createMutation = useMutation({
    mutationFn: async () => createTemplate({ name, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsCreateOpen(false);
      setName('');
      setContent('');
      toast.success('Şablon başarıyla oluşturuldu');
    },
    onError: () => toast.error('Şablon oluşturulamadı')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Şablon başarıyla silindi');
    },
    onError: () => toast.error('Şablon silinirken bir hata oluştu')
  });

  const handleCreate = () => {
    if (!name || !content) return toast.error('Lütfen tüm alanları doldurun');
    createMutation.mutate();
  };

  const insertVariable = (variable: string) => {
    setContent((prev) => prev + `{${variable}}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <FileText className="text-blue-600 fill-blue-600" /> WhatsApp Şablonları
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Satış ve takip mesajlarınız için dinamik metin şablonları tasarlayın.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl shadow-lg shadow-blue-100">
              <Plus size={18} /> Yeni Şablon Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <FileText className="text-blue-600" /> Şablon Oluşturucu
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Şablon Adı</label>
                <Input 
                  placeholder="Örn: İlk Tanışma (Soğuk Arama Öncesi)" 
                  className="rounded-xl font-bold"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mesaj İçeriği</label>
                </div>
                <Textarea 
                  placeholder="Merhaba {businessName}! Sizi {city} bölgesindeki harika hizmetlerinizden dolayı kutluyoruz..." 
                  className="min-h-[160px] rounded-xl font-medium text-sm resize-none"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
                <div className="pt-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Dinamik Değişkenler (Tıkla ve Ekle):</p>
                   <div className="flex flex-wrap gap-2">
                     {['businessName', 'city', 'category', 'phone', 'website'].map(variable => (
                       <Badge key={variable} variant="outline" className="cursor-pointer hover:bg-blue-50 text-blue-600 border-blue-200" onClick={() => insertVariable(variable)}>
                         {`{${variable}}`}
                       </Badge>
                     ))}
                   </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                <AlertCircle className="size-5 text-blue-600 shrink-0" />
                <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
                  Şablon içerisindeki süslü parantezli değerler (örn: <strong>{`{businessName}`}</strong>), mesaj gönderilirken hedef firmanın gerçek bilgileriyle otomatik olarak doldurulacaktır.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold">İptal</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl px-8"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                Şablonu Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Şablonlar Yükleniyor...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <ListTree className="size-16 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Henüz hiç şablon oluşturmadınız.</p>
          </div>
        ) : templates.map((template: any) => (
          <Card key={template._id || template.id} className="border-none shadow-sm hover:shadow-md transition-all bg-white rounded-3xl overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-lg font-black text-slate-800 line-clamp-1">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
              <div>
                 <p className="text-sm font-medium text-slate-600 line-clamp-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                   {template.content}
                 </p>
                 {template.variables && template.variables.length > 0 && (
                   <div className="mt-4 flex flex-wrap gap-1.5">
                     {template.variables.map((variable: string) => (
                       <span key={variable} className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                         {variable}
                       </span>
                     ))}
                   </div>
                 )}
              </div>
              <div className="mt-5 flex justify-end">
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-[11px] h-8 px-3 rounded-lg"
                   onClick={() => {
                     if(window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
                       deleteMutation.mutate(template._id || template.id);
                     }
                   }}
                 >
                   <Trash2 size={14} className="mr-1.5" /> Sil
                 </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Badge is needed for the variables display
function Badge({ children, className, variant = 'default', ...props }: any) {
  const variants: any = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    outline: "text-slate-950 border border-slate-200",
  }
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  )
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Copy, 
  Archive,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from './ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { toast } from 'sonner';

const API_URL = 'http://localhost:3001/api';

const categories = [
  'COLD_OUTREACH',
  'FOLLOW_UP',
  'BOOKING',
  'REACTIVATION',
  'CUSTOM'
];

const variables = [
  { name: 'businessName', label: 'İşletme Adı' },
  { name: 'city', label: 'Şehir' },
  { name: 'category', label: 'Kategori' },
  { name: 'rating', label: 'Puan' },
  { name: 'website', label: 'Website' },
  { name: 'phone', label: 'Telefon' },
];

export function TemplateManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'COLD_OUTREACH'
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await api.get('/templates');
      return response.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTemplate) {
        return api.patch(`/templates/${editingTemplate.id}`, data);
      }
      return api.post('/templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: '', content: '', category: 'COLD_OUTREACH' });
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    }
  });

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category
    });
    setIsDialogOpen(true);
  };

  const handleInsertVariable = (varName: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{${varName}}`
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Mesaj Şablonları</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogTrigger asChild>
           <Button className="bg-blue-600 hover:bg-blue-700 font-bold gap-2" onClick={() => {
             setEditingTemplate(null);
             setFormData({ name: '', content: '', category: 'COLD_OUTREACH' });
           }}>
             <Plus size={18} /> Yeni Şablon
           </Button>
         </DialogTrigger>

          <DialogContent className="sm:max-w-[600px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">
                {editingTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Şablon Adı</label>
                <Input 
                  placeholder="Örn: İlk Tanışma Mesajı" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="rounded-xl font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Kategori</label>
                <Select 
                  value={formData.category} 
                  onValueChange={val => setFormData({...formData, category: val || 'COLD_OUTREACH'})}
                >
                  <SelectTrigger className="rounded-xl font-bold">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="rounded-lg font-bold text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mesaj İçeriği</label>
                  <div className="flex gap-1">
                    {variables.map(v => (
                      <button 
                        key={v.name}
                        type="button"
                        onClick={() => handleInsertVariable(v.name)}
                        className="text-[9px] font-black bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded-md transition-colors"
                      >
                        +{v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea 
                  placeholder="Mesajınızı yazın... Değişkenler için {businessName} gibi ifadeler kullanabilirsiniz." 
                  className="min-h-[150px] rounded-2xl font-medium leading-relaxed"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </div>
              
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <Info className="size-5 text-amber-500 shrink-0" />
                <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                  <strong>İpucu:</strong> Mesajlarınıza değişkenler ekleyerek kişiselleştirin. WhatsApp anti-ban sistemimiz mesajları gönderirken aralara rastgele gecikmeler ekleyecektir.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsDialogOpen(false)}>İptal</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl px-8"
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.name || !formData.content}
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-20 text-center">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Şablonlar Yükleniyor...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-2 py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <MessageSquare className="size-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">Henüz hiç şablon oluşturmadınız.</p>
          </div>
        ) : templates.map((template: any) => (
          <Card key={template.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-3xl overflow-hidden group">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-tighter mb-1">
                  {template.category}
                </Badge>
                <CardTitle className="text-lg font-black text-slate-800">{template.name}</CardTitle>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(template)}>
                  <Edit2 size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(template.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-2xl text-xs font-medium text-slate-600 line-clamp-3 leading-relaxed border border-slate-100">
                {template.content}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Sparkles size={12} className="text-blue-400" />
                  {template.content.includes('{') ? 'Kişiselleştirme aktif' : 'Statik mesaj'}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800" onClick={() => {
                  navigator.clipboard.writeText(template.content);
                  toast.success('Kopyalandı');
                }}>
                  <Copy size={12} className="mr-1" /> Kopyala
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

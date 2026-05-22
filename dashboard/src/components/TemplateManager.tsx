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
  Info,
  Paperclip,
  Image as ImageIcon,
  Video,
  File
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
import { useT } from '../lib/i18n';

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
  const t = useT();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'COLD_OUTREACH',
    hasMedia: false,
    mediaType: 'IMAGE',
    mediaUrl: ''
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
      setFormData({ name: '', content: '', category: 'COLD_OUTREACH', hasMedia: false, mediaType: 'IMAGE', mediaUrl: '' });
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
      category: template.category,
      hasMedia: template.hasMedia || false,
      mediaType: template.mediaType || 'IMAGE',
      mediaUrl: template.mediaUrl || ''
    });
    setIsDialogOpen(true);
  };

  const handleInsertVariable = (varName: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{${varName}}`
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const response = await api.post('/upload', {
            fileName: file.name,
            base64Data
          });
          setFormData(prev => ({ ...prev, mediaUrl: response.data.url }));
          toast.success('Dosya başarıyla yüklendi!');
        } catch (uploadErr) {
          console.error(uploadErr);
          toast.error('Dosya yüklenirken bir hata oluştu.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      toast.error('Dosya okunurken bir hata oluştu.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{t('tm_templates_title')}</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogTrigger asChild>
           <Button className="bg-blue-600 hover:bg-blue-700 font-bold gap-2" onClick={() => {
             setEditingTemplate(null);
             setFormData({ name: '', content: '', category: 'COLD_OUTREACH', hasMedia: false, mediaType: 'IMAGE', mediaUrl: '' });
           }}>
              <Plus size={18} /> {t('tm_new_template_btn')}
           </Button>
         </DialogTrigger>

          <DialogContent className="sm:max-w-[600px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">
                {editingTemplate ? t('tm_edit_template') : t('tm_create_template')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('tm_template_name')}</label>
                <Input 
                  placeholder={t('tm_name_placeholder')} 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="rounded-xl font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('tm_category_label')}</label>
                <Select 
                  value={formData.category} 
                  onValueChange={val => setFormData({...formData, category: val || 'COLD_OUTREACH'})}
                >
                  <SelectTrigger className="rounded-xl font-bold">
                    <SelectValue placeholder={t('tm_select_category')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="rounded-lg font-bold text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="size-4 text-slate-500" />
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">
                      {t('tm_add_media')}
                    </label>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.hasMedia}
                    onChange={(e) => setFormData({...formData, hasMedia: e.target.checked})}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {formData.hasMedia && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tm_media_type')}</label>
                      <Select 
                        value={formData.mediaType} 
                        onValueChange={val => setFormData({...formData, mediaType: val || 'IMAGE'})}
                      >
                        <SelectTrigger className="rounded-xl font-bold text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                          <SelectItem value="IMAGE" className="rounded-lg font-bold text-xs">{t('tm_image')}</SelectItem>
                          <SelectItem value="VIDEO" className="rounded-lg font-bold text-xs">{t('tm_video')}</SelectItem>
                          <SelectItem value="DOCUMENT" className="rounded-lg font-bold text-xs">{t('tm_document')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {isUploading ? t('tm_uploading') : formData.mediaUrl ? t('tm_uploaded') : t('tm_select_file')}
                      </label>
                      {formData.mediaUrl ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={formData.mediaUrl}
                            readOnly
                            className="rounded-xl font-bold text-xs h-9 bg-slate-100 text-slate-500"
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 rounded-xl font-bold"
                            onClick={() => setFormData({...formData, mediaUrl: ''})}
                          >
                            {t('tm_delete_btn')}
                          </Button>
                        </div>
                      ) : (
                        <Input 
                          type="file"
                          accept={formData.mediaType === 'IMAGE' ? 'image/*' : formData.mediaType === 'VIDEO' ? 'video/*' : '*/*'}
                          disabled={isUploading}
                          onChange={handleFileUpload}
                          className="rounded-xl font-bold text-xs h-9 cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('tm_body_label')}</label>
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
                  placeholder={t('tm_type_message')}
                  className="min-h-[150px] rounded-2xl font-medium leading-relaxed"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </div>
              
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <Info className="size-5 text-amber-500 shrink-0" />
                <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                  {t('tm_tip')}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsDialogOpen(false)}>{t('tm_cancel')}</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl px-8"
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.name || !formData.content}
              >
                {t('tm_save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-20 text-center">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">{t('tm_loading')}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-2 py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <MessageSquare className="size-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">{t('tm_empty')}</p>
          </div>
        ) : templates.map((template: any) => (
          <Card key={template.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-3xl overflow-hidden group">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-tighter mb-1">
                  {template.category}
                </Badge>
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                  {template.name}
                  {template.hasMedia && (
                    <span title={t('tm_contains_media')} className="text-blue-500 bg-blue-50 p-1.5 rounded-full">
                      {template.mediaType === 'IMAGE' ? <ImageIcon size={14} /> : template.mediaType === 'VIDEO' ? <Video size={14} /> : <File size={14} />}
                    </span>
                  )}
                </CardTitle>
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
                  {template.content.includes('{') ? t('tm_active_custom') : t('tm_static_msg')}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800" onClick={() => {
                  navigator.clipboard.writeText(template.content);
                  toast.success(t('tm_copied'));
                }}>
                  <Copy size={12} className="mr-1" /> {t('tm_copy')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

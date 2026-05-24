import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '../lib/router';
import { createTemplate, api } from '../lib/api';
import { useT } from '../lib/i18n';
import {
  FileText,
  AlertCircle,
  Paperclip,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export function CreateTemplatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaType, setMediaType] = useState('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => createTemplate({ name, content, hasMedia, mediaType, mediaUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(t('ct_create_success'));
      navigate('/templates');
    },
    onError: () => toast.error(t('ct_create_error'))
  });

  const handleCreate = () => {
    if (!name || !content) return toast.error(t('ct_fill_all_fields'));
    createMutation.mutate();
  };

  const insertVariable = (variable: string) => {
    setContent((prev) => prev + `{${variable}}`);
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
          setMediaUrl(response.data.url);
          toast.success(t('ct_file_upload_success'));
        } catch (uploadErr) {
          console.error(uploadErr);
          toast.error(t('ct_file_upload_error'));
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      toast.error(t('ct_file_read_error'));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/templates')} className="rounded-full shadow-xl bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 hover:border-white/15 text-slate-400 hover:text-emerald-400 hover:bg-zinc-800/40 transition-colors">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-3xl tracking-tight bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-amber-400 dark:via-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent font-black flex items-center gap-3">
            {t('ct_title')}
          </h2>
          <p className="text-slate-400 mt-1 text-sm font-medium">{t('ct_subtitle')}</p>
        </div>
      </div>

      <div className="bg-[#0c1220]/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/5 hover:border-white/15 space-y-8">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-zinc-550 uppercase tracking-widest">{t('ct_name_label')}</label>
          <Input
            placeholder={t('ct_name_placeholder')}
            className="rounded-xl font-bold h-12 bg-white/80 dark:bg-zinc-950/50 border-slate-200/80 dark:border-zinc-800/60 text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-4 p-5 bg-white/90 dark:bg-zinc-950/60 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="size-5 text-emerald-500" />
              <label className="text-xs font-black text-slate-100 uppercase tracking-widest cursor-pointer">
                {t('ct_media_label')}
              </label>
            </div>
            <input
              type="checkbox"
              checked={hasMedia}
              onChange={(e) => setHasMedia(e.target.checked)}
              className="size-5 rounded border-zinc-850 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 cursor-pointer"
            />
          </div>

          {hasMedia && (
            <div className="pt-4 border-t border-slate-200/80 dark:border-zinc-800/60 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('ct_media_type_label')}</label>
                <Select
                  value={mediaType}
                  onValueChange={val => setMediaType(val || 'IMAGE')}
                >
                  <SelectTrigger className="rounded-xl font-bold text-sm h-11 bg-white/80 dark:bg-zinc-950/50 border-slate-200/80 dark:border-zinc-800/60 text-slate-100 focus:border-emerald-500/50 focus:ring-emerald-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/5 shadow-xl bg-white dark:bg-zinc-950 text-white z-[9999]">
                    <SelectItem value="IMAGE" className="rounded-lg font-bold text-sm focus:bg-emerald-500/20 focus:text-emerald-400 text-slate-100 cursor-pointer">Resim</SelectItem>
                    <SelectItem value="VIDEO" className="rounded-lg font-bold text-sm focus:bg-emerald-500/20 focus:text-emerald-400 text-slate-100 cursor-pointer">Video</SelectItem>
                    <SelectItem value="DOCUMENT" className="rounded-lg font-bold text-sm focus:bg-emerald-500/20 focus:text-emerald-400 text-slate-100 cursor-pointer">Belge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isUploading ? t('ct_uploading') : mediaUrl ? t('ct_uploaded') : t('ct_select_file')}
                </label>
                {mediaUrl ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={mediaUrl}
                      readOnly
                      className="rounded-xl font-bold text-sm h-11 bg-white/5 border-white/5/80 text-slate-400"
                    />
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl font-bold px-6 border-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                      onClick={() => setMediaUrl('')}
                    >
                      {t('ct_delete_media')}
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept={mediaType === 'IMAGE' ? 'image/*' : mediaType === 'VIDEO' ? 'video/*' : '*/*'}
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="rounded-xl font-bold text-sm h-11 bg-white/80 dark:bg-zinc-950/50 border-slate-200/80 dark:border-zinc-800/60 text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border file:border-emerald-500/20 file:text-[10px] file:font-black file:uppercase file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer pt-[6px]"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-zinc-550 uppercase tracking-widest">{t('ct_message_label')}</label>
          </div>
          <Textarea
            placeholder={t('ct_message_placeholder')}
            className="min-h-[200px] rounded-xl font-medium text-sm resize-none p-4 bg-white/80 dark:bg-zinc-950/50 border-slate-200/80 dark:border-zinc-800/60 text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="pt-2">
              <p className="text-[10px] font-black text-zinc-550 uppercase mb-3">{t('ct_variables_label')}</p>
              <div className="flex flex-wrap gap-2">
                {['businessName', 'city', 'category', 'phone', 'website', 'booking_link'].map(variable => (
                  <Badge
                    key={variable}
                    variant="outline"
                    onClick={() => insertVariable(variable)}
                  >
                    {`{${variable}}`}
                  </Badge>
                ))}
              </div>
          </div>
        </div>

        <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20 flex gap-4 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
          <AlertCircle className="size-6 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold text-emerald-300 leading-relaxed pt-1">
            {t('ct_info_text')}
          </p>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-white/5 hover:border-white/15">
          <Button variant="ghost" onClick={() => navigate('/templates')} className="font-bold h-12 px-6 text-slate-400 hover:text-slate-100 hover:bg-slate-100 dark:bg-zinc-900/60 transition-colors">{t('ct_cancel_btn')}</Button>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 font-black rounded-xl px-10 h-12 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all border-none"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? t('ct_saving_btn') : t('ct_save_btn')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Badge component for variables
function Badge({ children, className, variant = 'default', ...props }: any) {
  const variants: any = {
    default: "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
    outline: "text-slate-100 border border-white/5 hover:border-white/15 bg-[#0c1220]/50 backdrop-blur-sm hover:bg-zinc-800/35 hover:text-emerald-400 hover:border-emerald-500/30",
  }
  return (
    <div className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  )
}

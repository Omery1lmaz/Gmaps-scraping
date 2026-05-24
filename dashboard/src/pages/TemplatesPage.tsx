import React, { useState } from 'react';
import { useT } from '../lib/i18n';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTemplates, createTemplate, deleteTemplate } from '../lib/api';
import { 
  FileText, 
  Plus, 
  Trash2,
  ListTree,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  Video,
  File
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from '../lib/router';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useDialogStore } from '../stores/dialogStore';

export function TemplatesPage() {
  const { openConfirm } = useDialogStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(t('tpl_delete_success'));
    },
    onError: () => toast.error(t('tpl_delete_error'))
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <FileText className="text-emerald-500 fill-emerald-500/20" /> <span className="text-gradient-tw">{t('templates_title')}</span>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">{t('tpl_subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/templates/create')} className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold gap-2 rounded-xl shadow-lg shadow-emerald-500/10">
          <Plus size={18} /> {t('tpl_add_new')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">{t('tpl_loading')}</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#0c1220]/50 rounded-2xl border border-white/5 backdrop-blur-md">
            <ListTree className="size-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{t('tpl_empty')}</p>
          </div>
        ) : templates.map((template: any) => (
          <Card key={template._id || template.id} className="border border-white/5 bg-[#0c1220]/50 hover:bg-[#0c1220]/75 backdrop-blur-md hover:border-emerald-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)] transition-all duration-300 rounded-2xl overflow-hidden flex flex-col group relative">
            
            {/* Visual top border line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="pb-3 px-5 pt-5 border-b border-white/5 flex flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base font-black text-white tracking-tight line-clamp-1 group-hover:text-emerald-400 transition-colors">
                  {template.name}
                </CardTitle>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                  {template.content?.length || 0} {t('tpl_char_count')}
                </span>
              </div>

              {template.hasMedia ? (
                <span title={`${template.mediaType} ${t('tpl_media_contains')}`} className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl flex-shrink-0">
                  {template.mediaType === 'IMAGE' ? <ImageIcon size={15} /> : template.mediaType === 'VIDEO' ? <Video size={15} /> : <File size={15} />}
                </span>
              ) : (
                <span className="text-slate-500 bg-white/5 p-2 rounded-xl flex-shrink-0">
                  <FileText size={15} />
                </span>
              )}
            </CardHeader>
            
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                 {/* WhatsApp Preview Bubble Aesthetic */}
                 <div className="relative">
                   <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-1 select-none">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {t('tpl_preview_label')}
                   </div>
                   <div className="text-xs font-semibold text-slate-300 leading-relaxed bg-[#080b10]/60 p-4 rounded-xl border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                     <p className="whitespace-pre-line break-words line-clamp-5">
                       {template.content}
                     </p>
                     <div className="absolute bottom-2 right-3 text-[9px] font-bold text-slate-500/80 flex items-center gap-1 select-none">
                       <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       <span className="text-emerald-500">✓✓</span>
                     </div>
                   </div>
                 </div>

                 {/* Variables */}
                 {template.variables && template.variables.length > 0 && (
                   <div className="space-y-1.5">
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">{t('tpl_dynamic_fields')}</span>
                     <div className="flex flex-wrap gap-1.5">
                       {template.variables.map((variable: string) => (
                         <span key={variable} className="text-[9px] font-extrabold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition-all select-all">
                           {`{${variable}}`}
                         </span>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
              
              <div className="mt-6 pt-3 border-t border-white/5 flex justify-end">
                 <Button
                   variant="ghost"
                   size="sm"
                   className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-extrabold text-[11px] h-8 px-3.5 rounded-xl transition-all"
                   onClick={() => {
                     openConfirm({
                       title: 'Şablonu Sil',
                       message: t('tpl_delete_confirm'),
                       onConfirm: () => deleteMutation.mutate(template._id || template.id),
                       confirmText: t('tpl_delete_btn'),
                       cancelText: t('ct_cancel_btn')
                     });
                   }}
                 >
                   <Trash2 size={13} className="mr-1.5" /> {t('tpl_delete_btn')}
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

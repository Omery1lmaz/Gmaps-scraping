import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  MessageSquare, Eye, EyeOff, Check, Image as ImageIcon, Plus, X, Sparkles, 
  HelpCircle, Clock, Target, AlertCircle, Heart, Smile, GitFork, Compass, Send, CheckCircle2 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTemplates, createTemplate } from '../../lib/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useT } from '../../lib/i18n';

const ICON_MAP: any = {
  messagesquare: MessageSquare,
  sparkles: Sparkles,
  helpcircle: HelpCircle,
  clock: Clock,
  target: Target,
  alertcircle: AlertCircle,
  heart: Heart,
  smile: Smile,
  gitfork: GitFork,
  compass: Compass,
  send: Send,
  checkcircle: CheckCircle2
};

const ACCENT_COLORS: any = {
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', handle: '#3b82f6' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', handle: '#10b981' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', handle: '#f59e0b' },
  purple: { border: 'border-purple-500/30', bg: 'bg-purple-505/10', text: 'text-purple-400', handle: '#a855f7' },
  rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400', handle: '#f43f5e' },
  indigo: { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400', handle: '#6366f1' },
  pink: { border: 'border-pink-500/30', bg: 'bg-pink-505/10', text: 'text-pink-400', handle: '#ec4899' },
  slate: { border: 'border-zinc-800', bg: 'bg-zinc-800/30', text: 'text-zinc-400', handle: '#64748b' }
};

export function SendMessageNode({ data, id }: any) {
  const t = useT();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Quick-Create Form State
  const [newTplName, setNewTplName] = useState('');
  const [newTplBody, setNewTplBody] = useState('');
  const [newTplMedia, setNewTplMedia] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    data.templateId = val;
    setShowPreview(false);
  };

  const selectedTemplate = templates.find((t: any) => (t._id || t.id) === data.templateId);

  // Helper to get media url pointing to backend API if local
  const getMediaSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `http://localhost:3001${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Quick Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => createTemplate(payload),
    onSuccess: (newTpl) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      
      // Auto select the newly created template
      const newId = newTpl._id || newTpl.id;
      data.templateId = newId;
      
      toast.success(t('smn_template_created', newTplName));
      
      // Reset & close
      setNewTplName('');
      setNewTplBody('');
      setNewTplMedia('');
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error(t('smn_create_error'));
    }
  });

  const handleQuickCreate = () => {
    if (!newTplName.trim()) return toast.error(t('smn_enter_name'));
    if (!newTplBody.trim()) return toast.error(t('smn_enter_body'));

    createMutation.mutate({
      name: newTplName,
      body: newTplBody,
      mediaUrl: newTplMedia.trim() || undefined
    });
  };

  // Dynamic customization
  const colorKey = data.customColor || 'blue';
  const colorStyles = ACCENT_COLORS[colorKey] || ACCENT_COLORS.blue;
  const IconComponent = data.customIcon ? (ICON_MAP[data.customIcon.toLowerCase()] || MessageSquare) : MessageSquare;

  return (
    <div className={`px-4 py-3 shadow-lg rounded-2xl bg-[#090d12]/95 border-2 ${colorStyles.border} min-w-[220px] relative select-none`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
      
      {/* Telemetry Stats */}
      <div className="absolute -top-3 right-2 flex gap-1 z-10">
        {data.successCount !== undefined && data.successCount > 0 && (
          <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[9px] shadow-sm border border-white">
            {data.successCount} {t('smn_delivered')}
          </div>
        )}
        {data.failCount !== undefined && data.failCount > 0 && (
          <div className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] shadow-sm border border-white animate-pulse">
            {data.failCount} {t('error_title')}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg ${colorStyles.bg} p-1 ${colorStyles.text}`}>
            <IconComponent size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('smn_action')}</p>
            <h4 className="text-xs font-bold text-slate-100">{data.customLabel || t('smn_send_message')}</h4>
          </div>
        </div>

        {selectedTemplate && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-1.5 rounded-lg transition-colors border bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title={t('smn_preview')}
          >
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-black text-slate-400 uppercase">{t('smn_select_template')}</label>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase flex items-center gap-0.5"
            title={t('smn_quick_create')}
          >
            {t('smn_quick_create_btn')}
          </button>
        </div>
        <select 
          value={data.templateId || ''} 
          onChange={handleTemplateChange}
          className="w-full rounded-xl font-bold text-xs bg-zinc-900 border border-zinc-800 h-8 px-2 appearance-none focus:outline-none focus:border-blue-500 text-slate-100 cursor-pointer"
        >
          <option value="" className="text-xs text-slate-400 bg-zinc-900">{t('smn_not_selected')}</option>
          {templates.map((t: any) => (
            <option key={t._id || t.id} value={t._id || t.id} className="text-xs bg-zinc-900">
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Floating Interactive Glassmorphic WhatsApp Phone Preview */}
      {showPreview && selectedTemplate && (
        <div className="absolute left-[235px] top-0 w-64 bg-slate-900/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/50 p-3 z-40 backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{t('smn_live_preview')}</span>
          </div>

          <div className="bg-[#e5ddd5] dark:bg-slate-950 p-2.5 rounded-xl space-y-2 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="bg-[#dcf8c6] text-slate-800 rounded-lg p-2 shadow-sm text-[11px] font-medium relative max-w-[90%] ml-auto space-y-1.5 z-10">
              {selectedTemplate.mediaUrl && (
                <div className="rounded-lg overflow-hidden border border-[#bedca3] bg-[#d3f2b8] flex items-center justify-center min-h-[80px]">
                  {selectedTemplate.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video src={getMediaSrc(selectedTemplate.mediaUrl)} controls className="max-h-24 object-cover rounded-md" />
                  ) : (
                    <img 
                      src={getMediaSrc(selectedTemplate.mediaUrl)} 
                      alt="Template attachment" 
                      className="max-h-24 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const icon = document.createElement('div');
                          icon.className = 'p-3 text-emerald-700 font-bold flex items-center gap-1';
                          icon.innerHTML = `<span class="text-[9px] font-bold">${t('smn_media_attached')}</span>`;
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  )}
                </div>
              )}
              <p className="whitespace-pre-line leading-relaxed text-slate-900 break-words">
                {selectedTemplate.body || t('smn_not_found')}
              </p>
              <div className="flex items-center justify-end gap-1 text-[8px] text-slate-500 font-semibold select-none leading-none pt-0.5">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="flex text-sky-500 font-bold">✓✓</span>
              </div>
            </div>
          </div>
          <p className="text-[8px] text-slate-500 font-bold text-center mt-2">
            {t('smn_media_note')}
          </p>
        </div>
      )}

      {/* Quick-Create Glassmorphic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] backdrop-blur-xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Form Fields */}
            <div className="flex-1 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Sparkles size={16} className="animate-pulse" />
                  </div>
                  <h3 className="font-black text-slate-200 text-sm">{t('smn_quick_create_title')}</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-zinc-900 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-450 uppercase">{t('tm_template_name')}</label>
                  <input 
                    type="text" 
                    value={newTplName}
                    onChange={e => setNewTplName(e.target.value)}
                    placeholder={t('smn_name_placeholder')}
                    className="w-full rounded-xl font-bold text-xs bg-zinc-900 border border-zinc-805 h-9 px-3 focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-455 uppercase">{t('smn_body_label')}</label>
                  <textarea 
                    value={newTplBody}
                    onChange={e => setNewTplBody(e.target.value)}
                    placeholder={t('smn_body_placeholder')}
                    rows={4}
                    className="w-full rounded-xl font-bold text-xs bg-zinc-900 border border-zinc-805 p-3 focus:outline-none focus:border-blue-500 text-slate-100 resize-none"
                  />
                  <p className="text-[8px] text-slate-400 font-bold">
                    {t('smn_dynamic_fields_hint')}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-460 uppercase">{t('smn_media_url')}</label>
                  <input 
                    type="text" 
                    value={newTplMedia}
                    onChange={e => setNewTplMedia(e.target.value)}
                    placeholder={t('smn_media_example')}
                    className="w-full rounded-xl font-bold text-xs bg-zinc-900 border border-zinc-805 h-9 px-3 focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="font-bold text-xs rounded-xl h-9 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleQuickCreate}
                  disabled={createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9"
                >
                  {createMutation.isPending ? t('smn_creating') : t('smn_create_btn')}
                </Button>
              </div>
            </div>

            {/* Live Interactive Mobile Preview (WhatsApp Layout) */}
            <div className="w-full md:w-60 bg-slate-900 text-slate-100 p-6 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-800">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 mb-3 select-none">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase text-slate-400">{t('smn_live_draft')}</span>
              </div>

              <div className="bg-[#e5ddd5] dark:bg-slate-950 p-2.5 rounded-xl space-y-2 relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="bg-[#dcf8c6] text-slate-800 rounded-lg p-2 shadow-sm text-[10px] font-medium relative max-w-[95%] ml-auto space-y-1.5 z-10">
                  
                  {newTplMedia.trim() && (
                    <div className="rounded-lg overflow-hidden border border-[#bedca3] bg-[#d3f2b8] flex items-center justify-center min-h-[60px]">
                      {newTplMedia.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video src={getMediaSrc(newTplMedia)} className="max-h-20 object-cover" />
                      ) : (
                        <img 
                          src={getMediaSrc(newTplMedia)} 
                          alt="Live attachment preview" 
                          className="max-h-20 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const icon = document.createElement('div');
                              icon.className = 'p-2 text-emerald-700 font-bold flex items-center gap-1';
                              icon.innerHTML = `<span class="text-[8px] font-bold">${t('smn_media_attached')}</span>`;
                              parent.appendChild(icon);
                            }
                          }}
                        />
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-line leading-relaxed text-slate-900 break-words">
                    {newTplBody.trim() || t('smn_preview_placeholder')}
                  </p>
                  
                  <div className="flex items-center justify-end gap-1 text-[7px] text-slate-500 font-semibold select-none leading-none pt-0.5">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex text-sky-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Description Annotations */}
      {data.customDescription && (
        <div className="mt-2.5 pt-2 text-[9px] font-bold text-slate-400 border-t border-slate-100 italic leading-tight max-w-[190px] truncate" title={data.customDescription}>
          * {data.customDescription}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
    </div>
  );
}

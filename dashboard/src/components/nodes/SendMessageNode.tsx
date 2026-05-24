import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  MessageSquare, Eye, EyeOff, Check, Image as ImageIcon, Plus, X, Sparkles, 
  HelpCircle, Clock, Target, AlertCircle, Heart, Smile, GitFork, Compass, Send, CheckCircle2, Settings2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTemplates } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useWorkflowStore } from '../../stores/workflowStore';

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

export const SendMessageNode = React.memo(({ data, id }: any) => {
  const t = useT();
  const [showPreview, setShowPreview] = useState(false);
  const { setSelectedNodeForSettings } = useWorkflowStore();

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  const selectedTemplate = templates.find((t: any) => (t._id || t.id) === data.templateId);

  // Helper to get media url pointing to backend API if local
  const getMediaSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `http://localhost:3001${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Dynamic customization
  const colorKey = data.customColor || 'blue';
  const colorStyles = ACCENT_COLORS[colorKey] || ACCENT_COLORS.blue;
  const IconComponent = data.customIcon ? (ICON_MAP[data.customIcon.toLowerCase()] || MessageSquare) : MessageSquare;

  return (
    <div className={`px-4 py-3 shadow-lg rounded-2xl bg-[#090d12]/95 border-2 ${colorStyles.border} min-w-[220px] relative select-none group/node`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colorStyles.handle, width: 8, height: 8 }}
      />
      
      {/* Settings & Add Icons - Absolute positioned on hover */}
      <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNodeForSettings({ id, type: 'sendMessage', data } as any);
          }}
          className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 shadow-xl"
          title={t('vsb_node_settings')}
        >
          <Settings2 size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNodeForSettings({ id, type: 'sendMessage', data } as any);
          }}
          className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-500 border border-blue-500 shadow-xl"
          title={t('smn_add_variation')}
        >
          <Plus size={12} />
        </button>
      </div>
      
      {/* Telemetry Stats */}
      <div className="absolute -top-3 right-2 flex gap-1 z-10">
        {data.successCount !== undefined && data.successCount > 0 && (
          <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[9px] shadow-sm border border-white">
            {data.successCount} {t('smn_delivered')}
          </div>
        )}
        {data.failedCount !== undefined && data.activeCount === 0 && data.failedCount > 0 && (
          <div className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] shadow-sm border border-white">
            {data.failedCount} {t('smn_failed')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg ${colorStyles.bg} p-1 ${colorStyles.text}`}>
          <IconComponent size={16} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('smn_outreach')}</p>
          <h4 className="text-xs font-bold text-slate-100">{data.customLabel || t('smn_send_message')}</h4>
        </div>
        {selectedTemplate && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowPreview(!showPreview); }}
            className={`ml-auto p-1 rounded-md transition-colors ${showPreview ? 'bg-blue-500 text-white' : 'bg-slate-800 text-blue-400 hover:bg-slate-700'}`}
          >
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>

      <div className="space-y-2 mt-2">
        <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
          <p className="text-[9px] font-black text-slate-500 uppercase mb-1">{t('smn_select_template')}</p>
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold text-slate-200 truncate pr-2">
              {selectedTemplate ? selectedTemplate.name : t('smn_not_selected')}
            </p>
            {selectedTemplate && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowPreview(!showPreview); }}
                className="text-blue-400 hover:text-blue-300"
              >
                {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}
          </div>
        </div>

        {data.templates && data.templates.length > 0 && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="flex -space-x-2">
              {data.templates.slice(0, 3).map((_: any, i: number) => (
                <div key={i} className="w-5 h-5 rounded-full bg-blue-500 border-2 border-[#090d12] flex items-center justify-center text-[8px] font-black text-white">
                  {i + 1}
                </div>
              ))}
              {data.templates.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-[#090d12] flex items-center justify-center text-[8px] font-black text-slate-400">
                  +{data.templates.length - 3}
                </div>
              )}
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase">{data.templates.length} Varyasyon</span>
          </div>
        )}
      </div>

      {/* Floating Interactive Glassmorphic WhatsApp Phone Preview */}
      {showPreview && selectedTemplate && (
        <div className="absolute left-[235px] top-0 w-64 bg-slate-900/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/50 p-3 z-40 backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-black text-xs">LF</div>
            <div>
              <p className="text-[10px] font-black leading-none">LeadFlow Preview</p>
              <p className="text-[8px] text-emerald-400 font-bold uppercase mt-0.5">Online</p>
            </div>
            <button onClick={() => setShowPreview(false)} className="ml-auto text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
             {selectedTemplate.mediaUrl && (
                <div className="rounded-lg overflow-hidden border border-white/5 bg-black/20">
                   {selectedTemplate.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={getMediaSrc(selectedTemplate.mediaUrl)} className="w-full h-auto" />
                   ) : (
                      <img src={getMediaSrc(selectedTemplate.mediaUrl)} alt="Preview" className="w-full h-auto" />
                   )}
                </div>
             )}
             <div className="bg-[#1c2431] p-2.5 rounded-tr-xl rounded-br-xl rounded-bl-xl border-l-4 border-emerald-500 shadow-sm relative">
                <p className="text-[10px] leading-relaxed whitespace-pre-wrap font-medium">
                   {selectedTemplate.body || 'No content'}
                </p>
                <div className="flex justify-end mt-1">
                   <span className="text-[8px] text-slate-500 font-bold">12:45 <Check size={10} className="inline ml-0.5 text-emerald-500" /></span>
                </div>
             </div>
          </div>
        </div>
      )}

      {data.customDescription && !showPreview && (
        <div className="mt-3 pt-2 text-[9px] font-bold text-slate-400 border-t border-white/5 italic leading-tight max-w-[190px] truncate" title={data.customDescription}>
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
});

SendMessageNode.displayName = 'SendMessageNode';

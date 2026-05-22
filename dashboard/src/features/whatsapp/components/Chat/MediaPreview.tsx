import React from 'react';
import { Download } from 'lucide-react';
import { useT } from '../../../../lib/i18n';
import { FileIcon } from './FileIcon';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function MediaPreview({ media }: { media: any }) {
  const t = useT();
  const url = media.publicUrl?.startsWith('http') ? media.publicUrl : `${API_URL.replace('/api', '')}${media.publicUrl}`;
  const isImage = media.mimeType?.startsWith('image/');
  const isAudio = media.mimeType?.startsWith('audio/');
  const isVideo = media.mimeType?.startsWith('video/');

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="group relative mt-2 block overflow-hidden rounded-xl border border-white/10 bg-[#0c1220]/50 backdrop-blur-sm/5 transition hover:scale-[1.02]">
        <img src={url} alt={media.fileName || 'WhatsApp Medya'} className="max-h-72 w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl">
          <Download className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </a>
    );
  }

  if (isAudio) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-[#0c1220]/50 backdrop-blur-sm/5 p-3">
        <audio controls className="w-full h-10" preload="metadata">
          <source src={url} type={media.mimeType} />
          {t('wp_browser_no_audio')}
        </audio>
        <p className="mt-1.5 text-[10px] font-bold text-slate-400 truncate">{media.fileName || 'Ses kaydı'}</p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black">
        <video controls className="max-h-72 w-full" preload="metadata">
          <source src={url} type={media.mimeType} />
          {t('wp_browser_no_video')}
        </video>
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 truncate bg-black/50">{media.fileName || 'Video'}</p>
      </div>
    );
  }

  // Documents (PDF, Excel, etc.)
  const fileSize = media.size ? (media.size / 1024).toFixed(media.size > 1048576 ? 1 : 0) : '0';
  const unit = media.size > 1048576 ? 'MB' : 'KB';
  const displaySize = media.size > 1048576 ? (media.size / 1048576).toFixed(1) : fileSize;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1220]/50 backdrop-blur-sm/10 p-3 text-sm font-bold text-slate-700 hover:bg-[#0c1220]/50 backdrop-blur-sm/20 transition group">
      <FileIcon mimeType={media.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{media.fileName || 'Dosya'}</p>
        <p className="text-[10px] font-semibold text-slate-400">{displaySize} {unit}</p>
      </div>
      <Download className="size-4 text-slate-400 group-hover:text-slate-100 transition shrink-0" />
    </a>
  );
}

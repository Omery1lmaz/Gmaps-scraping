import React from 'react';
import { FileText, Image as ImageIcon, Music4, Video, File, FileSpreadsheet } from 'lucide-react';

export function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType?.startsWith('image/')) return <ImageIcon className="size-5 text-emerald-500" />;
  if (mimeType?.startsWith('audio/')) return <Music4 className="size-5 text-purple-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="size-5 text-blue-500" />;
  if (mimeType?.includes('pdf')) return <FileText className="size-5 text-red-500" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return <FileSpreadsheet className="size-5 text-green-600" />;
  if (mimeType?.includes('text') || mimeType?.includes('document') || mimeType?.includes('word')) return <FileText className="size-5 text-emerald-500" />;
  return <File className="size-5 text-slate-500" />;
}

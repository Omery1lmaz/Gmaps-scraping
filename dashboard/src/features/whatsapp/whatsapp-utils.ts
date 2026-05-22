import { safeFormatDate } from '../../lib/utils';

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function displayName(chat: any) {
  return chat?.lead?.businessName || chat?.contact?.name || chat?.contact?.pushName || chat?.name || chat?.contact?.phone || chat?.jid || 'WhatsApp';
}

export function statusTone(status: string) {
  if (status === 'CONNECTED') return 'bg-emerald-500 text-white shadow-emerald-500/20';
  if (status === 'QR_READY') return 'bg-amber-400 text-black shadow-amber-400/20';
  if (status === 'ERROR') return 'bg-rose-500 text-white shadow-rose-500/20';
  if (status === 'AUTHENTICATED') return 'bg-emerald-400 text-white shadow-emerald-400/20';
  if (status === 'INITIALIZING') return 'bg-blue-500 text-white shadow-blue-500/20';
  return 'bg-slate-500 text-white shadow-slate-500/10';
}

export function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Bugün';
  if (msgDate.getTime() === yesterday.getTime()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

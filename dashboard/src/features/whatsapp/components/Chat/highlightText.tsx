import React from 'react';

export function highlightText(text: string, query: string) {
  if (!query || !text) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return <mark key={i} className="bg-amber-300 dark:bg-amber-500/40 text-slate-900 text-white px-0.5 rounded">{part}</mark>;
    }
    return part;
  });
}

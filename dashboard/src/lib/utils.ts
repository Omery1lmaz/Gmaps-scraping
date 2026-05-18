import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeFormatDate(dateVal: any, formatStr: string, fallback: string = '-'): string {
  if (!dateVal) return fallback;
  try {
    // If it's a UNIX timestamp in seconds (often a number less than 1e11), convert to milliseconds
    let val = dateVal;
    if (typeof dateVal === 'number' && dateVal < 1e11) {
      val = dateVal * 1000;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}


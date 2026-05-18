export type AppState =
  | "idle"
  | "scraping"
  | "paginating"
  | "paused"
  | "completed"
  | "failed";

export interface OpeningHours {
  [day: string]: string; // Ör: { "Pazartesi": "09:00–18:00", "Salı": "09:00–18:00" }
}

export interface Lead {
  id: string;
  name: string;
  rating?: number;
  reviews?: number;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  plusCode?: string;
  url: string;
  // Detail panel fields
  openingHours?: OpeningHours;
  isOpenNow?: boolean;
  priceLevel?: string;
  serviceOptions?: string[];
  description?: string;
  totalPhotos?: number;
}

export interface DetailLogEntry {
  businessName: string;
  timestamp: number;
  fields: string[]; // Extracted field names, e.g. ["phone", "website", "address"]
  success: boolean;
}

export interface ScraperSettings {
  scrapeDetails: boolean; // Detay panelinden ek bilgi çeksin mi?
  customCategory?: string; // Kullanıcının girdiği özel kategori
}

export interface ScraperStatus {
  state: AppState;
  leadsCount: number;
  pageIndex: number;
  lastLeads?: Lead[];
  activity?: string; // Anlık aktivite mesajı
  error?: string;
  // Detail scraping progress
  detailProgress?: { current: number; total: number };
  // Real-time detail info
  currentDetail?: { name: string; index: number; total: number; currentFields?: string[] };
  detailLog?: DetailLogEntry[];
}

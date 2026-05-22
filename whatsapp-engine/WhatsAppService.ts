import { WhatsAppSessionManager } from './SessionManager.js';

export class WhatsAppService {
  private sessionManager: WhatsAppSessionManager;

  constructor(sessionManager: WhatsAppSessionManager) {
    this.sessionManager = sessionManager;
  }

  async sendMessage(userId: string, to: string, content: string, media?: any) {
    try {
      const result = await this.sessionManager.sendMessage(userId, to, content, media);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sendToChat(userId: string, chatJid: string, content: string, media?: any) {
    try {
      const result = await this.sessionManager.sendMessage(userId, chatJid, content, media);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async syncHistory(userId: string) {
    try {
      await this.sessionManager.syncHistory(userId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getClientStatus(userId: string) {
    try {
      const status = this.sessionManager.getStatus(userId);
      return { success: true, data: status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createClient(userId: string) {
    try {
      const client = await this.sessionManager.createClient(userId);
      return { success: true, data: client };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async destroyClient(userId: string) {
    try {
      await this.sessionManager.destroyClient(userId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async reconnectClient(userId: string) {
    try {
      const success = await this.sessionManager.reconnectClient(userId);
      return { success, data: success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const COUNTRY_DIALING_CODES: Record<string, string> = {
  // Turkish
  'türkiye': '90',
  'turkiye': '90',
  'turkey': '90',
  'tr': '90',
  'almanya': '49',
  'germany': '49',
  'de': '49',
  'fransa': '33',
  'france': '33',
  'fr': '33',
  'ingiltere': '44',
  'birleşik krallık': '44',
  'united kingdom': '44',
  'uk': '44',
  'gb': '44',
  'amerika': '1',
  'abd': '1',
  'usa': '1',
  'united states': '1',
  'us': '1',
  'kanada': '1',
  'canada': '1',
  'ca': '1',
  'italya': '39',
  'italy': '39',
  'it': '39',
  'ispanya': '34',
  'spain': '34',
  'es': '34',
  'hollanda': '31',
  'netherlands': '31',
  'nl': '31',
  'belçika': '32',
  'belgium': '32',
  'be': '32',
  'azerbaycan': '994',
  'azerbaijan': '994',
  'az': '994',
  'suudi arabistan': '966',
  'saudi arabia': '966',
  'sa': '966',
  'birleşik arap emirlikleri': '971',
  'uae': '971',
  'ae': '971',
  'yunanistan': '30',
  'greece': '30',
  'gr': '30',
  'bulgaristan': '359',
  'bulgaria': '359',
  'bg': '359',
  'romanya': '40',
  'romania': '40',
  'ro': '40',
  'rusya': '7',
  'russia': '7',
  'ru': '7',
  'ukrayna': '380',
  'ukraine': '380',
  'ua': '380',
  'avusturya': '43',
  'austria': '43',
  'at': '43',
  'isviçre': '41',
  'switzerland': '41',
  'ch': '41',
  'isveç': '46',
  'sweden': '46',
  'se': '46',
  'norveç': '47',
  'norway': '47',
  'no': '47',
  'danimarka': '45',
  'denmark': '45',
  'dk': '45',
  'polonya': '48',
  'poland': '48',
  'pl': '48',
  'portekiz': '351',
  'portugal': '351',
  'pt': '351'
};

export function getCountryDialingCode(countryName?: string): string | null {
  if (!countryName) return null;
  const normalized = countryName.trim().toLowerCase();
  
  if (COUNTRY_DIALING_CODES[normalized]) {
    return COUNTRY_DIALING_CODES[normalized];
  }
  
  for (const [key, value] of Object.entries(COUNTRY_DIALING_CODES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return null;
}

export function formatPhoneToJid(phone: string, country?: string): string {
  const normalized = normalizePhone(phone, country);
  return `${normalized}@c.us`;
}

export function normalizePhone(phone: string, country?: string): string {
  let cleaned = String(phone || '').replace(/\D/g, '');
  
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  const cc = getCountryDialingCode(country);

  if (cc) {
    if (cleaned.startsWith(cc) && cleaned.length > 9) {
      return cleaned;
    }
    return `${cc}${cleaned}`;
  }

  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    cleaned = `90${cleaned}`;
  }
  return cleaned;
}

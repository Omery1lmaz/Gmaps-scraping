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

export function formatPhoneToJid(phone: string): string {
  const normalized = normalizePhone(phone);
  return `${normalized}@c.us`;
}

export function normalizePhone(phone: string): string {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    cleaned = `90${cleaned}`;
  }
  return cleaned;
}

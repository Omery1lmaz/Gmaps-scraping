import whatsappWeb from 'whatsapp-web.js';
import fs from 'fs/promises';
const { MessageMedia } = whatsappWeb as any;

export interface MediaPayload {
  localPath?: string;
  bufferBase64?: string;
  mimeType: string;
  fileName: string;
}

export class WhatsAppClient {
  constructor(private client: any) {}

  async sendImage(chatId: string, media: MediaPayload, caption?: string): Promise<any> {
    const msgMedia = await this.resolveMedia(media);
    return this.client.sendMessage(chatId, msgMedia, { caption });
  }

  async sendVideo(chatId: string, media: MediaPayload, caption?: string): Promise<any> {
    const msgMedia = await this.resolveMedia(media);
    return this.client.sendMessage(chatId, msgMedia, { caption, sendVideoAsGif: false });
  }

  async sendDocument(chatId: string, media: MediaPayload, fileName?: string): Promise<any> {
    const msgMedia = await this.resolveMedia({
      ...media,
      fileName: fileName || media.fileName
    });
    return this.client.sendMessage(chatId, msgMedia, { sendMediaAsDocument: true });
  }

  private async resolveMedia(media: MediaPayload): Promise<any> {
    if (media.bufferBase64) {
      return new MessageMedia(media.mimeType, media.bufferBase64, media.fileName);
    }
    if (media.localPath) {
      const data = await fs.readFile(media.localPath);
      return new MessageMedia(media.mimeType, data.toString('base64'), media.fileName);
    }
    throw new Error('UNSUPPORTED_FORMAT: No valid media buffer or path was provided.');
  }
}

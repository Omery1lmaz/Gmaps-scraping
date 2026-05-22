export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface BaseMessageJob {
  sessionId: string;
  chatId: string;
  type: MessageType;
  caption?: string;
  metadata?: Record<string, any>;
}

export interface MediaMessageJob extends BaseMessageJob {
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  mediaUrl: string;     // remote URL or local absolute path
  mimeType?: string;
  fileName?: string;
}

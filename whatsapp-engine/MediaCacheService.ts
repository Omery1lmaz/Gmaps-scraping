import { Redis } from 'ioredis';
import crypto from 'crypto';

export interface CachedMedia {
  localPath?: string;
  bufferBase64?: string;
  mimeType: string;
  fileName: string;
}

export class MediaCacheService {
  constructor(private redis: Redis) {}

  private getHash(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  private getKey(url: string): string {
    return `whatsapp:media_cache:${this.getHash(url)}`;
  }

  async get(url: string): Promise<CachedMedia | null> {
    const data = await this.redis.get(this.getKey(url));
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async set(url: string, cached: CachedMedia): Promise<void> {
    const key = this.getKey(url);
    await this.redis.set(key, JSON.stringify(cached), 'EX', 86400); // 24 Hours TTL
  }
}

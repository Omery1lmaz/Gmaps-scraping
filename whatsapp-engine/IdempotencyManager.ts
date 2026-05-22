import { Redis } from 'ioredis';

export class IdempotencyManager {
  constructor(private redis: Redis) {}

  private getKey(jobId: string, sessionId: string, mediaUrl: string): string {
    const cleanUrl = mediaUrl.replace(/[^a-zA-Z0-9]/g, '').slice(-32);
    return `whatsapp:idempotency:${jobId}:${sessionId}:${cleanUrl}`;
  }

  async checkAndLock(jobId: string, sessionId: string, mediaUrl: string): Promise<'SKIP' | 'PROCEED'> {
    const key = this.getKey(jobId, sessionId, mediaUrl);
    const existing = await this.redis.get(key);

    if (existing === 'SUCCESS' || existing === 'PROCESSING') {
      return 'SKIP';
    }

    // Set lock to PROCESSING for 1 hour
    await this.redis.set(key, 'PROCESSING', 'EX', 3600);
    return 'PROCEED';
  }

  async markSuccess(jobId: string, sessionId: string, mediaUrl: string): Promise<void> {
    const key = this.getKey(jobId, sessionId, mediaUrl);
    await this.redis.set(key, 'SUCCESS', 'EX', 3600);
  }

  async markFailed(jobId: string, sessionId: string, mediaUrl: string): Promise<void> {
    const key = this.getKey(jobId, sessionId, mediaUrl);
    // On failure, delete the key so it can be retried immediately
    await this.redis.del(key);
  }
}

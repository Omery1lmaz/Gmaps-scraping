import { Redis } from 'ioredis';

export type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private cooldownMs = 30000; // 30s cooldown before transition to HALF_OPEN

  constructor(private redis: Redis, private sessionId: string) {}

  private getKeys() {
    return {
      state: `whatsapp:cb:${this.sessionId}:state`,
      failures: `whatsapp:cb:${this.sessionId}:consecutive_failures`,
      history: `whatsapp:cb:${this.sessionId}:history`, // redis list for sliding window
      lastOpen: `whatsapp:cb:${this.sessionId}:last_open_time`,
    };
  }

  async checkState(): Promise<CBState> {
    const keys = this.getKeys();
    let state = (await this.redis.get(keys.state)) as CBState || 'CLOSED';

    if (state === 'OPEN') {
      const lastOpenStr = await this.redis.get(keys.lastOpen);
      if (lastOpenStr) {
        const elapsed = Date.now() - parseInt(lastOpenStr, 10);
        if (elapsed > this.cooldownMs) {
          // Transition to HALF_OPEN to probe the connection
          await this.redis.set(keys.state, 'HALF_OPEN');
          state = 'HALF_OPEN';
          console.log(`[CircuitBreaker] Session ${this.sessionId} transitioned to HALF_OPEN (Probe Mode).`);
        }
      }
    }
    return state;
  }

  async recordSuccess(): Promise<void> {
    const keys = this.getKeys();
    await this.redis.set(keys.state, 'CLOSED');
    await this.redis.set(keys.failures, 0);
    await this.redis.lpush(keys.history, 'SUCCESS');
    await this.redis.ltrim(keys.history, 0, 9); // Keep last 10 entries
  }

  async recordFailure(): Promise<void> {
    const keys = this.getKeys();
    const consecutive = await this.redis.incr(keys.failures);
    await this.redis.lpush(keys.history, 'FAILURE');
    await this.redis.ltrim(keys.history, 0, 9);

    // Analyze last 10 history records for >40% failure rate
    const history = await this.redis.lrange(keys.history, 0, 9);
    const failureCount = history.filter(v => v === 'FAILURE').length;
    const failureRate = failureCount / history.length;

    if (consecutive >= 5 || (history.length >= 10 && failureRate > 0.40)) {
      await this.redis.set(keys.state, 'OPEN');
      await this.redis.set(keys.lastOpen, Date.now().toString());
      console.warn(`[CircuitBreaker] Session ${this.sessionId} OPENED! Thresholds breached (consecutive: ${consecutive}, rate: ${failureRate * 100}%).`);
    }
  }
}

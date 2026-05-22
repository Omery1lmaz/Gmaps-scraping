import { Redis } from 'ioredis';

export class AdaptiveRetryEngine {
  constructor(private redis: Redis) {}

  async calculateDelay(
    attempt: number,
    sessionId: string,
    queueLagMs: number
  ): Promise<number> {
    const baseDelay = 3000; // 3 seconds base
    
    // 1. Session Reputation Factor
    const cbFailures = parseInt(await this.redis.get(`whatsapp:cb:${sessionId}:consecutive_failures`) || '0', 10);
    const reputationFactor = 1.0 + (cbFailures * 0.5); // Increase delay as consecutive failures stack up

    // 2. Congestion Factor
    let congestionFactor = 1.0;
    if (queueLagMs > 5000) {
      congestionFactor = 2.0;
    } else if (queueLagMs > 2000) {
      congestionFactor = 1.5;
    }

    // 3. Exponential Backoff Formula
    let delay = baseDelay * Math.pow(2, attempt) * reputationFactor * congestionFactor;

    // 4. Jitter Addition (±15%)
    const jitterPercent = 0.15;
    const minJitter = 1 - jitterPercent;
    const maxJitter = 1 + jitterPercent;
    const jitter = Math.random() * (maxJitter - minJitter) + minJitter;
    delay = delay * jitter;

    // Constraints
    const minDelay = 2000;  // 2 seconds min
    const maxDelay = 60000; // 60 seconds max

    return Math.max(minDelay, Math.min(maxDelay, Math.floor(delay)));
  }
}

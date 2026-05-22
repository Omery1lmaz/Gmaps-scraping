import { Redis } from 'ioredis';

export class MetricsService {
  constructor(private redis: Redis) {}

  async increment(metric: string, amount = 1): Promise<void> {
    await this.redis.hincrby('whatsapp_media_metrics', metric, amount);
  }

  async recordLatency(metric: string, durationMs: number): Promise<void> {
    await this.redis.lpush(`whatsapp_latency:${metric}`, durationMs);
    await this.redis.ltrim(`whatsapp_latency:${metric}`, 0, 99); // Keep last 100 entries
  }

  async getHealthScore(): Promise<number> {
    const metrics = await this.redis.hgetall('whatsapp_media_metrics');
    const dlq = parseInt(metrics.media_dlq_total || '0', 10);
    const retries = parseInt(metrics.media_retry_total || '0', 10);
    const successes = parseInt(metrics.media_send_success_total || '0', 10);
    const failures = parseInt(metrics.media_send_failure_total || '0', 10);

    const total = successes + failures;
    if (total === 0) return 100;

    const failureRate = failures / total;
    const retryRate = retries / total;
    const dlqRate = dlq / total;

    // Formula: 100 - (failureRate * 50 + retryRate * 30 + dlqRate * 20) * 100
    const score = 100 - (failureRate * 0.5 + retryRate * 0.3 + dlqRate * 0.2) * 100;
    return Math.max(0, Math.min(100, Math.floor(score)));
  }

  async recordDLQSpike(): Promise<void> {
    const now = Date.now();
    const uniqueVal = `${now}:${Math.random()}`;
    await this.redis.zadd('whatsapp:dlq_spike_tracker', now, uniqueVal);
    await this.redis.zremrangebyscore('whatsapp:dlq_spike_tracker', '-inf', (now - 60000).toString());
    await this.redis.expire('whatsapp:dlq_spike_tracker', 120);
  }

  async isIngestionPaused(): Promise<boolean> {
    const now = Date.now();
    await this.redis.zremrangebyscore('whatsapp:dlq_spike_tracker', '-inf', (now - 60000).toString());
    const spikeCount = await this.redis.zcard('whatsapp:dlq_spike_tracker');
    return spikeCount >= 5; // Pause ingestion if >= 5 DLQ transitions in last 60s
  }
}

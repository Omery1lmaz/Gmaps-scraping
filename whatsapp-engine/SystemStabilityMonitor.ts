import { Redis } from 'ioredis';

export type StabilityTrend = 'IMPROVING' | 'STABLE' | 'DEGRADING';

export interface StabilityReport {
  score: number;
  trend: StabilityTrend;
  failureRate: number;
  retryRate: number;
  dlqRate: number;
  latencyJitter: number;
}

export class SystemStabilityMonitor {
  constructor(private redis: Redis) {}

  async calculateStability(): Promise<StabilityReport> {
    // 1. Fetch metrics
    const metrics = await this.redis.hgetall('whatsapp_media_metrics');
    const successes = parseInt(metrics.media_send_success_total || '0', 10);
    const failures = parseInt(metrics.media_send_failure_total || '0', 10);
    const retries = parseInt(metrics.media_retry_total || '0', 10);
    const dlq = parseInt(metrics.media_dlq_total || '0', 10);

    const total = successes + failures;
    
    // Rates calculations
    const failureRate = total > 0 ? failures / total : 0;
    const retryRate = total > 0 ? Math.min(1.0, retries / total) : 0;
    const dlqRate = total > 0 ? Math.min(1.0, dlq / total) : 0;

    // 2. Fetch latencies for variance calculation
    const latenciesRaw = await this.redis.lrange('whatsapp_latency:media_send_latency_ms', 0, 99);
    const latencies = latenciesRaw.map(x => parseInt(x, 10));
    
    let latencyJitter = 0; // coefficient of variation (std dev / mean)
    if (latencies.length > 1) {
      const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      if (mean > 0) {
        const sumSq = latencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const stdDev = Math.sqrt(sumSq / latencies.length);
        latencyJitter = Math.min(1.0, stdDev / mean);
      }
    }

    // Formula: 100 - (failureRate * 40) - (retryRate * 25) - (dlqRate * 25) - (latencyJitter * 10)
    const rawScore = 100 - (failureRate * 40) - (retryRate * 25) - (dlqRate * 25) - (latencyJitter * 10);
    const score = Math.max(0, Math.min(100, Math.floor(rawScore)));

    // 3. Trend evaluation via history list in Redis
    await this.redis.lpush('whatsapp:stability_history', score);
    await this.redis.ltrim('whatsapp:stability_history', 0, 9); // Keep last 10 entries

    const historyRaw = await this.redis.lrange('whatsapp:stability_history', 0, 9);
    const history = historyRaw.map(x => parseInt(x, 10));

    let trend: StabilityTrend = 'STABLE';
    if (history.length >= 6) {
      const recent = history.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const older = history.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
      
      if (recent > older + 1) {
        trend = 'IMPROVING';
      } else if (recent < older - 1) {
        trend = 'DEGRADING';
      }
    }

    return {
      score,
      trend,
      failureRate,
      retryRate,
      dlqRate,
      latencyJitter
    };
  }
}

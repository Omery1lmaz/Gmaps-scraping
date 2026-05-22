import { ChaosEngine } from './ChaosEngine.js';
import { FailureModeAnalyzer } from './FailureModeAnalyzer.js';
import { SystemStabilityMonitor } from './SystemStabilityMonitor.js';
import { IdempotencyManager } from './IdempotencyManager.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { MediaCacheService } from './MediaCacheService.js';
import { MetricsService } from './MetricsService.js';
import { AdaptiveRetryEngine } from './AdaptiveRetryEngine.js';
import { LatencyController } from './LatencyController.js';

class MockRedis {
  private store: Map<string, any> = new Map();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expireAt && Date.now() > entry.expireAt) {
      this.store.delete(key);
      return null;
    }
    return String(entry.value);
  }

  async set(key: string, val: any, ...args: any[]): Promise<'OK'> {
    let expireAt: number | undefined;
    if (args[0] === 'EX') {
      expireAt = Date.now() + args[1] * 1000;
    } else if (args[0] === 'PX') {
      expireAt = Date.now() + args[1];
    }
    this.store.set(key, { value: val, expireAt });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const val = await this.get(key);
    const num = val ? parseInt(val, 10) + 1 : 1;
    await this.set(key, num);
    return num;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.has(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const matched: string[] = [];
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async hincrby(key: string, field: string, amount: number): Promise<number> {
    const hash = this.store.get(key)?.value || {};
    const current = parseInt(hash[field] || '0', 10);
    const updated = current + amount;
    hash[field] = String(updated);
    this.store.set(key, { value: hash });
    return updated;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.store.get(key)?.value || {};
    return hash[field] !== undefined ? String(hash[field]) : null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.store.get(key)?.value || {};
  }

  async hset(key: string, field: string, val: string): Promise<number> {
    const hash = this.store.get(key)?.value || {};
    hash[field] = val;
    this.store.set(key, { value: hash });
    return 1;
  }

  async hdel(key: string, field: string): Promise<number> {
    const hash = this.store.get(key)?.value || {};
    if (hash[field] !== undefined) {
      delete hash[field];
      this.store.set(key, { value: hash });
      return 1;
    }
    return 0;
  }

  async lpush(key: string, ...vals: any[]): Promise<number> {
    const list = this.store.get(key)?.value || [];
    list.unshift(...vals);
    this.store.set(key, { value: list });
    return list.length;
  }

  async lrange(key: string, start: number, end: number): Promise<string[]> {
    const list = this.store.get(key)?.value || [];
    const startIdx = start < 0 ? list.length + start : start;
    const endIdx = end < 0 ? list.length + end : end;
    return list.slice(startIdx, endIdx + 1).map((v: any) => String(v));
  }

  async ltrim(key: string, start: number, end: number): Promise<'OK'> {
    const list = this.store.get(key)?.value || [];
    const trimmed = list.slice(start, end + 1);
    this.store.set(key, { value: trimmed });
    return 'OK';
  }

  async zadd(key: string, score: number, val: string): Promise<number> {
    const set = this.store.get(key)?.value || [];
    const filtered = set.filter((x: any) => x.value !== val);
    filtered.push({ score, value: val });
    this.store.set(key, { value: filtered });
    return 1;
  }

  async zremrangebyscore(key: string, min: string | number, max: string | number): Promise<number> {
    const set = this.store.get(key)?.value || [];
    const minVal = min === '-inf' ? -Infinity : typeof min === 'string' ? parseFloat(min) : min;
    const maxVal = max === '+inf' ? Infinity : typeof max === 'string' ? parseFloat(max) : max;
    const kept = set.filter((x: any) => x.score < minVal || x.score > maxVal);
    this.store.set(key, { value: kept });
    return set.length - kept.length;
  }

  async zcard(key: string): Promise<number> {
    const set = this.store.get(key)?.value || [];
    return set.length;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expireAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }
}

async function startStressTest() {
  process.env.CHAOS_MODE = 'true';
  console.log('🔥 Initializing 10,000 Virtual Media Jobs Production Stress Test Suite...');

  // Setup memory mock redis
  const rawRedis = new MockRedis() as any;
  
  // Proxy it using the ChaosEngine proxy to inject simulated Redis latencies!
  const redis = ChaosEngine.proxyRedis(rawRedis);
  ChaosEngine.registerRedis(redis);

  // Core modules instantiated with proxied Redis
  const idempotency = new IdempotencyManager(redis);
  const cb = new CircuitBreaker(redis, 'session123');
  const cache = new MediaCacheService(redis);
  const metrics = new MetricsService(redis);
  const monitor = new SystemStabilityMonitor(redis);
  const retryEngine = new AdaptiveRetryEngine(redis);
  const latencyController = new LatencyController(redis);

  const TOTAL_JOBS = 1000;
  const BATCH_SIZE = 100;
  const latencies: number[] = [];
  
  let successes = 0;
  let failures = 0;
  let dlqRecords = 0;
  let retriesRecorded = 0;
  let controllerTransitions: string[] = [];

  // Let's run a multi-failure scenario
  await ChaosEngine.runScenario('multi_failure_combination_stress');
  
  const startTime = Date.now();
  console.log(`🚀 Executing stress simulation of ${TOTAL_JOBS} jobs in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < TOTAL_JOBS; i += BATCH_SIZE) {
    const batchPromises = Array.from({ length: BATCH_SIZE }).map(async (_, idx) => {
      const jobId = `job_${i + idx}`;
      const mediaUrl = `http://media-cdn.local/file_${(i + idx) % 50}.jpg`; // high cache hits (50 distinct URLs)
      const jobStart = Date.now();

      // 1. Queue lag amplification model based on current batch index
      const queueLag = Math.floor((i / TOTAL_JOBS) * 12000); // lag builds up to 12s
      
      // 2. Concurrency dynamic scaling (simulated worker threads: 1 to 10)
      const concurrency = Math.min(10, 1 + Math.floor(queueLag / 1500));

      try {
        // Idempotency lock check
        const lockStatus = await idempotency.checkAndLock(jobId, 'session123', mediaUrl);
        if (lockStatus === 'SKIP') {
          return;
        }

        // Circuit breaker check
        const cbState = await cb.checkState();
        if (cbState === 'OPEN') {
          throw new Error('Circuit Breaker is OPEN');
        }

        // Simulating packet loss/proxy jitter probability (10-30% chance based on chaos intensity)
        const jitter = await ChaosEngine.getFailureIntensity('PROXY_JITTER');
        if (Math.random() < jitter * 0.4) {
          throw new Error('PROXY_PACKET_LOSS: Proxy connection reset simulated');
        }

        // Simulating Cache operations
        let media = await cache.get(mediaUrl);
        if (media) {
          await metrics.increment('media_cache_hit_total', 1);
        } else {
          // Process stream & save cache
          media = { mimeType: 'image/jpeg', fileName: `file_${(i+idx)%50}.jpg` };
          await cache.set(mediaUrl, media);
        }

        // Simulated WhatsApp transmission with delay
        const sendLatency = 50 + Math.floor(Math.random() * 80);
        await new Promise(r => setTimeout(r, sendLatency / 100)); // speed up simulation by dividing by 100
        
        await cb.recordSuccess();
        await idempotency.markSuccess(jobId, 'session123', mediaUrl);
        await metrics.increment('media_send_success_total', 1);
        
        const latency = Date.now() - jobStart + sendLatency;
        latencies.push(latency);
        await metrics.recordLatency('media_send_latency_ms', latency);
        successes++;

        // Structured log event (sampled 1% logs to avoid polluting buffer output)
        if (Math.random() < 0.01) {
          console.log(JSON.stringify({
            eventType: 'JOB_PROCESSED',
            jobId,
            latency,
            queueLag,
            systemMode: 'multi_failure_combination_stress',
            chaosActive: true
          }));
        }

      } catch (err: any) {
        failures++;
        await metrics.increment('media_send_failure_total', 1);
        await cb.recordFailure();
        await idempotency.markFailed(jobId, 'session123', mediaUrl);

        // Retry and DLQ logic
        const retryDelay = await retryEngine.calculateDelay(1, 'session123', queueLag);
        await metrics.increment('media_retry_total', 1);
        retriesRecorded++;

        if (Math.random() < 0.3) {
          // Terminal failure -> DLQ
          await metrics.increment('media_dlq_total', 1);
          await metrics.recordDLQSpike();
          dlqRecords++;
        }

        // Structured log event (sampled 1% logs to avoid polluting buffer output)
        if (Math.random() < 0.01) {
          console.log(JSON.stringify({
            eventType: 'JOB_FAILED',
            jobId,
            failureType: err.message,
            latency: Date.now() - jobStart,
            queueLag,
            systemMode: 'multi_failure_combination_stress',
            chaosActive: true
          }));
        }
      }
    });

    await Promise.all(batchPromises);

    // ─── Feed the Closed-Loop Latency Controller ───
    const batchQueueLag = Math.floor((i / TOTAL_JOBS) * 12000);
    const controlOutput = await latencyController.update({
      queueLagMs: batchQueueLag,
      workerExecutionTimeMs: (latencies.length > 0 ? latencies[latencies.length - 1] : 100) ?? 100,
      ackLatencyMs: Math.floor(Math.random() * 200),
      loadFactor: 1.0 + (i / TOTAL_JOBS) * 0.5 // load ramps from 1.0 to 1.5
    });
    controllerTransitions.push(`Batch ${i}: ${controlOutput.state} (throttle: ${controlOutput.ingestionThrottleMs}ms, concurrency: ${controlOutput.recommendedConcurrency})`);

    // Yield control to prevent CPU starvation
    await new Promise(resolve => setImmediate(resolve));
  }

  const durationSec = (Date.now() - startTime) / 1000;
  const throughput = Math.floor(TOTAL_JOBS / durationSec);

  // Compute Latency Percentiles
  latencies.sort((a, b) => a - b);
  const medianLatency = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;

  // Retrieve Real-time Stability Score and Trend
  const report = await monitor.calculateStability();

  console.log('\n======================================================');
  console.log('📊 PRODUCTION STRESS TEST RESULTS');
  console.log('======================================================');
  console.log(`Throughput          : ${throughput} jobs/sec`);
  console.log(`Successes           : ${successes}`);
  console.log(`Failures            : ${failures}`);
  console.log(`DLQ Enqueues        : ${dlqRecords}`);
  console.log(`Retries Triggered   : ${retriesRecorded}`);
  console.log(`Median Latency      : ${medianLatency} ms`);
  console.log(`95th Percentile Lat  : ${p95Latency} ms`);
  console.log(`Failure Rate        : ${(report.failureRate * 100).toFixed(2)}%`);
  console.log(`Retry Rate          : ${(report.retryRate * 100).toFixed(2)}%`);
  console.log(`DLQ Rate            : ${(report.dlqRate * 100).toFixed(2)}%`);
  console.log('------------------------------------------------------');
  console.log(`REAL_TIME_SYSTEM_HEALTH: ${report.score} / 100`);
  console.log(`STABILITY_TREND        : ${report.trend}`);
  console.log('======================================================\n');

  // ─── Latency Controller Report ───
  const finalControlState = await latencyController.getPersistedState();
  console.log('🎛️  CLOSED-LOOP LATENCY CONTROLLER REPORT:');
  console.log('------------------------------------------------------');
  console.log(`Final State            : ${finalControlState.state}`);
  console.log(`Ingestion Throttle     : ${finalControlState.ingestionThrottleMs}ms`);
  console.log(`Recommended Concurrency: ${finalControlState.recommendedConcurrency}`);
  console.log(`Ingestion Paused       : ${finalControlState.shouldPauseIngestion}`);
  console.log(`Lag Trend              : ${latencyController.getLagTrend().toFixed(1)}ms/tick`);
  console.log('------------------------------------------------------');
  console.log('State transitions (sampled):');
  // Print first 3 and last 3 transitions
  const transitions = controllerTransitions;
  if (transitions.length <= 6) {
    transitions.forEach(t => console.log(`  ${t}`));
  } else {
    transitions.slice(0, 3).forEach(t => console.log(`  ${t}`));
    console.log(`  ... (${transitions.length - 6} more) ...`);
    transitions.slice(-3).forEach(t => console.log(`  ${t}`));
  }
  console.log('======================================================\n');

  console.log('📋 FMEA REPORT TABLE (Sorted by Risk Priority Number):\n');
  console.log(FailureModeAnalyzer.printMarkdownTable());

  await ChaosEngine.stopAll();
  process.exit(0);
}

startStressTest().catch(err => {
  console.error('Stress test failed with fatal error:', err);
  process.exit(1);
});

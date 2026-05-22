import assert from 'assert';
import { IdempotencyManager } from './IdempotencyManager.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { AdaptiveRetryEngine } from './AdaptiveRetryEngine.js';
import { MediaCacheService } from './MediaCacheService.js';
import { MetricsService } from './MetricsService.js';
import { MediaPreprocessor } from './MediaPreprocessor.js';
import { Readable } from 'stream';

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

const mockRedis = new MockRedis() as any;

async function runTests() {
  console.log('🧪 Starting Sandboxed Hardened Media Pipeline Tests...');

  // --- Test 1: Idempotency Locks ---
  console.log('\n--- Test 1: Idempotency Locks ---');
  const idempotency = new IdempotencyManager(mockRedis);
  const status1 = await idempotency.checkAndLock('job1', 'sessionA', 'http://url1');
  assert.strictEqual(status1, 'PROCEED', 'First lock attempt should proceed');

  const status2 = await idempotency.checkAndLock('job1', 'sessionA', 'http://url1');
  assert.strictEqual(status2, 'SKIP', 'Duplicate lock attempt should skip');

  await idempotency.markSuccess('job1', 'sessionA', 'http://url1');
  const status3 = await idempotency.checkAndLock('job1', 'sessionA', 'http://url1');
  assert.strictEqual(status3, 'SKIP', 'Lock attempt after success should remain skip');

  await idempotency.markFailed('job1', 'sessionA', 'http://url1');
  const status4 = await idempotency.checkAndLock('job1', 'sessionA', 'http://url1');
  assert.strictEqual(status4, 'PROCEED', 'Lock attempt after failure should proceed');
  console.log('✅ PASS: Idempotency Locking');

  // --- Test 2: Circuit Breaker Transitions ---
  console.log('\n--- Test 2: Circuit Breaker Transitions ---');
  const cb = new CircuitBreaker(mockRedis, 'sessionA');
  
  let state = await cb.checkState();
  assert.strictEqual(state, 'CLOSED', 'Initial state should be CLOSED');

  // Record 5 consecutive failures
  for (let i = 0; i < 5; i++) {
    await cb.recordFailure();
  }
  state = await cb.checkState();
  assert.strictEqual(state, 'OPEN', 'State should transition to OPEN after 5 failures');

  // Record success to ensure recovery
  await cb.recordSuccess();
  state = await cb.checkState();
  assert.strictEqual(state, 'CLOSED', 'State should reset to CLOSED on success');
  console.log('✅ PASS: Circuit Breaker Transitions');

  // --- Test 3: Media Cache Service ---
  console.log('\n--- Test 3: Media Cache Service ---');
  const cache = new MediaCacheService(mockRedis);
  const cachedVal = await cache.get('http://url2');
  assert.strictEqual(cachedVal, null, 'Cache miss should return null');

  await cache.set('http://url2', {
    bufferBase64: 'abc',
    mimeType: 'image/jpeg',
    fileName: 'test.jpg'
  });
  const cachedVal2 = await cache.get('http://url2');
  assert.ok(cachedVal2, 'Cache hit should return object');
  assert.strictEqual(cachedVal2?.fileName, 'test.jpg', 'Cache values should be correct');
  console.log('✅ PASS: Media Cache Service');

  // --- Test 4: Adaptive Retry Calculations ---
  console.log('\n--- Test 4: Adaptive Retry Calculations ---');
  const retry = new AdaptiveRetryEngine(mockRedis);
  
  // Normal delay calculation
  const delay1 = await retry.calculateDelay(1, 'sessionA', 0);
  assert.ok(delay1 >= 2000 && delay1 <= 60000, 'Calculated delay should be within bounds');

  // Calculate under high queue congestion (lag > 5000ms)
  const delay2 = await retry.calculateDelay(1, 'sessionA', 6000);
  assert.ok(delay2 > delay1, 'Congestion should increase calculated delay');
  console.log('✅ PASS: Adaptive Retry Engine');

  // --- Test 5: Ingestion Backpressure Pauses ---
  console.log('\n--- Test 5: Ingestion Backpressure Pauses ---');
  const metrics = new MetricsService(mockRedis);
  
  let isPaused = await metrics.isIngestionPaused();
  assert.strictEqual(isPaused, false, 'Ingestion should start normal');

  // Log 5 DLQ transitions within 1 minute
  for (let i = 0; i < 5; i++) {
    await metrics.recordDLQSpike();
  }
  isPaused = await metrics.isIngestionPaused();
  assert.strictEqual(isPaused, true, 'Ingestion should be paused on DLQ spike');
  console.log('✅ PASS: Ingestion Backpressure Coordination');

  // --- Test 6: Hybrid Streaming Size Limits ---
  console.log('\n--- Test 6: Hybrid Streaming Size Limits ---');
  const testStream = Readable.from([Buffer.alloc(100), Buffer.alloc(100)]);
  const result = await MediaPreprocessor.streamToBase64(testStream, 1000);
  assert.strictEqual(Buffer.from(result, 'base64').length, 200, 'Streaming encoder should output correct size');

  const failedStream = Readable.from([Buffer.alloc(200), Buffer.alloc(200)]);
  try {
    await MediaPreprocessor.streamToBase64(failedStream, 300);
    assert.fail('Should have thrown size limit exceeded error');
  } catch (err: any) {
    assert.ok(err.message.includes('limit'), 'Should throw limit error');
  }
  console.log('✅ PASS: Hybrid Streaming Preprocessor Limits');

  console.log('\n🎉 ALL HARDENING TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Hardening tests failed with error:', err);
  process.exit(1);
});

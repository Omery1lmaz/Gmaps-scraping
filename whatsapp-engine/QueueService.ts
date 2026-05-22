import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { MediaMessageJob } from './types.js';
import { MetricsService } from './MetricsService.js';

export class QueueService {
  private mediaQueue: Queue;
  private redisConnection: Redis;

  constructor(redisConnection: Redis) {
    this.mediaQueue = new Queue('single-messages', { connection: redisConnection });
    this.redisConnection = redisConnection;
  }

  async enqueueMediaMessage(job: MediaMessageJob): Promise<void> {
    // 1. DLQ-based backpressure (existing)
    const metrics = new MetricsService(this.redisConnection);
    const isPaused = await metrics.isIngestionPaused();
    if (isPaused) {
      throw new Error('INGESTION_PAUSED: High volume of media delivery failures (DLQ spike) detected. Ingestion is temporarily paused.');
    }

    // 2. Closed-Loop Latency Controller backpressure
    // Read the controller's persisted state from Redis (set by the Worker control loop).
    // This enforces the architectural rule: overload → ingestion throttle, NOT worker delay.
    const controllerState = await this.redisConnection.hgetall('whatsapp:latency_controller');
    if (controllerState.shouldPauseIngestion === 'true') {
      throw new Error('INGESTION_PAUSED: LatencyController state is DEGRADED. Ingestion paused until system recovers.');
    }
    const ingestionThrottleMs = parseInt(controllerState.ingestionThrottleMs || '0', 10);
    if (ingestionThrottleMs > 0) {
      console.log(`[QueueService] LatencyController ingestion throttle active: delaying enqueue by ${ingestionThrottleMs}ms`);
      await new Promise(resolve => setTimeout(resolve, ingestionThrottleMs));
    }

    // 3. Validation
    if (!job.sessionId || !job.chatId || !job.type || !job.mediaUrl) {
      throw new Error('Invalid media job payload: missing required fields (sessionId, chatId, type, mediaUrl)');
    }

    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(job.type)) {
      throw new Error(`Invalid media type: '${job.type}'. Expected IMAGE, VIDEO, or DOCUMENT.`);
    }

    const isUrl = job.mediaUrl.startsWith('http://') || job.mediaUrl.startsWith('https://');
    const isPath = job.mediaUrl.startsWith('/');
    if (!isUrl && !isPath) {
      throw new Error('Invalid mediaUrl: Must be a remote HTTP(S) URL or a local absolute file path');
    }

    // 4. Enqueue with Adaptive retry policy
    await this.mediaQueue.add('send-media-job', job, {
      attempts: 3,
      backoff: {
        type: 'adaptive',
      },
      removeOnComplete: true,
    });
  }
}

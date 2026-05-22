import { Redis } from 'ioredis';

/**
 * Closed-Loop Stable Distributed Latency Controller
 * 
 * Implements a control-theory-based feedback loop for managing system stability
 * under varying load conditions. Key design principles:
 * 
 * 1. EMA (Exponential Moving Average) smoothing on all input signals
 * 2. Damping coefficient ζ = 0.707 (critically damped - fastest response without overshoot)
 * 3. Hysteresis state machine (HEALTHY → SAFE_DEGRADED → DEGRADED) with separate
 *    enter/exit thresholds to prevent state oscillation
 * 4. CRITICAL RULE: Queue lag is NEVER used to amplify worker delay.
 *    Overload is resolved via ingestion backpressure throttling + concurrency scaling.
 */

export type SystemState = 'HEALTHY' | 'SAFE_DEGRADED' | 'DEGRADED';

export interface ControllerInputs {
  queueLagMs: number;
  workerExecutionTimeMs: number;
  ackLatencyMs: number;
  loadFactor: number; // 1.0 = idle, 1.5 = extreme load
}

export interface ControllerOutput {
  state: SystemState;
  emaQueueLag: number;
  emaExecutionTime: number;
  emaAckLatency: number;
  dampedError: number;
  ingestionThrottleMs: number;
  recommendedConcurrency: number;
  shouldPauseIngestion: boolean;
}

export class LatencyController {
  // Control theory constants
  private static readonly ZETA = 0.707;           // Damping coefficient (critically damped)
  private static readonly EMA_ALPHA = 0.2;         // Smoothing factor (20% weight to new measurement)
  private static readonly TARGET_LAG_MS = 1000;    // Target queue lag setpoint (1 second)

  // Hysteresis thresholds (separate enter/exit to prevent oscillation)
  private static readonly DEGRADED_ENTER_LAG = 8000;       // Enter DEGRADED at 8s smoothed lag
  private static readonly DEGRADED_EXIT_LAG = 4000;        // Exit DEGRADED at 4s smoothed lag
  private static readonly SAFE_DEGRADED_ENTER_LAG = 3000;  // Enter SAFE_DEGRADED at 3s
  private static readonly SAFE_DEGRADED_EXIT_LAG = 1500;   // Exit SAFE_DEGRADED at 1.5s

  // Concurrency bounds
  private static readonly MIN_CONCURRENCY = 1;
  private static readonly MAX_CONCURRENCY = 5;

  // Ingestion throttle bounds (milliseconds of delay applied to INGESTION, NOT workers)
  private static readonly MAX_INGESTION_THROTTLE_MS = 5000;

  // EMA state (smoothed signals)
  private emaQueueLag = 0;
  private emaExecutionTime = 0;
  private emaAckLatency = 0;

  // Hysteresis state
  private currentState: SystemState = 'HEALTHY';

  // History for trend detection
  private lagHistory: number[] = [];
  private static readonly LAG_HISTORY_SIZE = 20;

  constructor(private redis: Redis) {}

  /**
   * Core control loop update. Call this periodically (every 1-5 seconds) with fresh telemetry.
   * Returns control outputs that the Worker/QueueService should act on.
   */
  async update(inputs: ControllerInputs): Promise<ControllerOutput> {
    // ─── Step 1: Sanitize all inputs ───
    const sanitized = this.sanitizeInputs(inputs);

    // ─── Step 2: Apply EMA smoothing to all signals ───
    this.emaQueueLag = this.ema(this.emaQueueLag, sanitized.queueLagMs);
    this.emaExecutionTime = this.ema(this.emaExecutionTime, sanitized.workerExecutionTimeMs);
    this.emaAckLatency = this.ema(this.emaAckLatency, sanitized.ackLatencyMs);

    // ─── Step 3: Compute error signal (deviation from target setpoint) ───
    const error = this.emaQueueLag - LatencyController.TARGET_LAG_MS;

    // ─── Step 4: Apply damping coefficient ───
    // Damped error prevents oscillation by attenuating the raw error signal.
    // ζ = 0.707 gives the fastest settling time without overshoot (critically damped).
    const dampedError = LatencyController.ZETA * error;

    // ─── Step 5: Update hysteresis state machine ───
    this.updateHysteresisState();

    // ─── Step 6: Record lag history for trend analysis ───
    this.lagHistory.push(this.emaQueueLag);
    if (this.lagHistory.length > LatencyController.LAG_HISTORY_SIZE) {
      this.lagHistory.shift();
    }

    // ─── Step 7: Compute control outputs ───
    // CRITICAL: We compute ingestion throttle, NOT worker delay increase.
    // This prevents the forbidden positive feedback loop.
    const ingestionThrottleMs = this.computeIngestionThrottle(dampedError, sanitized.loadFactor);
    const recommendedConcurrency = this.computeRecommendedConcurrency(sanitized.loadFactor);
    const shouldPauseIngestion = this.currentState === 'DEGRADED';

    // ─── Step 8: Persist state to Redis for horizontal scaling ───
    await this.persistState(ingestionThrottleMs, recommendedConcurrency);

    const output: ControllerOutput = {
      state: this.currentState,
      emaQueueLag: Math.round(this.emaQueueLag),
      emaExecutionTime: Math.round(this.emaExecutionTime),
      emaAckLatency: Math.round(this.emaAckLatency),
      dampedError: Math.round(dampedError),
      ingestionThrottleMs: Math.round(ingestionThrottleMs),
      recommendedConcurrency,
      shouldPauseIngestion
    };

    console.log(
      `[LatencyController] State: ${output.state} | ` +
      `EMA Lag: ${output.emaQueueLag}ms | ` +
      `Damped Error: ${output.dampedError} | ` +
      `Ingestion Throttle: ${output.ingestionThrottleMs}ms | ` +
      `Concurrency: ${output.recommendedConcurrency} | ` +
      `Pause: ${output.shouldPauseIngestion}`
    );

    return output;
  }

  /**
   * Retrieve the latest persisted controller state from Redis.
   * Used by QueueService and other horizontally-scaled components.
   */
  async getPersistedState(): Promise<{
    state: SystemState;
    ingestionThrottleMs: number;
    recommendedConcurrency: number;
    shouldPauseIngestion: boolean;
  }> {
    const data = await this.redis.hgetall('whatsapp:latency_controller');
    return {
      state: (data.state as SystemState) || 'HEALTHY',
      ingestionThrottleMs: parseInt(data.ingestionThrottleMs || '0', 10),
      recommendedConcurrency: parseInt(data.recommendedConcurrency || '3', 10),
      shouldPauseIngestion: data.shouldPauseIngestion === 'true'
    };
  }

  // ─── EMA Smoothing ───
  private ema(prev: number, current: number): number {
    return LatencyController.EMA_ALPHA * current + (1 - LatencyController.EMA_ALPHA) * prev;
  }

  // ─── Hysteresis State Machine ───
  private updateHysteresisState(): void {
    const lag = this.emaQueueLag;
    const prevState = this.currentState;

    switch (this.currentState) {
      case 'HEALTHY':
        // Enter SAFE_DEGRADED when lag exceeds enter threshold
        if (lag >= LatencyController.SAFE_DEGRADED_ENTER_LAG) {
          this.currentState = 'SAFE_DEGRADED';
        }
        break;

      case 'SAFE_DEGRADED':
        // Escalate to DEGRADED if lag keeps rising
        if (lag >= LatencyController.DEGRADED_ENTER_LAG) {
          this.currentState = 'DEGRADED';
        }
        // Recover to HEALTHY only when lag drops below exit threshold
        else if (lag < LatencyController.SAFE_DEGRADED_EXIT_LAG) {
          this.currentState = 'HEALTHY';
        }
        break;

      case 'DEGRADED':
        // De-escalate to SAFE_DEGRADED when lag drops below exit threshold
        if (lag < LatencyController.DEGRADED_EXIT_LAG) {
          this.currentState = 'SAFE_DEGRADED';
        }
        break;
    }

    if (prevState !== this.currentState) {
      console.log(
        `[LatencyController] Hysteresis transition: ${prevState} → ${this.currentState} ` +
        `(EMA lag: ${Math.round(lag)}ms)`
      );
    }
  }

  // ─── Ingestion Throttle Computation ───
  // CRITICAL: This throttles the INTAKE rate, not the worker execution speed.
  // When queue lag is high, we slow down how fast new jobs enter the queue.
  private computeIngestionThrottle(dampedError: number, loadFactor: number): number {
    if (dampedError <= 0) {
      // System is performing at or below target setpoint — no throttling needed
      return 0;
    }

    // Proportional throttle: scale linearly with damped error
    // At 7000ms damped error → full throttle (5000ms ingestion delay)
    const proportionalThrottle = (dampedError / 7000) * LatencyController.MAX_INGESTION_THROTTLE_MS;

    // Apply load factor scaling (higher system load = slightly more throttle)
    const loadScaled = proportionalThrottle * loadFactor;

    // Clamp to bounds
    return Math.max(0, Math.min(LatencyController.MAX_INGESTION_THROTTLE_MS, loadScaled));
  }

  // ─── Dynamic Concurrency Recommendation ───
  // Scale worker concurrency UP when lag is high (to drain faster),
  // scale DOWN when system is healthy (to reduce resource usage).
  private computeRecommendedConcurrency(loadFactor: number): number {
    switch (this.currentState) {
      case 'DEGRADED':
        // Max workers to drain backlog ASAP
        return LatencyController.MAX_CONCURRENCY;

      case 'SAFE_DEGRADED': {
        // Scale proportionally between 2 and MAX based on how deep we are
        const lagRatio = Math.min(1.0,
          (this.emaQueueLag - LatencyController.SAFE_DEGRADED_ENTER_LAG) /
          (LatencyController.DEGRADED_ENTER_LAG - LatencyController.SAFE_DEGRADED_ENTER_LAG)
        );
        const concurrency = 2 + Math.floor(lagRatio * (LatencyController.MAX_CONCURRENCY - 2));
        return Math.min(LatencyController.MAX_CONCURRENCY, Math.max(2, concurrency));
      }

      case 'HEALTHY':
      default: {
        // Under healthy conditions, use minimal concurrency adjusted by load
        const baseConcurrency = loadFactor > 1.2 ? 2 : 1;
        return Math.min(LatencyController.MAX_CONCURRENCY, baseConcurrency);
      }
    }
  }

  // ─── Input Sanitization ───
  private sanitizeInputs(inputs: ControllerInputs): ControllerInputs {
    return {
      queueLagMs: this.sanitize(inputs.queueLagMs, 0),
      workerExecutionTimeMs: this.sanitize(inputs.workerExecutionTimeMs, 0),
      ackLatencyMs: this.sanitize(inputs.ackLatencyMs, 0),
      loadFactor: this.sanitize(inputs.loadFactor, 1.0, 1.0, 1.5)
    };
  }

  private sanitize(value: number, fallback: number, min?: number, max?: number): number {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return fallback;
    }
    let v = value;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }

  // ─── Redis State Persistence ───
  private async persistState(
    ingestionThrottleMs: number,
    recommendedConcurrency: number
  ): Promise<void> {
    try {
      await this.redis.hset('whatsapp:latency_controller', 'state', this.currentState);
      await this.redis.hset('whatsapp:latency_controller', 'ingestionThrottleMs', Math.round(ingestionThrottleMs).toString());
      await this.redis.hset('whatsapp:latency_controller', 'recommendedConcurrency', recommendedConcurrency.toString());
      await this.redis.hset('whatsapp:latency_controller', 'shouldPauseIngestion', (this.currentState === 'DEGRADED').toString());
      await this.redis.hset('whatsapp:latency_controller', 'emaQueueLag', Math.round(this.emaQueueLag).toString());
      await this.redis.hset('whatsapp:latency_controller', 'updatedAt', Date.now().toString());
    } catch (err) {
      console.warn('[LatencyController] Failed to persist state to Redis:', err);
    }
  }

  /**
   * Compute the lag trend direction from recent history.
   * Returns: positive = worsening, negative = improving, ~0 = stable
   */
  getLagTrend(): number {
    if (this.lagHistory.length < 4) return 0;
    const recent = this.lagHistory.slice(-4);
    const older = this.lagHistory.slice(-8, -4);
    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return recentAvg - olderAvg;
  }

  getState(): SystemState {
    return this.currentState;
  }
}

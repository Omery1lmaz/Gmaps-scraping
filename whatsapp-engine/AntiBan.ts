import { subHours, startOfDay } from 'date-fns';
import os from 'os';
import db from './mongoService.js';

export type MessageType = 'DIRECT' | 'CAMPAIGN' | 'SEQUENCE';
export type AccountTrustLevel = 'NEW' | 'WARMUP' | 'MATURE' | 'TRUSTED';

export class AntiBanService {
  // Bounded hard limits as strictly required
  private static readonly HARD_MIN_DELAY = 1200;      // 1200ms (Hard Min)
  private static readonly HARD_MAX_DELAY = 12000;     // 12000ms (Hard Max for Direct/Sequence)
  private static readonly CAMPAIGN_MAX_DELAY = 18000; // 18000ms (Hard Max for Campaigns)

  // Message Type Base Delays (ms)
  private static readonly BASE_DELAYS: Record<MessageType, number> = {
    DIRECT: 2000,
    SEQUENCE: 5000,
    CAMPAIGN: 7000,
  };

  // Cooldown & Sliding Window Rate Limiter settings
  private static readonly SLIDING_WINDOW_MS = 30000;    // 30 seconds window
  private static readonly MAX_MESSAGES_PER_WINDOW = 10;  // max 10 messages per 30s
  private static readonly MIN_BURST_GAP = 1200;          // 1.2s consecutive send suppression

  // Memory stores for otonom self-regulation (keyed by sessionId for multi-account isolation)
  private static readonly lastSentTimes = new Map<string, number>();     // sessionId -> last sent timestamp
  private static readonly sentWindows = new Map<string, number[]>();     // sessionId -> sliding window of timestamps
  private static readonly emaHealthScores = new Map<string, number>();   // sessionId -> EMA smoothed health score
  private static readonly EMA_ALPHA = 0.15;                              // 15% weight to new measurements

  // Trust Levels based on Account Age (Days)
  private static readonly TRUST_LEVEL_DAYS = {
    NEW: 7,      // < 7 days
    WARMUP: 21,  // 7 - 21 days
    MATURE: 90,  // 21 - 90 days
  };

  // Base Daily Limits per Trust Level
  private static readonly BASE_DAILY_LIMITS: Record<AccountTrustLevel, number> = {
    NEW: 15,
    WARMUP: 40,
    MATURE: 120,
    TRUSTED: 300,
  };

  private static readonly WARMUP_DAILY_INCREMENT = 5;

  /**
   * Generates a Gaussian random jitter using the Box-Muller transform,
   * strictly clamped to prevent extreme out-of-bound outliers.
   */
  private static getGaussianJitter(stdDevMs: number = 600): number {
    const u1 = Math.random();
    const u2 = Math.random();
    // Box-Muller formula
    const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
    const rawJitter = z0 * stdDevMs;
    // Strictly clamp jitter to +/- 1500ms to eliminate extreme mathematical spikes
    return Math.max(-1500, Math.min(1500, rawJitter));
  }

  /**
   * Calculates the system load factor dynamically based on OS load average and memory stats.
   * Scaled between 1.0 (idle) and 1.5 (extreme load).
   */
  public static getSystemLoadFactor(): number {
    try {
      const cpus = os.cpus().length || 1;
      const load1m = os.loadavg()[0] || 0.5;
      const cpuLoadRatio = load1m / cpus;
      
      // Calculate a bounded load ratio multiplier
      const scale = Math.min(1.5, Math.max(0.5, cpuLoadRatio));
      const loadFactor = 1.0 + (scale - 0.5) * 0.5; // Maps [0.5, 1.5] to [1.0, 1.5]
      
      return Math.min(1.5, Math.max(1.0, loadFactor));
    } catch (err) {
      console.warn(`[AntiBanService] Error computing system load factor, fallback to 1.0:`, err);
      return 1.0;
    }
  }

  /**
   * Computes the smoothed reputation factor bounded between 0.5x and 2.5x.
   * Employs Exponential Moving Average (EMA) to prevent transient network errors
   * from causing catastrophic feedback loops and sudden quarantine locks.
   * Session-specific: keyed on sessionIdOrUserId for multi-account isolation.
   */
  public static async getSmoothedReputationFactor(sessionIdOrUserId: string): Promise<number> {
    try {
      const rawHealth = await this.getHealthScore(sessionIdOrUserId);
      const prevEma = this.emaHealthScores.get(sessionIdOrUserId) ?? 100;
      
      // Update EMA Health Score
      const smoothedHealth = (this.EMA_ALPHA * rawHealth) + ((1 - this.EMA_ALPHA) * prevEma);
      this.emaHealthScores.set(sessionIdOrUserId, smoothedHealth);

      // Map smoothed health (0-100) linearly to reputation factor (0.5x to 2.5x)
      // 100 health -> 0.5x delay (fastest)
      // 50 health -> 1.5x delay
      // 0 health -> 2.5x delay (slowest)
      const factor = 2.5 - (smoothedHealth / 100) * 2.0;
      
      return Math.min(2.5, Math.max(0.5, factor));
    } catch (err) {
      console.warn(`[AntiBanService] Error computing reputation factor, fallback to 1.0:`, err);
      return 1.0;
    }
  }

  /**
   * Central Control Theory Delay Generator
   * Calculates a mathematically bounded stochastic delay following:
   * delay = clamp(base_delay * reputation_factor * load_factor + jitter, MIN, MAX)
   * Guaranteed to avoid the 95s outlier bug.
   * Session-specific: uses sessionIdOrUserId to compute per-session reputation.
   */
  public static async getDelayForType(type: MessageType, sessionIdOrUserId: string): Promise<number> {
    const baseDelay = this.BASE_DELAYS[type] || this.BASE_DELAYS.DIRECT;
    let repFactor = await this.getSmoothedReputationFactor(sessionIdOrUserId);
    let loadFactor = this.getSystemLoadFactor();
    let jitter = this.getGaussianJitter(600);

    // Strict Sanitization: Prevent NaN/Infinity propagation from database/OS crashes
    if (isNaN(repFactor) || !isFinite(repFactor)) repFactor = 1.0;
    if (isNaN(loadFactor) || !isFinite(loadFactor)) loadFactor = 1.0;
    if (isNaN(jitter) || !isFinite(jitter)) jitter = 0;

    // Apply the bounded stochastic formula
    const rawDelay = baseDelay * repFactor * loadFactor + jitter;
    
    // Choose appropriate limits
    const maxLimit = (type === 'CAMPAIGN') ? this.CAMPAIGN_MAX_DELAY : this.HARD_MAX_DELAY;
    
    let finalDelay = Math.round(rawDelay);
    if (isNaN(finalDelay) || !isFinite(finalDelay)) {
      finalDelay = baseDelay; // Fallback to safe baseline on calculation failure
    }

    const clampedDelay = Math.max(this.HARD_MIN_DELAY, Math.min(maxLimit, finalDelay));

    console.log(
      `[AntiBanController] Delay Calc - Session: ${sessionIdOrUserId}, Type: ${type}, Base: ${baseDelay}ms, ` +
      `RepFactor: ${repFactor.toFixed(2)}x, LoadFactor: ${loadFactor.toFixed(2)}x, ` +
      `Jitter: ${Math.round(jitter)}ms -> Final: ${clampedDelay}ms (Limits: ${this.HARD_MIN_DELAY}ms - ${maxLimit}ms)`
    );

    return clampedDelay;
  }

  /**
   * Generates native campaign staggering delay in BullMQ queue.
   * Replaces worker sleeping with clean background queue scheduling.
   * Session-specific: uses sessionIdOrUserId for per-session reputation.
   */
  public static async getCampaignStaggerDelay(index: number, sessionIdOrUserId: string): Promise<number> {
    const baseGap = 10000; // 10 seconds average stagger gap
    const jitter = this.getGaussianJitter(800); // larger jitter for campaigns
    const repFactor = await this.getSmoothedReputationFactor(sessionIdOrUserId);

    // Cumulative stagger, bounded nicely
    const stagger = Math.max(0, index * Math.floor(baseGap * repFactor) + jitter);
    return stagger;
  }

  /**
   * Bounded sliding window rate limiter and burst gap suppressor.
   * Guarantees strict consecutive send separation and blocks spam bursts.
   * Session-specific: keyed on sessionIdOrUserId for multi-account isolation.
   */
  public static async enforceCooldown(sessionIdOrUserId: string): Promise<void> {
    const now = Date.now();
    
    // 1. Burst Protection: Enforce strict gap between consecutive sends (1.2s)
    const lastSent = this.lastSentTimes.get(sessionIdOrUserId) || 0;
    const consecutiveElapsed = now - lastSent;
    if (consecutiveElapsed < this.MIN_BURST_GAP) {
      const burstWait = this.MIN_BURST_GAP - consecutiveElapsed;
      console.log(`[AntiBanController] Burst suppression (session ${sessionIdOrUserId}): spacing sends by ${burstWait}ms...`);
      await new Promise(resolve => setTimeout(resolve, burstWait));
    }

    // Update time after potential burst wait
    const currentTimestamp = Date.now();

    // 2. Sliding Window Cooldown: Max 10 messages per 30 seconds
    let windowTimestamps = this.sentWindows.get(sessionIdOrUserId) || [];
    
    // Evict expired timestamps older than 30 seconds
    windowTimestamps = windowTimestamps.filter(ts => currentTimestamp - ts < this.SLIDING_WINDOW_MS);

    if (windowTimestamps.length >= this.MAX_MESSAGES_PER_WINDOW) {
      const oldestTs = windowTimestamps[0] ?? currentTimestamp;
      const timeToWait = this.SLIDING_WINDOW_MS - (currentTimestamp - oldestTs);
      
      if (timeToWait > 0) {
        console.warn(
          `[AntiBanController] Sliding window rate limit hit for session ${sessionIdOrUserId} ` +
          `(${windowTimestamps.length} msgs in last 30s). Enforcing sliding cooldown: sleeping ${timeToWait}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
      
      // Re-filter sliding window after sleep
      const postSleepNow = Date.now();
      windowTimestamps = windowTimestamps.filter(ts => postSleepNow - ts < this.SLIDING_WINDOW_MS);
    }

    // Add current send timestamp to active window
    windowTimestamps.push(Date.now());
    this.sentWindows.set(sessionIdOrUserId, windowTimestamps);
    this.lastSentTimes.set(sessionIdOrUserId, Date.now());
  }

  /**
   * Identifies the trust level of a WhatsApp session based on its age.
   * Session-specific: checks by sessionId (id) first, then falls back to userId.
   */
  public static async getAccountTrustLevel(sessionIdOrUserId: string): Promise<AccountTrustLevel> {
    try {
      let session = await db.whatsAppSession.findUnique({ where: { id: sessionIdOrUserId } });
      if (!session) {
        session = await db.whatsAppSession.findFirst({ where: { userId: sessionIdOrUserId } });
      }
      if (!session || !session.createdAt) return 'NEW';

      const ageInDays = Math.floor(
        (new Date().getTime() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (ageInDays < this.TRUST_LEVEL_DAYS.NEW) return 'NEW';
      if (ageInDays < this.TRUST_LEVEL_DAYS.WARMUP) return 'WARMUP';
      if (ageInDays < this.TRUST_LEVEL_DAYS.MATURE) return 'MATURE';
      return 'TRUSTED';
    } catch (err) {
      console.warn(`[AntiBanService] Error getting account trust level:`, err);
      return 'NEW';
    }
  }

  /**
   * Calculates the daily message limit based on trust level and daily warm-up increments.
   * Session-specific: checks by sessionId first, then falls back to userId.
   */
  public static async getDailyLimit(sessionIdOrUserId: string): Promise<number> {
    try {
      let session = await db.whatsAppSession.findUnique({ where: { id: sessionIdOrUserId } });
      if (!session) {
        session = await db.whatsAppSession.findFirst({ where: { userId: sessionIdOrUserId } });
      }
      if (!session || !session.createdAt) return this.BASE_DAILY_LIMITS.NEW;

      const trustLevel = await this.getAccountTrustLevel(session.id || session._id || sessionIdOrUserId);
      const baseLimit = this.BASE_DAILY_LIMITS[trustLevel];

      const ageInDays = Math.floor(
        (new Date().getTime() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (trustLevel === 'WARMUP') {
        const warmupDays = ageInDays - this.TRUST_LEVEL_DAYS.NEW;
        return baseLimit + (warmupDays * this.WARMUP_DAILY_INCREMENT);
      }

      return baseLimit;
    } catch (err) {
      console.warn(`[AntiBanService] Error getting daily limit:`, err);
      return this.BASE_DAILY_LIMITS.NEW;
    }
  }

  /**
   * Checks whether the session has exceeded its daily trust limit.
   * Session-specific: counts outgoing messages sent specifically by this sessionId.
   */
  public static async checkDailyLimit(sessionIdOrUserId: string): Promise<boolean> {
    try {
      let session = await db.whatsAppSession.findUnique({ where: { id: sessionIdOrUserId } });
      if (!session) {
        session = await db.whatsAppSession.findFirst({ where: { userId: sessionIdOrUserId } });
      }
      if (!session?.lastConnected) return false;

      const limit = await this.getDailyLimit(session.id || session._id || sessionIdOrUserId);

      // Count only messages sent by THIS specific session today
      const sentToday = await db.whatsAppMessage.count({
        where: {
          sessionId: session.id || session._id,
          direction: 'OUTGOING',
          createdAt: { gte: startOfDay(new Date()) },
          status: { in: ['SENT', 'DELIVERED', 'READ'] }
        }
      });

      return sentToday < limit;
    } catch (err) {
      console.warn(`[AntiBanService] Error checking daily limit:`, err);
      return true;
    }
  }

  /**
   * Backward-compatible random delay (retains a safe fallback range to protect other code).
   */
  public static getRandomDelay(): number {
    const min = 4000;
    const max = 10000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Computes the account's recent sending health based on the ratio of FAILED vs SENT WhatsApp messages.
   * Session-specific: checks outgoing messages of this specific sessionId.
   */
  public static async getHealthScore(sessionIdOrUserId: string): Promise<number> {
    try {
      let session = await db.whatsAppSession.findUnique({ where: { id: sessionIdOrUserId } });
      if (!session) {
        session = await db.whatsAppSession.findFirst({ where: { userId: sessionIdOrUserId } });
      }
      const targetSessionId = session ? (session.id || session._id) : sessionIdOrUserId;

      const last100Msgs = await db.whatsAppMessage.findMany({
        where: {
          sessionId: targetSessionId,
          direction: 'OUTGOING',
          createdAt: { gte: subHours(new Date(), 24) }
        },
        take: 100,
        orderBy: { createdAt: 'desc' }
      });

      if (last100Msgs.length === 0) return 100;

      const failed = last100Msgs.filter(m => m.status === 'FAILED').length;
      const score = 100 - (failed * 10);
      return Math.max(10, score);
    } catch (err) {
      console.warn(`[AntiBanService] Error getting health score:`, err);
      return 100;
    }
  }
}

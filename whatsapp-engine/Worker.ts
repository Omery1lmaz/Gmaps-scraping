import { Worker, Job, Queue } from 'bullmq';
import crypto from 'crypto';
import Redis from 'ioredis';
import fs from 'fs';
import type { Redis as RedisType } from 'ioredis';
import { WhatsAppSessionManager } from './SessionManager.js';
import { WhatsAppService, formatPhoneToJid } from './WhatsAppService.js';
import { AntiBanService } from './AntiBan.js';
import db from './mongoService.js';
import whatsappWeb from 'whatsapp-web.js';
import type { BaseMessageJob, MediaMessageJob } from './types.js';
import { WhatsAppClient } from './WhatsAppClient.js';
import { MediaPreprocessor } from './MediaPreprocessor.js';
import { IdempotencyManager } from './IdempotencyManager.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { AdaptiveRetryEngine } from './AdaptiveRetryEngine.js';
import { MediaCacheService } from './MediaCacheService.js';
import { MetricsService } from './MetricsService.js';
import { LatencyController } from './LatencyController.js';
import logger from './logger.js';

const { MessageMedia } = whatsappWeb as any;
const IORedis = (Redis as any).default || Redis;

// Safe error message extractor — handles Error objects, strings, and unknown types
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.toString();
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const e = error as any;
    if (typeof e.message === 'string' && e.message.length > 1) return e.message;
    if (typeof e.reason === 'string') return e.reason;
    if (typeof e.error === 'string') return e.error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error) || 'Bilinmeyen hata oluştu';
}

const RATE_LIMIT_MAX_MESSAGES = 5;
const RATE_LIMIT_WINDOW_MS = 60000;

const rateLimitStore = new Map<string, { count: number; timestamps: number[] }>();

/**
 * In-memory sliding window rate limiter.
 * Keyed by sessionIdOrUserId for multi-account isolation.
 */
function checkRateLimit(sessionIdOrUserId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(sessionIdOrUserId);
  
  if (!record) {
    rateLimitStore.set(sessionIdOrUserId, { count: 1, timestamps: [now] });
    return true;
  }
  
  record.timestamps = record.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (record.timestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }
  
  record.count = record.timestamps.length + 1;
  record.timestamps.push(now);
  return true;
}

async function recordMetric(redis: RedisType, metric: string, value: number = 1) {
  try {
    await redis.hincrby('whatsapp_media_metrics', metric, value);
  } catch (err) {
    console.error('Failed to update Redis metric:', err);
  }
}

export function setupWorkers(sessionManager: WhatsAppSessionManager) {
  const service = new WhatsAppService(sessionManager);
  const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  // 1. Single Message Worker (High Priority)
  const singleWorker = new Worker('single-messages', async (job: Job) => {
    if (job.name === 'send-media-job') {
      return processMessageJob(job, sessionManager, redisConnection);
    }
    if (job.name === 'send-whatsapp-chat-message') {
      return processWhatsAppChatMessage(job, sessionManager, service);
    }
    if (job.name === 'sync-whatsapp-history') {
      return service.syncHistory(job.data.userId);
    }
    return processSendMessage(job, sessionManager, service);
  }, {
    connection: redisConnection,
    concurrency: 5,
    settings: {
      backoffStrategies: {
        adaptive: async (attemptsMade: number, type: string, err: Error, job: Job) => {
          const queue = new Queue(job.queueName, { connection: redisConnection });
          const waitingJobs = await queue.getJobs(['waiting'], 0, 0, true);
          let queueLag = 0;
          if (waitingJobs.length > 0) {
            queueLag = Date.now() - (waitingJobs[0]?.timestamp || Date.now());
          }
          
          const retryEngine = new AdaptiveRetryEngine(redisConnection);
          const sessionId = job.data.sessionId || 'default';
          const delay = await retryEngine.calculateDelay(attemptsMade, sessionId, queueLag);
          console.log(`[Worker] Job ${job.id} failed (attempt ${attemptsMade}). Calculated adaptive retry backoff delay: ${delay}ms`);
          return delay;
        }
      }
    }
  } as any);

  // ─── Closed-Loop Latency Controller (Control Theory) ───
  // Replaces the naive threshold-based backpressure with a damped control loop
  // that uses EMA smoothing and hysteresis state transitions.
  const latencyController = new LatencyController(redisConnection);
  let lastJobCompletionTime = 0;
  let lastAckLatency = 0;

  // Track worker execution metrics for the control loop
  singleWorker.on('completed', (_job: Job) => {
    lastJobCompletionTime = Date.now();
  });

  setInterval(async () => {
    try {
      const queue = new Queue('single-messages', { connection: redisConnection });
      const waitingJobs = await queue.getJobs(['waiting'], 0, 0, true);
      let queueLag = 0;
      if (waitingJobs.length > 0) {
        queueLag = Date.now() - (waitingJobs[0]?.timestamp || Date.now());
      }

      // Compute worker execution time from latest latency metrics
      const latencies = await redisConnection.lrange('whatsapp_latency:media_send_latency_ms', 0, 4);
      const avgExecTime = latencies.length > 0
        ? latencies.map(Number).reduce((a: number, b: number) => a + b, 0) / latencies.length
        : 0;

      // Ack latency = time since last job completed (proxy for responsiveness)
      lastAckLatency = lastJobCompletionTime > 0 ? Date.now() - lastJobCompletionTime : 0;

      const output = await latencyController.update({
        queueLagMs: queueLag,
        workerExecutionTimeMs: avgExecTime,
        ackLatencyMs: lastAckLatency,
        loadFactor: AntiBanService.getSystemLoadFactor()
      });

      // Apply the controller's recommended concurrency
      if (singleWorker.concurrency !== output.recommendedConcurrency) {
        console.log(
          `[LatencyController] Adjusting single-messages worker concurrency: ` +
          `${singleWorker.concurrency} → ${output.recommendedConcurrency} (state: ${output.state})`
        );
        singleWorker.concurrency = output.recommendedConcurrency;
      }
    } catch (err) {
      console.error('[LatencyController] Control loop tick failed:', err);
    }
  }, 5000);

  // 2. Campaign Management Worker
  const campaignMgmtWorker = new Worker('campaign-messages', async (job: Job) => {
    if (job.name === 'start-campaign') {
      const { campaignId } = job.data;
      console.log(`[CampaignMgmt] Starting campaign ${campaignId}`);
      
      const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) {
        console.error(`[CampaignMgmt] Campaign ${campaignId} not found`);
        return;
      }

      const pendingLeads = await db.campaignLead.findMany({
        where: { campaignId, status: 'PENDING' }
      });

      const campaignQueue = new Queue('campaign-messages', { connection: redisConnection });
      const resolvedUserId = campaign.userId?.toString();
      if (!resolvedUserId) throw new Error(`Campaign ${campaignId} is missing userId`);

      // Resolve active session for this user to isolate anti-ban per session
      const resolvedCampaignClient = await resolveClientForUser(resolvedUserId, sessionManager);
      const targetSessionId = resolvedCampaignClient?.sessionId || resolvedUserId;
      console.log(`[CampaignMgmt] Using session ${targetSessionId} for campaign stagger delays`);

      let index = 0;
      for (const cl of pendingLeads) {
        // Update to QUEUED
        await db.campaignLead.update({
          where: { id: cl.id },
          data: { status: 'QUEUED' }
        });

        // Calculate native staggered delay using resolved sessionId for per-session reputation
        const staggerDelay = await AntiBanService.getCampaignStaggerDelay(index, targetSessionId);
        console.log(`[CampaignMgmt] Queuing lead ${cl.leadId} with staggered delay: ${staggerDelay}ms (session: ${targetSessionId})`);

        // Add individual send job with native delay
        await campaignQueue.add('send-campaign-message', {
          campaignLeadId: cl.id,
          campaignId: cl.campaignId,
          leadId: cl.leadId,
          templateId: campaign.templateId,
          userId: resolvedUserId,
          sessionId: targetSessionId
        }, {
          delay: staggerDelay
        });

        index++;
      }
    }

    if (job.name === 'send-campaign-message') {
      return processCampaignSend(job, sessionManager, service);
    }
  }, { connection: redisConnection, concurrency: 1 });

  // 3. Sequence Worker
  const sequenceWorker = new Worker('sequence-messages', async (job: Job) => {
    if (job.name === 'process-sequence-step') {
      return processSequenceStep(job, sessionManager, service);
    }
  }, { connection: redisConnection, concurrency: 1 });

  return { singleWorker, campaignMgmtWorker, sequenceWorker };
}

function isWithinSequenceSchedule(sequence: any, isForced?: boolean): boolean {
  if (isForced) return true;

  const now = new Date();
  const day = now.getDay();
  
  const activeDays = sequence?.activeDays || [1, 2, 3, 4, 5];
  if (!activeDays.includes(day)) return false;

  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour + minute / 60;

  const startStr = sequence?.sendTimeStart || "09:00";
  const endStr = sequence?.sendTimeEnd || "18:00";

  const [startH, startM] = startStr.split(':').map(Number);
  const startTime = startH + (startM || 0) / 60;

  const [endH, endM] = endStr.split(':').map(Number);
  const endTime = endH + (endM || 0) / 60;

  if (currentTime < startTime || currentTime >= endTime) return false;

  return true;
}

/**
 * Resolves the best available WhatsApp client for a user.
 * Supports multi-session: tries specific sessionId first, then falls back
 * to any active CONNECTED session, then any session, then legacy userId key.
 */
async function resolveClientForUser(
  userId: string,
  sessionManager: WhatsAppSessionManager,
  jobSessionId?: string
): Promise<{ client: any; sessionId: string } | null> {
  // 1. If a specific sessionId was provided, try it first
  if (jobSessionId) {
    const client = sessionManager.getClient(jobSessionId);
    if (client) return { client, sessionId: jobSessionId };
  }

  // 2. Find an active CONNECTED session for this user
  const activeSession = await db.whatsAppSession.findFirst({
    where: { userId, status: 'CONNECTED' }
  });
  if (activeSession) {
    const client = sessionManager.getClient(activeSession.id);
    if (client) return { client, sessionId: activeSession.id };
  }

  // 3. Try any session belonging to this user
  const anySession = await db.whatsAppSession.findFirst({
    where: { userId }
  });
  if (anySession) {
    const client = sessionManager.getClient(anySession.id);
    if (client) return { client, sessionId: anySession.id };
  }

  // 4. Legacy fallback: try userId as sessionId
  const legacyClient = sessionManager.getClient(userId);
  if (legacyClient) return { client: legacyClient, sessionId: userId };

  return null;
}

async function processSequenceStep(job: Job, sessionManager: WhatsAppSessionManager, service: WhatsAppService) {
  const { leadSequenceStateId } = job.data;
  logger.info({ leadSequenceStateId }, '[SequenceWorker] === STARTING processSequenceStep ===');
  const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  const sequenceQueue = new Queue('sequence-messages', { connection: redisConnection });

  try {
    logger.debug({ leadSequenceStateId }, '[SequenceWorker] Fetching state from DB');
    const state = await db.sequenceState.findUnique({
      where: { id: leadSequenceStateId }
    });

    if (!state) {
      logger.warn({ leadSequenceStateId }, '[SequenceWorker] State not found in DB!');
      return;
    }
    console.log(`[SequenceWorker] State status: ${state.status}, nextRunAt: ${state.nextRunAt}, isForced: ${state.isForced}`);

    if (!['ACTIVE', 'PENDING', 'IN_PROGRESS', 'PROCESSING'].includes(state.status)) {
      console.log(`[SequenceWorker] State status ${state.status} is not eligible. Skipping processing.`);
      return;
    }

    // Manually fetch relations
    const leadIdStr = state.leadId ? state.leadId.toString() : '';
    const sequenceIdStr = state.sequenceId ? state.sequenceId.toString() : '';

    console.log(`[SequenceWorker] Fetching sequence ${sequenceIdStr} and lead ${leadIdStr}`);
    const sequence = await db.sequence.findUnique({ where: { id: sequenceIdStr } });

    if (!sequence) {
      console.error(`[SequenceWorker] Sequence ${sequenceIdStr} not found for state ${state.id}! Cleaning up orphaned state.`);
      await db.sequenceState.delete({ where: { id: state.id } });
      return;
    }
    const resolvedUserId = sequence.userId?.toString();
    if (!resolvedUserId) throw new Error(`Sequence ${sequenceIdStr} is missing userId`);
    const lead = await db.lead.findFirst({ where: { id: leadIdStr, userId: resolvedUserId } });
    if (!lead) {
      console.error(`[SequenceWorker] Lead ${leadIdStr} not found for state ${state.id}! Cleaning up orphaned state.`);
      await db.sequenceState.delete({ where: { id: state.id } });
      return;
    }

    logger.info({ 
      sequenceName: sequence.name, 
      leadName: lead.businessName || lead.name,
      stepCount: sequence.steps?.length || 0 
    }, '[SequenceWorker] Starting step processing');

    const steps = sequence.steps || [];

    // Check Sequence Schedule
    logger.debug({ sequenceId: sequence.id }, '[SequenceWorker] Checking schedule constraints');
    if (!isWithinSequenceSchedule(sequence, state.isForced)) {
      logger.info({ stateId: state.id }, '[SequenceWorker] Outside sequence schedule. Rescheduling...');
      await db.sequenceState.update({
        where: { id: state.id },
        data: { nextRunAt: new Date(Date.now() + 3600000), status: 'ACTIVE', isForced: false }
      });
      return;
    }

    // Resolve WhatsApp client early to obtain session ID for isolated rate limiting
    logger.debug({ userId: resolvedUserId }, '[SequenceWorker] Resolving WA client');
    const targetSessionId = sequence.whatsappSessionId || job.data.sessionId;
    const resolved = await resolveClientForUser(resolvedUserId, sessionManager, targetSessionId);
    if (!resolved) {
      logger.error({ userId: resolvedUserId, targetSessionId }, '[SequenceWorker] WhatsApp client not found or offline');
      throw new Error('WhatsApp Client offline');
    }
    const { client, sessionId: resolvedSessionId } = resolved;

    logger.debug({ resolvedSessionId }, '[SequenceWorker] Checking rate limits');
    if (!checkRateLimit(resolvedSessionId)) {
      logger.warn({ resolvedSessionId }, '[SequenceWorker] Rate limited. Re-scheduling...');
      await db.sequenceState.update({
        where: { id: state.id },
        data: { nextRunAt: new Date(Date.now() + 60000), status: 'ACTIVE' }
      });
      return;
    }

    const currentStepId = state.currentStepId;
    const currentStepIndex = state.currentStepIndex;
    
    let nextStep = null;
    if (currentStepId) {
      nextStep = steps.find((s: any) => s.id === currentStepId);
    } else {
      nextStep = steps[currentStepIndex];
    }

    logger.info({ 
      stepType: nextStep?.type, 
      stepId: currentStepId || currentStepIndex 
    }, '[SequenceWorker] Processing current step');

    if (!nextStep) {
      logger.info({ stateId: state.id }, '[SequenceWorker] No steps remaining. Marking as COMPLETED.');
      await db.sequenceState.update({
        where: { id: state.id },
        data: { status: 'COMPLETED' }
      });
      return;
    }

    // Helper to find next step in graph or linear
    const findNextStep = (currentStep: any, intent?: string): any => {
      if (currentStep.branches && currentStep.branches.length > 0) {
        if (intent) {
          const branch = currentStep.branches.find((b: any) => b.intent === intent);
          if (branch) return steps.find((s: any) => s.id === branch.nextStepId);
        }
        // Fallback to first branch if no intent or not found? Or just end.
        return null;
      }
      if (currentStep.nextStepId) {
        return steps.find((s: any) => s.id === currentStep.nextStepId);
      }
      // Backward compatibility: linear increment
      if (!currentStep.id) {
        return steps[currentStepIndex + 1];
      }
      return null;
    };

    // Helper to calculate nextRunAt based on wait settings
    const calculateNextRunAt = (step: any): Date => {
      const now = new Date();
      const waitType = step.waitType || 'duration';
      const delayHours = step.delayHours || 24;

      if (waitType === 'until_time' && step.untilTime) {
        const [h, m] = step.untilTime.split(':').map(Number);
        const next = new Date();
        next.setHours(h, m, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1); // Tomorrow at that time
        }
        return next;
      }

      if (waitType === 'weekdays') {
        const next = new Date(now.getTime() + (delayHours * 3600000));
        const day = next.getDay();
        if (day === 0) { // Sunday -> Monday
          next.setDate(next.getDate() + 1);
          next.setHours(9, 0, 0, 0);
        } else if (day === 6) { // Saturday -> Monday
          next.setDate(next.getDate() + 2);
          next.setHours(9, 0, 0, 0);
        }
        return next;
      }

      // Default: Duration
      return new Date(now.getTime() + (delayHours * 3600000));
    };

    if (nextStep.type === 'TAG') {
      logger.info({ tagId: nextStep.tagId, leadId: lead.id }, '[SequenceWorker] Step type is TAG. Adding tag to lead...');
      if (nextStep.tagId) {
        await db.lead.update({
          where: { id: lead.id },
          data: {
            tags: { $addToSet: nextStep.tagId }
          }
        });
      }
      
      const nextToRun = findNextStep(nextStep);
      const hasMoreSteps = !!nextToRun;
      
      await db.sequenceState.update({
        where: { id: state.id },
        data: {
          currentStepId: nextToRun?.id,
          currentStepIndex: currentStepIndex + 1,
          status: hasMoreSteps ? 'ACTIVE' : 'COMPLETED',
          nextRunAt: new Date(), // Run next step immediately for TAG
          lastRunAt: new Date()
        }
      });
      
      // Re-queue immediately
      await sequenceQueue.add('process-sequence-step', { leadSequenceStateId: state.id });
      return;
    }

    if (nextStep.type === 'BOOK_MEETING') {
      logger.info({ leadId: lead.id }, '[SequenceWorker] Step type is BOOK_MEETING. Creating meeting record...');
      const meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() + 1); // Default to tomorrow
      
      const newMeeting = await db.meeting.create({
        data: {
          userId: resolvedUserId,
          title: nextStep.meetingTitle || `Meeting with ${lead.businessName || lead.name}`,
          date: meetingDate,
          relatedLeads: [lead.id],
          notes: `Automatically scheduled via sequence ${sequence.name}`,
          status: 'PENDING'
        }
      });
      
      logger.info({ meetingId: newMeeting.id }, '[SequenceWorker] Meeting created');
      
      // Update State and finish
      const nextToRun = findNextStep(nextStep);
      const hasMoreSteps = !!nextToRun;
      let nextRunAt = null;
      if (hasMoreSteps) {
        nextRunAt = calculateNextRunAt(nextToRun);
      }

      await db.sequenceState.update({
        where: { id: state.id },
        data: {
          currentStepId: nextToRun?.id,
          currentStepIndex: currentStepIndex + 1,
          status: hasMoreSteps ? 'ACTIVE' : 'COMPLETED',
          nextRunAt,
          lastRunAt: new Date()
        }
      });
      return;
    }

    // Client already resolved above for rate limiting

    const pickTemplateId = (step: any): string => {
      if (step.templates && step.templates.length > 0) {
        const totalWeight = step.templates.reduce((sum: number, t: any) => sum + (t.weight || 0), 0);
        let random = Math.random() * totalWeight;
        for (const t of step.templates) {
          if (random < (t.weight || 0)) {
            return t.templateId.toString();
          }
          random -= (t.weight || 0);
        }
        return step.templates[0].templateId.toString();
      }
      return step.templateId;
    };

    const resolvedTemplateId = pickTemplateId(nextStep);
    logger.info({ resolvedTemplateId }, '[SequenceWorker] Selected template');

    logger.debug({ resolvedTemplateId }, '[SequenceWorker] Fetching message template');
    const template = await db.messageTemplate.findUnique({ where: { id: resolvedTemplateId } });
    if (!template) {
      logger.error({ resolvedTemplateId }, '[SequenceWorker] Template not found in DB!');
      throw new Error('Template missing');
    }

    let content = template.content;
    
    // Fetch Calendly integration for variable replacement
    let bookingLink = '';
    try {
      const calendlyInt = await db.calendlyIntegration.findFirst({
        where: { userId: resolvedUserId }
      });
      if (calendlyInt && calendlyInt.schedulingUrl) {
        bookingLink = calendlyInt.schedulingUrl;
        console.log(`[SequenceWorker] Resolved Calendly booking link for user ${resolvedUserId}: ${bookingLink}`);
      }
    } catch (dbErr) {
      console.warn(`[SequenceWorker] Error loading Calendly integration:`, dbErr);
    }

    const vars = {
      businessName: lead.businessName || '',
      city: lead.city || '',
      category: lead.category || '',
      rating: lead.rating?.toString() || '',
      website: lead.website || '',
      phone: lead.phone || '',
      booking_link: bookingLink
    };
    Object.entries(vars).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value);
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Dynamic Anti-Ban delay and strict cooldown spacing
    const delay = await AntiBanService.getDelayForType('SEQUENCE', resolvedSessionId);
    logger.info({ delay, sessionId: resolvedSessionId }, '[SequenceWorker] Applying anti-ban delay');
    await new Promise(resolve => setTimeout(resolve, delay));

    await AntiBanService.enforceCooldown(resolvedSessionId);

    let targetJid = formatPhoneToJid(lead.phone || '', lead.country || undefined);
    logger.debug({ phone: lead.phone, targetJid }, '[SequenceWorker] Formatted phone');
    if (targetJid.endsWith('@c.us')) {
      const numberToResolve = targetJid.split('@')[0];
      try {
        logger.debug({ numberToResolve }, '[SequenceWorker] Resolving JID');
        const registered = await client.getNumberId(numberToResolve);
        if (registered && registered._serialized) {
          targetJid = registered._serialized;
          logger.info({ targetJid }, '[SequenceWorker] JID resolved successfully');
        } else {
          logger.warn({ numberToResolve }, '[SequenceWorker] JID resolution failed, using fallback');
        }
      } catch (err) {
        logger.error({ err, numberToResolve }, '[SequenceWorker] Error resolving JID');
      }
    }

    // Smart Typing Simulation
    try {
      const chat = await client.getChatById(targetJid);
      await chat.sendStateTyping();
      const typingTime = Math.min(3500, Math.max(1200, content.length * 40));
      logger.debug({ typingTime, targetJid }, '[SequenceWorker] Simulating human typing');
      await new Promise(resolve => setTimeout(resolve, typingTime));
      await chat.clearState();
    } catch (typingErr) {
      logger.warn({ err: extractErrorMessage(typingErr), targetJid }, '[SequenceWorker] Typing simulation failed');
    }

    logger.info({ targetJid, preview: content.substring(0, 30) }, '[SequenceWorker] Sending message');
    let message;
    if (template.hasMedia && template.mediaUrl) {
      logger.debug({ mediaType: template.mediaType, mediaUrl: template.mediaUrl }, '[SequenceWorker] Sending media');
      const clientAdapter = new WhatsAppClient(client);
      const mediaInfo = await MediaPreprocessor.downloadAndValidate(
        (template.mediaType as any) || 'IMAGE',
        template.mediaUrl,
        template.mimeType,
        template.fileName || 'media_file'
      );
      if (template.mediaType === 'IMAGE') {
        message = await clientAdapter.sendImage(targetJid, mediaInfo, content);
      } else if (template.mediaType === 'VIDEO') {
        message = await clientAdapter.sendVideo(targetJid, mediaInfo, content);
      } else if (template.mediaType === 'DOCUMENT') {
        message = await clientAdapter.sendDocument(targetJid, mediaInfo, template.fileName || 'document');
        if (content && content.trim().length > 0) {
          // Send caption as a separate message for documents
          await new Promise(resolve => setTimeout(resolve, 1000));
          await client.sendMessage(targetJid, content);
        }
      } else {
        message = await client.sendMessage(targetJid, content);
      }
    } else {
      message = await client.sendMessage(targetJid, content);
    }
    logger.info({ messageId: message.id._serialized }, '[SequenceWorker] Message sent successfully');

    // 2. Update State
    const nextToRun = findNextStep(nextStep);
    const hasMoreSteps = !!nextToRun;
    
    let nextRunAt = null;
    if (hasMoreSteps) {
      nextRunAt = calculateNextRunAt(nextToRun);
      logger.info({ nextRunAt, nextStepType: nextToRun?.type }, '[SequenceWorker] Scheduled next step');
    }

    logger.debug({ stateId: state.id }, '[SequenceWorker] Updating sequence state in DB');
    await db.sequenceState.update({
      where: { id: state.id },
      data: {
        currentStepId: nextToRun?.id,
        currentStepIndex: currentStepIndex + 1,
        lastSentAt: new Date(),
        status: hasMoreSteps ? 'ACTIVE' : 'COMPLETED',
        nextRunAt: nextRunAt,
        isForced: false
      }
    });
    logger.info({ stateId: state.id }, '[SequenceWorker] Sequence state updated');

    // 3. Log
    logger.debug({ leadId: state.leadId }, '[SequenceWorker] Creating message log entry');
    await db.messageLog.create({
      data: {
        userId: resolvedUserId,
        leadId: state.leadId,
        content,
        status: 'SENT',
        messageId: message.id._serialized
      }
    });

    // 4. Update WhatsApp Chat/Message for UI
    try {
      const messageIdObj = crypto.randomUUID();
      await db.whatsAppChat.upsert({
        where: { userId: resolvedUserId, sessionId: resolvedSessionId, jid: targetJid },
        update: {
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          lastMessageAt: new Date(),
          lastMessagePreview: content,
          leadId: lead.id,
        },
        create: {
          id: crypto.randomUUID(),
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          jid: targetJid,
          name: lead.businessName || targetJid,
          unreadCount: 0,
          isGroup: false,
          lastMessageAt: new Date(),
          lastMessagePreview: content,
          leadId: lead.id,
        }
      });
      await db.whatsAppMessage.create({
        data: {
          id: messageIdObj,
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          chatId: targetJid,
          direction: 'OUTGOING',
          status: 'SENT',
          body: content,
          timestamp: new Date(),
          whatsappMessageId: message.id._serialized
        }
      });
    } catch (dbErr) {
      console.error('[Sequence] Error saving chat to DB:', dbErr);
    }

  } catch (error: any) {
    console.error(`[SequenceWorker] Error:`, error);
    try {
      await db.sequenceState.update({
        where: { id: leadSequenceStateId },
        data: { 
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : String(error)
        }
      });
    } catch (dbErr) {
      console.error(`[SequenceWorker] Failed to update sequence state to FAILED:`, dbErr);
    }
    throw error;
  }
}

async function processSendMessage(job: Job, sessionManager: WhatsAppSessionManager, service: WhatsAppService) {
  const { logId, leadId, content, userId } = job.data;
  console.log(`[SingleWorker] Processing job ${job.id} for lead ${leadId}`);

  const resolvedUserId = userId;
  if (!resolvedUserId) throw new Error('WhatsApp message job is missing userId');

  // Resolve client first to obtain session ID for isolated rate limiting
  const resolved = await resolveClientForUser(resolvedUserId, sessionManager, job.data.sessionId);
  if (!resolved) throw new Error(`Client not found for ${resolvedUserId}`);
  const { client, sessionId: resolvedSessionId } = resolved;
  
  if (!checkRateLimit(resolvedSessionId)) {
    console.warn(`[SingleWorker] Rate limited for session ${resolvedSessionId}. Re-queuing job ${job.id}`);
    const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('single-messages', { connection: redisConnection });
    await queue.add('send-message', job.data, { delay: 60000 });
    return;
  }
  
  try {
    const lead = await db.lead.findFirst({ where: { id: leadId, userId: resolvedUserId } });
    if (!lead?.phone) throw new Error('No phone number');

    let targetJid = formatPhoneToJid(lead.phone, lead.country || undefined);
    if (targetJid.endsWith('@c.us')) {
      const numberToResolve = targetJid.split('@')[0];
      try {
        const registered = await client.getNumberId(numberToResolve);
        if (registered && registered._serialized) {
          targetJid = registered._serialized;
        } else {
          throw new Error('Bu numara WhatsApp üzerinde kayıtlı değil.');
        }
      } catch (err) {
        if (extractErrorMessage(err).includes('kayıtlı değil')) throw err;
      }
    }

    // Dynamic single message delay and strict cooldown spacing (session-isolated)
    const delay = await AntiBanService.getDelayForType('DIRECT', resolvedSessionId);
    console.log(`[SingleWorker] Dynamic Anti-Ban delay: ${delay}ms before sending (session: ${resolvedSessionId})...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    await AntiBanService.enforceCooldown(resolvedSessionId);

    // Smart Typing Simulation
    try {
      const chat = await client.getChatById(targetJid);
      await chat.sendStateTyping();
      const typingTime = Math.min(2500, Math.max(1000, content.length * 30));
      console.log(`[SingleWorker] Simulating human typing for ${typingTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, typingTime));
      await chat.clearState();
    } catch (typingErr) {
      // Ignore typing errors for direct messages
    }

    const message = await client.sendMessage(targetJid, content);
    
    await db.messageLog.update({
      where: { id: logId },
      data: { status: 'SENT', messageId: message.id._serialized }
    });

  } catch (error: any) {
    const errorMsg = extractErrorMessage(error);
    console.error(`[SingleWorker] Error for lead ${leadId}:`, errorMsg, error);
    await db.messageLog.update({
      where: { id: logId },
      data: { status: 'FAILED', error: errorMsg }
    });
    throw error;
  }
}

async function processWhatsAppChatMessage(job: Job, sessionManager: WhatsAppSessionManager, service: WhatsAppService) {
  const { whatsAppMessageId, chatJid, content, userId, mediaPath, mediaMimeType, mediaFileName } = job.data;
  console.log(`[WhatsAppChatWorker] Processing job ${job.id} for chat ${chatJid}, messageId=${whatsAppMessageId}, userId=${userId}`);

  const resolvedUserId = userId;
  if (!resolvedUserId) throw new Error('WhatsApp chat message job is missing userId');

  // Resolve client first to obtain session ID for isolated rate limiting
  const resolved = await resolveClientForUser(resolvedUserId, sessionManager, job.data.sessionId);
  if (!resolved) {
    throw new Error(`WhatsApp istemcisi bağlı değil (userId: ${resolvedUserId}). Lütfen önce WhatsApp bağlantınızı kontrol edin.`);
  }
  const { client, sessionId: resolvedSessionId } = resolved;

  if (!checkRateLimit(resolvedSessionId)) {
    console.warn(`[WhatsAppChatWorker] Rate limited for session ${resolvedSessionId}. Re-queuing job ${job.id}`);
    const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('single-messages', { connection: redisConnection });
    await queue.add('send-whatsapp-chat-message', job.data, { delay: 60000 });
    return;
  }

  try {

    // Update message status to SENDING
    try {
      await db.whatsAppMessage.update({
        where: { id: whatsAppMessageId },
        data: { status: 'SENDING' },
      });
    } catch (dbErr) {
      console.warn(`[WhatsAppChatWorker] Could not update message ${whatsAppMessageId} to SENDING:`, extractErrorMessage(dbErr));
    }

    // Resolve accurate JID using WhatsApp's getNumberId
    let targetJid = chatJid;
    if (targetJid.endsWith('@c.us')) {
      const numberToResolve = targetJid.split('@')[0];
      try {
        console.log(`[WhatsAppChatWorker] Resolving WhatsApp ID for number ${numberToResolve}...`);
        const registered = await client.getNumberId(numberToResolve);
        if (registered && registered._serialized) {
          targetJid = registered._serialized;
          console.log(`[WhatsAppChatWorker] Number resolved to exact JID: ${targetJid}`);
        } else {
          throw new Error('Bu numara WhatsApp üzerinde kayıtlı değil.');
        }
      } catch (err) {
        if (extractErrorMessage(err).includes('kayıtlı değil')) {
          throw err;
        }
        console.warn(`[WhatsAppChatWorker] Could not verify number ${numberToResolve}, proceeding with default JID. Error:`, extractErrorMessage(err));
      }
    }

    console.log(`[WhatsAppChatWorker] Sending message to ${targetJid}...`);
    let sentMessage;
    if (mediaPath) {
      console.log(`[WhatsAppChatWorker] Loading media from: ${mediaPath}`);
      if (!fs.existsSync(mediaPath)) {
        console.error(`[WhatsAppChatWorker] Media file not found: ${mediaPath}`);
        throw new Error(`Media file not found at ${mediaPath}`);
      }
      const media = MessageMedia.fromFilePath(mediaPath);
      if (mediaMimeType) media.mimetype = mediaMimeType;
      if (mediaFileName) media.filename = mediaFileName;
      sentMessage = await client.sendMessage(targetJid, media, { caption: content || undefined });
    } else {
      sentMessage = await client.sendMessage(targetJid, content);
    }

    console.log(`[WhatsAppChatWorker] Message sent successfully to ${targetJid}, waId=${sentMessage?.id?._serialized}`);

    const updated = await db.whatsAppMessage.update({
      where: { id: whatsAppMessageId },
      data: {
        status: 'SENT',
        whatsappMessageId: sentMessage?.id?._serialized || null,
        timestamp: new Date(),
        chatId: targetJid, // Ensure the message points to the correct JID
        sessionId: resolvedSessionId,
      },
    });

    try {
      // If the JID was resolved to a different format (like @lid), update the DB to prevent duplicate chats
      if (targetJid !== chatJid) {
        const existingTarget = await db.whatsAppChat.findFirst({ where: { userId: resolvedUserId, sessionId: resolvedSessionId, jid: targetJid } });
        if (existingTarget) {
           await db.whatsAppChat.deleteMany({ where: { userId: resolvedUserId, sessionId: resolvedSessionId, jid: chatJid } });
        } else {
           await db.whatsAppChat.updateMany({ where: { userId: resolvedUserId, sessionId: resolvedSessionId, jid: chatJid }, data: { jid: targetJid } });
        }
      }

      await db.whatsAppChat.upsert({
        where: { userId: resolvedUserId, sessionId: resolvedSessionId, jid: targetJid },
        update: {
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          lastMessageAt: updated?.timestamp || new Date(),
          lastMessagePreview: content || mediaFileName || 'Media',
        },
        create: {
          id: crypto.randomUUID(),
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          jid: targetJid,
          name: targetJid.split('@')[0],
          unreadCount: 0,
          isGroup: false,
          lastMessageAt: updated?.timestamp || new Date(),
          lastMessagePreview: content || mediaFileName || 'Media',
        }
      });
    } catch (chatErr) {
      console.warn(`[WhatsAppChatWorker] Could not update chat ${targetJid}:`, extractErrorMessage(chatErr));
    }

    return updated;
  } catch (error: any) {
    const errorMsg = extractErrorMessage(error);
    console.error(`[WhatsAppChatWorker] FAILED for chat ${chatJid}:`, errorMsg, error);
    try {
      await db.whatsAppMessage.update({
        where: { id: whatsAppMessageId },
        data: { status: 'FAILED', error: errorMsg },
      });
    } catch (dbErr) {
      console.error(`[WhatsAppChatWorker] Could not update message ${whatsAppMessageId} to FAILED:`, extractErrorMessage(dbErr));
    }
    throw new Error(errorMsg);
  }
}

async function processCampaignSend(job: Job, sessionManager: WhatsAppSessionManager, service: WhatsAppService) {
  const { campaignLeadId, campaignId, leadId, templateId, userId } = job.data;
  console.log(`[CampaignWorker] Processing campaign message for lead ${leadId}`);

  const resolvedUserId = userId;
  if (!resolvedUserId) throw new Error('Campaign message job is missing userId');

  // Resolve client first to obtain session ID for isolated rate limiting and anti-ban
  const resolved = await resolveClientForUser(resolvedUserId, sessionManager, job.data.sessionId);
  if (!resolved) throw new Error('WhatsApp Client offline');
  const { client, sessionId: resolvedSessionId } = resolved;

  if (!checkRateLimit(resolvedSessionId)) {
    console.warn(`[CampaignWorker] Rate limited for session ${resolvedSessionId}. Re-queuing campaign job ${job.id}`);
    const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('campaign-messages', { connection: redisConnection });
    await queue.add('send-campaign-message', job.data, { delay: 60000 });
    return;
  }

  try {
    // 1. Check Campaign Status (Stop if paused/stopped)
    const campaign = await db.campaign.findFirst({ where: { id: campaignId, userId: resolvedUserId } });
    if (!campaign || campaign.status !== 'RUNNING') {
      console.log(`[CampaignWorker] Campaign ${campaignId} is not RUNNING. Skipping.`);
      return;
    }

    // 2. Anti-Ban Checks (session-isolated)
    const canSend = await AntiBanService.checkDailyLimit(resolvedSessionId);
    if (!canSend) {
      console.log(`[CampaignWorker] Daily limit reached for session ${resolvedSessionId}. Pausing campaign.`);
      await db.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
      return;
    }

    const health = await AntiBanService.getHealthScore(resolvedSessionId);
    if (health < 40) {
      console.log(`[CampaignWorker] Low health score (${health}) for session ${resolvedSessionId}. Pausing campaign.`);
      await db.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
      return;
    }

    const lead = await db.lead.findFirst({ where: { id: leadId, userId: resolvedUserId } });
    const template = await db.messageTemplate.findUnique({ where: { id: templateId } });
    if (!lead?.phone || !template) throw new Error('Lead or template missing');

    // 4. Interpolate variables
    let content = template.content;
    const vars = {
      businessName: lead.businessName || '',
      city: lead.city || '',
      category: lead.category || '',
      rating: lead.rating?.toString() || '',
      website: lead.website || '',
      phone: lead.phone || ''
    };
    Object.entries(vars).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    // Enforce safe cooldown space since the queue itself is already staggered natively (session-isolated)
    await AntiBanService.enforceCooldown(resolvedSessionId);

    // 6. Send
    let targetJid = formatPhoneToJid(lead.phone, lead.country || undefined);
    if (targetJid.endsWith('@c.us')) {
      const numberToResolve = targetJid.split('@')[0];
      try {
        const registered = await client.getNumberId(numberToResolve);
        if (registered && registered._serialized) {
          targetJid = registered._serialized;
        } else {
          throw new Error('Bu numara WhatsApp üzerinde kayıtlı değil.');
        }
      } catch (err) {
        if (extractErrorMessage(err).includes('kayıtlı değil')) throw err;
      }
    }
    
    // Smart Typing Simulation based on message length
    try {
      const chat = await client.getChatById(targetJid);
      await chat.sendStateTyping();
      const typingTime = Math.min(4000, Math.max(1500, content.length * 40));
      console.log(`[CampaignWorker] Simulating human typing for ${typingTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, typingTime));
      await chat.clearState();
    } catch(err) {
      // ignore typing errors
    }

    let message;
    if (template.hasMedia && template.mediaUrl) {
      console.log(`[CampaignWorker] Sending ${template.mediaType} media from ${template.mediaUrl}`);
      const clientAdapter = new WhatsAppClient(client);
      const mediaInfo = await MediaPreprocessor.downloadAndValidate(
        (template.mediaType as any) || 'IMAGE',
        template.mediaUrl,
        template.mimeType,
        template.fileName || 'media_file'
      );
      if (template.mediaType === 'IMAGE') {
        message = await clientAdapter.sendImage(targetJid, mediaInfo, content);
      } else if (template.mediaType === 'VIDEO') {
        message = await clientAdapter.sendVideo(targetJid, mediaInfo, content);
      } else if (template.mediaType === 'DOCUMENT') {
        message = await clientAdapter.sendDocument(targetJid, mediaInfo, template.fileName || 'document');
        if (content && content.trim().length > 0) {
          // Send caption as a separate message for documents
          await new Promise(resolve => setTimeout(resolve, 1000));
          await client.sendMessage(targetJid, content);
        }
      } else {
        message = await client.sendMessage(targetJid, content);
      }
    } else {
      message = await client.sendMessage(targetJid, content);
    }

    // 7. Success Logging
    const log = await db.messageLog.create({
      data: {
        userId: resolvedUserId,
        leadId,
        campaignLeadId,
        content,
        status: 'SENT',
        messageId: message.id._serialized
      }
    });

    await db.campaignLead.update({
      where: { id: campaignLeadId },
      data: { status: 'SENT', sentAt: new Date() }
    });

    // 8. Update WhatsApp Chat/Message for UI
    try {
      const messageIdObj = crypto.randomUUID();
      await db.whatsAppChat.upsert({
        where: { userId: resolvedUserId, sessionId: resolvedSessionId, jid: targetJid },
        update: {
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          lastMessageAt: new Date(),
          lastMessagePreview: content,
          leadId: lead.id,
        },
        create: {
          id: crypto.randomUUID(),
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          jid: targetJid,
          name: lead.businessName || targetJid,
          unreadCount: 0,
          isGroup: false,
          lastMessageAt: new Date(),
          lastMessagePreview: content,
          leadId: lead.id,
        }
      });
      await db.whatsAppMessage.create({
        data: {
          id: messageIdObj,
          userId: resolvedUserId,
          sessionId: resolvedSessionId,
          chatId: targetJid,
          direction: 'OUTGOING',
          status: 'SENT',
          body: content,
          timestamp: new Date(),
          whatsappMessageId: message.id._serialized
        }
      });
    } catch (dbErr) {
      console.error('[CampaignWorker] Error saving chat to DB:', dbErr);
    }

  } catch (error: any) {
    const errorMsg = extractErrorMessage(error);
    console.error(`[CampaignWorker] Error:`, errorMsg, error);
    await db.campaignLead.update({
      where: { id: campaignLeadId },
      data: { status: 'FAILED', error: errorMsg }
    });
    throw error;
  }
}

async function processMessageJob(
  job: Job<BaseMessageJob | MediaMessageJob>,
  sessionManager: WhatsAppSessionManager,
  redis: RedisType
) {
  const startTime = Date.now();
  const jobData = job.data;
  console.log(`[MediaWorker] Processing job ${job.id} of type ${jobData.type} for session ${jobData.sessionId}`);

  // Register Redis connection with ChaosEngine under Chaos Mode
  if (process.env.CHAOS_MODE === 'true') {
    try {
      const { ChaosEngine } = await import('./ChaosEngine.js');
      ChaosEngine.registerRedis(redis as any);

      // 1. Worker Crash simulation
      const crashIntensity = await ChaosEngine.getFailureIntensity('WORKER_CRASH');
      if (crashIntensity > 0 && Math.random() < crashIntensity) {
        console.warn(`[ChaosEngine] WORKER_CRASH chaos active. Injecting simulated mid-job crash for job ${job.id}.`);
        throw new Error('WORKER_CRASHED: Chaos Engine worker crash injection simulation');
      }
    } catch (e: any) {
      if (e.message?.includes('WORKER_CRASHED')) throw e;
    }
  }

  // Resolve WhatsApp Client
  let rawClient = sessionManager.getClient(jobData.sessionId);

  if (process.env.CHAOS_MODE === 'true') {
    try {
      const { ChaosEngine } = await import('./ChaosEngine.js');
      // 2. WhatsApp Disconnect simulation
      const disconnectIntensity = await ChaosEngine.getFailureIntensity('WHATSAPP_DISCONNECT');
      if (disconnectIntensity > 0 && Math.random() < disconnectIntensity) {
        console.warn(`[ChaosEngine] WHATSAPP_DISCONNECT chaos active. Simulating disconnected client session.`);
        rawClient = null;
      }
    } catch (e) {}
  }
  
  // If it's a TEXT message, delegate to standard text sending (preserve existing logic)
  if (jobData.type === 'TEXT') {
    if (!rawClient) {
      throw new Error('SESSION_INVALID: Client not connected for session');
    }
    try {
      await rawClient.sendMessage(jobData.chatId, jobData.caption || '');
      console.log(`[MediaWorker] Text job ${job.id} completed successfully`);
      return;
    } catch (err) {
      throw new Error(`SEND_FAILED: ${extractErrorMessage(err)}`);
    }
  }

  const mediaJob = jobData as MediaMessageJob;
  const idempotency = new IdempotencyManager(redis);
  const cb = new CircuitBreaker(redis, mediaJob.sessionId);
  const cache = new MediaCacheService(redis);
  const metrics = new MetricsService(redis);

  // 1. Idempotency Check
  let lockStatus = await idempotency.checkAndLock(job.id!, mediaJob.sessionId, mediaJob.mediaUrl);
  
  if (process.env.CHAOS_MODE === 'true') {
    try {
      const { ChaosEngine } = await import('./ChaosEngine.js');
      // 3. Duplication Attack simulation
      if (await ChaosEngine.isFailureActive('DUPLICATION')) {
        console.log(`[ChaosEngine] DUPLICATION chaos active. Bypassing idempotency lock check.`);
        lockStatus = 'PROCEED';
      }
    } catch (e) {}
  }

  if (lockStatus === 'SKIP') {
    console.log(`[Idempotency] Duplicate media send detected for job ${job.id}. Skipping execution.`);
    return;
  }

  try {
    // 2. Circuit Breaker Check
    const cbState = await cb.checkState();
    if (cbState === 'OPEN') {
      console.warn(`[CircuitBreaker] Circuit for session ${mediaJob.sessionId} is OPEN. Failing job ${job.id} immediately.`);
      await metrics.increment('circuit_breaker_open_total', 1);
      throw new Error('SESSION_INVALID: Circuit Breaker is OPEN');
    }

    if (!rawClient) {
      throw new Error('SESSION_INVALID: Client not connected');
    }
    const clientAdapter = new WhatsAppClient(rawClient);

    // 3. Resolve Media (Cache or Preprocess)
    let mediaInfo;
    let downloadDurationMs = 0;
    const preprocessStart = Date.now();
    
    const cachedMedia = await cache.get(mediaJob.mediaUrl);
    if (cachedMedia) {
      console.log(`[MediaCache] Cache hit for URL: ${mediaJob.mediaUrl}`);
      mediaInfo = cachedMedia;
      await metrics.increment('media_cache_hit_total', 1);
    } else {
      console.log(`[MediaCache] Cache miss for URL: ${mediaJob.mediaUrl}. Downloading...`);
      const downloadStart = Date.now();
      mediaInfo = await MediaPreprocessor.downloadAndValidate(
        mediaJob.type,
        mediaJob.mediaUrl,
        mediaJob.mimeType,
        mediaJob.fileName
      );
      downloadDurationMs = Date.now() - downloadStart;
      await metrics.recordLatency('media_download_latency_ms', downloadDurationMs);
      
      const toCache: any = {
        mimeType: mediaInfo.mimeType,
        fileName: mediaInfo.fileName
      };
      if (mediaInfo.bufferBase64) toCache.bufferBase64 = mediaInfo.bufferBase64;
      if (mediaInfo.localPath) toCache.localPath = mediaInfo.localPath;
      await cache.set(mediaJob.mediaUrl, toCache);
    }

    const processingDuration = Date.now() - preprocessStart;
    await metrics.recordLatency('media_processing_duration_ms', processingDuration);

    // 4. Dispatch Media
    console.log(`[MediaWorker] Sending ${mediaJob.type} to ${mediaJob.chatId}`);
    const sendStart = Date.now();
    
    if (mediaJob.type === 'IMAGE') {
      await clientAdapter.sendImage(mediaJob.chatId, mediaInfo, mediaJob.caption);
    } else if (mediaJob.type === 'VIDEO') {
      await clientAdapter.sendVideo(mediaJob.chatId, mediaInfo, mediaJob.caption);
    } else if (mediaJob.type === 'DOCUMENT') {
      await clientAdapter.sendDocument(mediaJob.chatId, mediaInfo, mediaJob.fileName);
    }

    const sendLatency = Date.now() - sendStart;
    await metrics.recordLatency('media_send_latency_ms', sendLatency);
    await metrics.increment('media_send_success_total', 1);
    
    // Record Success
    await cb.recordSuccess();
    await idempotency.markSuccess(job.id!, mediaJob.sessionId, mediaJob.mediaUrl);

    // Structured Telemetry Log
    const totalDuration = Date.now() - startTime;
    console.log(JSON.stringify({
      jobId: job.id,
      type: mediaJob.type,
      mediaType: mediaJob.type,
      duration: totalDuration,
      status: 'SUCCESS'
    }));

    // Chaos Mode Structured Observability Logging
    if (process.env.CHAOS_MODE === 'true') {
      try {
        const { ChaosEngine } = await import('./ChaosEngine.js');
        const scenario = await ChaosEngine.getScenario();
        console.log(JSON.stringify({
          eventType: 'JOB_PROCESSED',
          jobId: job.id,
          latency: totalDuration,
          queueLag: Date.now() - job.timestamp,
          systemMode: scenario,
          chaosActive: true
        }));
      } catch (e) {}
    }

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    await metrics.increment('media_send_failure_total', 1);
    await metrics.recordLatency('media_total_pipeline_latency_ms', totalDuration);

    // Record Circuit Breaker Failure
    await cb.recordFailure();

    // Release Lock
    await idempotency.markFailed(job.id!, mediaJob.sessionId, mediaJob.mediaUrl);

    const errorMsg = error.message || String(error);
    let failureReason = 'UNKNOWN_ERROR';
    if (errorMsg.includes('DOWNLOAD_FAILED')) failureReason = 'DOWNLOAD_FAILED';
    else if (errorMsg.includes('UNSUPPORTED_FORMAT') || errorMsg.includes('limit')) failureReason = 'VALIDATION_FAILED';
    else if (errorMsg.includes('SESSION_INVALID') || errorMsg.includes('Circuit Breaker is OPEN') || errorMsg.includes('not connected')) failureReason = 'WHATSAPP_SESSION_INVALID';
    else if (errorMsg.includes('TIMEOUT') || errorMsg.includes('timeout')) failureReason = 'SEND_TIMEOUT';

    console.error(JSON.stringify({
      jobId: job.id,
      type: mediaJob.type,
      mediaType: mediaJob.type,
      duration: totalDuration,
      status: 'FAILED',
      errorCode: failureReason
    }));

    // Chaos Mode Structured Observability Logging
    if (process.env.CHAOS_MODE === 'true') {
      try {
        const { ChaosEngine } = await import('./ChaosEngine.js');
        const scenario = await ChaosEngine.getScenario();
        console.log(JSON.stringify({
          eventType: 'JOB_FAILED',
          jobId: job.id,
          failureType: failureReason,
          latency: totalDuration,
          queueLag: Date.now() - job.timestamp,
          systemMode: scenario,
          chaosActive: true
        }));
      } catch (e) {}
    }

    // Record Telemetry
    await metrics.increment('media_retry_total', 1);

    const maxAttempts = job.opts.attempts || 1;
    const currentAttempt = job.attemptsMade + 1;

    if (currentAttempt >= maxAttempts) {
      console.warn(`[MediaWorker] Job ${job.id} failed after maximum retry attempts (${maxAttempts}). Routing to DLQ.`);
      
      const queue = new Queue(job.queueName, { connection: redis });
      const waitingJobs = await queue.getJobs(['waiting'], 0, 0, true);
      let queueLag = 0;
      if (waitingJobs.length > 0) {
        queueLag = Date.now() - (waitingJobs[0]?.timestamp || Date.now());
      }

      try {
        await metrics.increment('media_dlq_total', 1);
        await metrics.recordDLQSpike();

        // MongoDB DLQ Enrichment
        await db.whatsAppMediaDLQ.create({
          data: {
            id: crypto.randomUUID(),
            jobId: job.id!,
            sessionId: mediaJob.sessionId,
            mediaType: mediaJob.type,
            failureReason,
            stackTrace: error.stack || errorMsg,
            retryCount: job.attemptsMade,
            lastKnownLatency: totalDuration,
            queueLagSnapshot: queueLag,
            timestamp: new Date()
          }
        });

        // Backward compatibility whatsAppMessage logging
        await db.whatsAppMessage.create({
          data: {
            userId: mediaJob.sessionId,
            chatId: mediaJob.chatId,
            direction: 'OUTGOING',
            status: 'FAILED',
            type: mediaJob.type.toLowerCase(),
            body: `[Media send failed]: ${errorMsg}`,
            error: failureReason,
            timestamp: new Date()
          }
        });
      } catch (dbErr) {
        console.error('Failed to log DLQ message in database:', dbErr);
      }
    }

    throw new Error(`${failureReason}: ${errorMsg}`);
  }
}

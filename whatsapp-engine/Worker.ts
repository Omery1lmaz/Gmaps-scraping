import { Worker, Job, Queue } from 'bullmq';
import crypto from 'crypto';
import Redis from 'ioredis';
import { WhatsAppSessionManager } from './SessionManager.js';
import { WhatsAppService, formatPhoneToJid } from './WhatsAppService.js';
import { AntiBanService } from './AntiBan.js';
import db from './mongoService.js';
import whatsappWeb from 'whatsapp-web.js';
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

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRecord = rateLimitStore.get(userId);
  
  if (!userRecord) {
    rateLimitStore.set(userId, { count: 1, timestamps: [now] });
    return true;
  }
  
  userRecord.timestamps = userRecord.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (userRecord.timestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }
  
  userRecord.count = userRecord.timestamps.length + 1;
  userRecord.timestamps.push(now);
  return true;
}

export function setupWorkers(sessionManager: WhatsAppSessionManager) {
  const service = new WhatsAppService(sessionManager);
  const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  // 1. Single Message Worker (High Priority)
  const singleWorker = new Worker('single-messages', async (job: Job) => {
    if (job.name === 'send-whatsapp-chat-message') {
      return processWhatsAppChatMessage(job, sessionManager, service);
    }
    if (job.name === 'sync-whatsapp-history') {
      return service.syncHistory(job.data.userId);
    }
    return processSendMessage(job, sessionManager, service);
  }, { connection: redisConnection, concurrency: 1 });

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

      for (const cl of pendingLeads) {
        // Update to QUEUED
        await db.campaignLead.update({
          where: { id: cl.id },
          data: { status: 'QUEUED' }
        });

        // Add individual send job
        await campaignQueue.add('send-campaign-message', {
          campaignLeadId: cl.id,
          campaignId: cl.campaignId,
          leadId: cl.leadId,
          templateId: campaign.templateId,
          userId: campaign.userId
        });
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

async function processSequenceStep(job: Job, sessionManager: WhatsAppSessionManager, service: WhatsAppService) {
  const { leadSequenceStateId } = job.data;
  console.log(`[SequenceWorker] === STARTING processSequenceStep for state: ${leadSequenceStateId} ===`);
  const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  const sequenceQueue = new Queue('sequence-messages', { connection: redisConnection });

  try {
    console.log(`[SequenceWorker] Fetching state ${leadSequenceStateId} from DB`);
    const state = await db.sequenceState.findUnique({
      where: { id: leadSequenceStateId }
    });

    if (!state) {
      console.warn(`[SequenceWorker] State ${leadSequenceStateId} not found in DB!`);
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
    const lead = await db.lead.findUnique({ where: { id: leadIdStr } });

    if (!sequence) {
      console.error(`[SequenceWorker] Sequence ${sequenceIdStr} not found for state ${state.id}! Cleaning up orphaned state.`);
      await db.sequenceState.delete({ where: { id: state.id } });
      return;
    }
    if (!lead) {
      console.error(`[SequenceWorker] Lead ${leadIdStr} not found for state ${state.id}! Cleaning up orphaned state.`);
      await db.sequenceState.delete({ where: { id: state.id } });
      return;
    }
    
    console.log(`[SequenceWorker] Sequence: ${sequence.name}, Lead: ${lead.businessName || lead.name}`);
    const steps = sequence.steps || [];
    console.log(`[SequenceWorker] Total steps in sequence: ${steps.length}`);

    const resolvedUserId = sequence.userId ? sequence.userId.toString() : 'mock-admin-user-id';

    // Check Sequence Schedule
    console.log(`[SequenceWorker] Checking schedule constraints`);
    if (!isWithinSequenceSchedule(sequence, state.isForced)) {
      console.log(`[SequenceWorker] Outside sequence schedule. Rescheduling in DB...`);
      await db.sequenceState.update({
        where: { id: state.id },
        data: { nextRunAt: new Date(Date.now() + 3600000), status: 'ACTIVE', isForced: false }
      });
      return;
    }

    console.log(`[SequenceWorker] Checking rate limits for user ${resolvedUserId}`);
    if (!checkRateLimit(resolvedUserId)) {
      console.warn(`[SequenceWorker] Rate limited for user ${resolvedUserId}. Re-scheduling sequence step in DB.`);
      await db.sequenceState.update({
        where: { id: state.id },
        data: { nextRunAt: new Date(Date.now() + 60000), status: 'ACTIVE' }
      });
      return;
    }

    const currentStepIndex = state.currentStepIndex;
    const nextStep = steps[currentStepIndex];
    console.log(`[SequenceWorker] Current step index: ${currentStepIndex}`);

    if (!nextStep) {
      console.log(`[SequenceWorker] No steps remaining. Marking sequence state ${state.id} as COMPLETED.`);
      await db.sequenceState.update({
        where: { id: state.id },
        data: { status: 'COMPLETED' }
      });
      return;
    }

    // 1. Send Message (Reuse logic or similar)
    console.log(`[SequenceWorker] Getting WA client for user: ${resolvedUserId}`);
    const client = sessionManager.getClient(resolvedUserId);
    if (!client) {
      console.error(`[SequenceWorker] WhatsApp client not found for user: ${resolvedUserId}`);
      throw new Error('WhatsApp Client offline');
    }

    console.log(`[SequenceWorker] Fetching message template ${nextStep.templateId}`);
    const template = await db.messageTemplate.findUnique({ where: { id: nextStep.templateId } });
    if (!template) {
      console.error(`[SequenceWorker] Template ${nextStep.templateId} not found in DB!`);
      throw new Error('Template missing');
    }

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

    const delay = AntiBanService.getRandomDelay();
    console.log(`[SequenceWorker] Waiting ${delay}ms (Anti-Ban delay) before sending...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    let targetJid = formatPhoneToJid(lead.phone || '');
    console.log(`[SequenceWorker] Formatted phone to targetJid: ${targetJid}`);
    if (targetJid.endsWith('@c.us')) {
      const numberToResolve = targetJid.split('@')[0];
      try {
        console.log(`[SequenceWorker] Resolving JID for ${numberToResolve}`);
        const registered = await client.getNumberId(numberToResolve);
        if (registered && registered._serialized) {
          targetJid = registered._serialized;
          console.log(`[SequenceWorker] JID resolved successfully: ${targetJid}`);
        } else {
          console.log(`[SequenceWorker] getNumberId returned null for ${numberToResolve}, keeping original targetJid`);
        }
      } catch (err) {
        console.error(`[SequenceWorker] Failed to resolve JID:`, err);
      }
    }

    console.log(`[SequenceWorker] Sending message to ${targetJid} with content preview: "${content.substring(0, 30)}..."`);
    const message = await client.sendMessage(targetJid, content);
    console.log(`[SequenceWorker] Message sent successfully! ID: ${message.id._serialized}`);

    // 2. Update State
    const nextStepIndex = currentStepIndex + 1;
    const hasMoreSteps = steps.length > nextStepIndex;
    
    let nextRunAt = null;
    if (hasMoreSteps) {
      const nextDelayStep = steps[nextStepIndex];
      const delayMs = (nextDelayStep?.delayHours || 24) * 3600000;
      nextRunAt = new Date(Date.now() + delayMs);
      console.log(`[SequenceWorker] Scheduled next step in ${nextDelayStep?.delayHours}h (nextRunAt: ${nextRunAt.toISOString()})`);
    }

    console.log(`[SequenceWorker] Updating sequence state in DB...`);
    await db.sequenceState.update({
      where: { id: state.id },
      data: {
        currentStepIndex: nextStepIndex,
        lastSentAt: new Date(),
        status: hasMoreSteps ? 'ACTIVE' : 'COMPLETED',
        nextRunAt: nextRunAt,
        isForced: false
      }
    });
    console.log(`[SequenceWorker] Sequence state updated successfully.`);

    // 3. Log
    console.log(`[SequenceWorker] Creating message log entry...`);
    await db.messageLog.create({
      data: {
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
        where: { jid: targetJid },
        update: {
          lastMessageAt: new Date(),
          lastMessagePreview: content,
          leadId: lead.id,
        },
        create: {
          id: crypto.randomUUID(),
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
        data: { status: 'FAILED' }
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

  const resolvedUserId = userId || 'mock-admin-user-id';
  
  if (!checkRateLimit(resolvedUserId)) {
    console.warn(`[SingleWorker] Rate limited for user ${resolvedUserId}. Re-queuing job ${job.id}`);
    const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('single-messages', { connection: redisConnection });
    await queue.add('send-message', job.data, { delay: 60000 });
    return;
  }
  
  try {
    const client = sessionManager.getClient(resolvedUserId);
    if (!client) throw new Error(`Client not found for ${resolvedUserId}`);

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead?.phone) throw new Error('No phone number');

    let targetJid = formatPhoneToJid(lead.phone);
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

    // Anti-ban: Small random delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));

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

  const resolvedUserId = userId || 'mock-admin-user-id';

  if (!checkRateLimit(resolvedUserId)) {
    console.warn(`[WhatsAppChatWorker] Rate limited for user ${resolvedUserId}. Re-queuing job ${job.id}`);
    const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('single-messages', { connection: redisConnection });
    await queue.add('send-whatsapp-chat-message', job.data, { delay: 60000 });
    return;
  }

  try {
    const client = sessionManager.getClient(resolvedUserId);
    if (!client) {
      throw new Error(`WhatsApp istemcisi bağlı değil (userId: ${resolvedUserId}). Lütfen önce WhatsApp bağlantınızı kontrol edin.`);
    }

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
      },
    });

    try {
      // If the JID was resolved to a different format (like @lid), update the DB to prevent duplicate chats
      if (targetJid !== chatJid) {
        const existingTarget = await db.whatsAppChat.findFirst({ where: { jid: targetJid } });
        if (existingTarget) {
           await db.whatsAppChat.deleteMany({ where: { jid: chatJid } });
        } else {
           await db.whatsAppChat.updateMany({ where: { jid: chatJid }, data: { jid: targetJid } });
        }
      }

      await db.whatsAppChat.upsert({
        where: { jid: targetJid },
        update: {
          lastMessageAt: updated?.timestamp || new Date(),
          lastMessagePreview: content || mediaFileName || 'Media',
        },
        create: {
          id: require('crypto').randomUUID(),
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

  const resolvedUserId = userId || 'mock-admin-user-id';

  if (!checkRateLimit(resolvedUserId)) {
    console.warn(`[CampaignWorker] Rate limited for user ${resolvedUserId}. Re-queuing campaign job ${job.id}`);
    const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('campaign-messages', { connection: redisConnection });
    await queue.add('send-campaign-message', job.data, { delay: 60000 });
    return;
  }

  try {
    // 1. Check Campaign Status (Stop if paused/stopped)
    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'RUNNING') {
      console.log(`[CampaignWorker] Campaign ${campaignId} is not RUNNING. Skipping.`);
      return;
    }

    // 2. Anti-Ban Checks
    const canSend = await AntiBanService.checkDailyLimit(resolvedUserId);
    if (!canSend) {
      console.log(`[CampaignWorker] Daily limit reached for ${resolvedUserId}. Pausing campaign.`);
      await db.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
      return;
    }

    const health = await AntiBanService.getHealthScore(resolvedUserId);
    if (health < 40) {
      console.log(`[CampaignWorker] Low health score (${health}). Pausing campaign.`);
      await db.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
      return;
    }

    // 3. Client Check
    const client = sessionManager.getClient(resolvedUserId);
    if (!client) throw new Error('WhatsApp Client offline');

    const lead = await db.lead.findUnique({ where: { id: leadId } });
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

    // 5. Randomized Delay (Anti-Ban v2)
    const delay = AntiBanService.getRandomDelay();
    console.log(`[CampaignWorker] Safe delay: ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // 6. Send
    let targetJid = formatPhoneToJid(lead.phone);
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
    
    // Typing simulation
    try {
      const chat = await client.getChatById(targetJid);
      await chat.sendStateTyping();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await chat.clearState();
    } catch(err) {
      // ignore typing errors
    }

    const message = await client.sendMessage(targetJid, content);

    // 7. Success Logging
    const log = await db.messageLog.create({
      data: {
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
        where: { jid: targetJid },
        update: {
          lastMessageAt: new Date(),
          lastMessagePreview: content,
          leadId: lead.id,
        },
        create: {
          id: crypto.randomUUID(),
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
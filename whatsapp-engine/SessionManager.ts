import whatsappWeb from 'whatsapp-web.js';
import { Server } from 'socket.io';
import db from './mongoService.js';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { generateAiReply } from './aiUtility.js';

const { Client, LocalAuth, Events } = whatsappWeb as any;
const MEDIA_DIR = process.env.WHATSAPP_MEDIA_DIR || path.join(process.cwd(), 'media', 'whatsapp');

export class WhatsAppSessionManager {
  private clients: Map<string, any> = new Map();
  private activeSyncs: Set<string> = new Set();
  private reconnectionAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.initialize();
    this.startBackgroundSync();
  }

  private startBackgroundSync() {
    // Run every 15 minutes
    setInterval(async () => {
      console.log('[Background-Sync] Starting periodic sync for all active sessions...');
      for (const [sessionId, client] of this.clients.entries()) {
        try {
          const state = await client.getState();
          if (state === 'CONNECTED') {
            console.log(`[Background-Sync] Syncing session: ${sessionId}`);
            this.syncHistory(sessionId).catch(err => console.error(`Sync failed for ${sessionId}:`, err));
          }
        } catch (e) {
          console.error(`[Background-Sync] Failed to check status for ${sessionId}:`, e);
        }
      }
    }, 15 * 60 * 1000);
  }

  private cleanupSingletonLocks(sessionPath: string) {
    try {
      const lockFiles = [
        path.join(sessionPath, 'SingletonLock'),
        path.join(sessionPath, 'SingletonCookie'),
        path.join(sessionPath, 'SingletonSocket')
      ];

      for (const lockFile of lockFiles) {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
          console.log(`Removed ${lockFile}`);
        }
      }
    } catch (error) {
      console.warn(`Error cleaning up singleton locks: ${error}`);
    }
  }

  private async safeCallClientMethod(sessionId: string, client: any, method: 'logout' | 'destroy') {
    if (!client || typeof client[method] !== 'function') return;

    try {
      await client[method]();
    } catch (err: any) {
      const message = err?.message ? String(err.message) : String(err);
      const isAlreadyClosed =
        message.includes("Cannot read properties of null") ||
        message.includes('Target closed') ||
        message.includes('Session closed') ||
        message.includes('Protocol error');

      if (isAlreadyClosed) {
        console.warn(`WhatsApp client ${method} skipped for session ${sessionId}; browser session was already closed: ${message}`);
        return;
      }

      throw err;
    }
  }

  private normalizePhone(value: string) {
    return String(value || '').replace(/\D/g, '');
  }

  private async findLeadForJid(userId: string, jid: string) {
    const phone = this.normalizePhone(jid);
    if (!phone) return null;
    const last10 = phone.slice(-10);

    return db.lead.findFirst({
      where: {
        userId,
        OR: [
          { phone: { contains: phone } },
          ...(last10 ? [{ phone: { contains: last10 } }] : []),
        ],
      },
    });
  }

  private async saveMedia(userId: string, rawMessage: any, messageId: string, direction: string) {
    if (!rawMessage?.hasMedia || typeof rawMessage.downloadMedia !== 'function') return null;

    try {
      const media = await rawMessage.downloadMedia();
      if (!media?.data || !media?.mimetype) return null;

      const subdir = direction === 'INCOMING' ? 'incoming' : 'outgoing';
      const dir = path.join(MEDIA_DIR, subdir);
      await fsp.mkdir(dir, { recursive: true });
      const extension = media.filename ? path.extname(media.filename) : '';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension || ''}`;
      const localPath = path.join(dir, fileName);
      const buffer = Buffer.from(media.data, 'base64');
      await fsp.writeFile(localPath, buffer);

      return db.whatsAppMedia.create({
        data: {
          messageId,
          userId,
          fileName: media.filename || fileName,
          mimeType: media.mimetype,
          size: buffer.length,
          localPath,
          publicUrl: `/media/whatsapp/${subdir}/${fileName}`,
        },
      });
    } catch (error) {
      console.warn('Failed to save WhatsApp media:', error);
      return null;
    }
  }

  private async upsertChatFromRaw(sessionId: string, userId: string, rawChat: any, fallbackJid?: string) {
    const jid = rawChat?.id?._serialized || fallbackJid;
    if (!jid) throw new Error('WhatsApp chat JID is missing');
    const phone = this.normalizePhone(jid);
    const lead = await this.findLeadForJid(userId, jid);

    let contact = null;
    if (!rawChat?.isGroup) {
      contact = await db.whatsAppContact.upsert({
        where: { userId, jid },
        update: {
          userId,
          phone: phone || null,
          name: rawChat?.name || undefined,
          pushName: rawChat?.contact?.pushname || undefined,
          shortName: rawChat?.contact?.shortName || undefined,
          isBusiness: Boolean(rawChat?.contact?.isBusiness),
          leadId: lead?.id || null,
        },
        create: {
          id: `${userId}:${jid}`,
          userId,
          jid,
          phone: phone || null,
          name: rawChat?.name || phone || jid,
          pushName: rawChat?.contact?.pushname || null,
          shortName: rawChat?.contact?.shortName || null,
          isBusiness: Boolean(rawChat?.contact?.isBusiness),
          leadId: lead?.id || null,
        },
      });
    }

    const lastMessage = rawChat?.lastMessage;
    const lastTimestamp = lastMessage?.timestamp ? new Date(lastMessage.timestamp * 1000) : null;
    const lastPreview = lastMessage?.body || (lastMessage?.hasMedia ? 'Media' : null);

    return db.whatsAppChat.upsert({
      where: { userId, sessionId, jid },
      update: {
        userId,
        sessionId,
        name: rawChat?.name || contact?.name || phone || jid,
        isGroup: Boolean(rawChat?.isGroup),
        isArchived: Boolean(rawChat?.archived),
        isPinned: Boolean(rawChat?.pinned),
        isMuted: Boolean(rawChat?.isMuted),
        unreadCount: Number(rawChat?.unreadCount || 0),
        lastMessageAt: lastTimestamp,
        lastMessagePreview: lastPreview,
        contactId: contact?.id || null,
        leadId: lead?.id || null,
      },
      create: {
        id: `${userId}:${sessionId}:${jid}`,
        userId,
        sessionId,
        jid,
        name: rawChat?.name || contact?.name || phone || jid,
        isGroup: Boolean(rawChat?.isGroup),
        isArchived: Boolean(rawChat?.archived),
        isPinned: Boolean(rawChat?.pinned),
        isMuted: Boolean(rawChat?.isMuted),
        unreadCount: Number(rawChat?.unreadCount || 0),
        lastMessageAt: lastTimestamp,
        lastMessagePreview: lastPreview,
        contactId: contact?.id || null,
        leadId: lead?.id || null,
      },
    });
  }

  private async persistWhatsAppMessage(sessionId: string, userId: string, rawMessage: any, rawChat?: any) {
    const chat = await this.upsertChatFromRaw(sessionId, userId, rawChat, rawMessage?.fromMe ? rawMessage?.to : rawMessage?.from);
    const whatsappMessageId = rawMessage?.id?._serialized;
    if (whatsappMessageId) {
      const existing = await db.whatsAppMessage.findFirst({
        where: { userId, sessionId, whatsappMessageId },
      });
      if (existing) return existing;
    }

    const direction = rawMessage?.fromMe ? 'OUTGOING' : 'INCOMING';
    const status = direction === 'INCOMING' ? 'READ' : 'SENT';
    const timestamp = rawMessage?.timestamp ? new Date(rawMessage.timestamp * 1000) : new Date();

    const type = rawMessage?.type || (rawMessage?.hasMedia ? 'media' : 'text');
    const message = await db.whatsAppMessage.create({
      data: {
        whatsappMessageId,
        userId,
        sessionId,
        chatId: chat.jid || chat.id,
        leadId: chat.leadId,
        direction,
        status,
        type,
        body: rawMessage?.body || '',
        fromJid: rawMessage?.from || null,
        toJid: rawMessage?.to || null,
        authorJid: rawMessage?.author || null,
        timestamp,
      },
    });

    await this.saveMedia(userId, rawMessage, message.id, direction);
    await db.whatsAppChat.update({
      where: { id: chat.id },
      data: {
        lastMessageAt: timestamp,
        lastMessagePreview: rawMessage?.body || (rawMessage?.hasMedia ? 'Media' : ''),
      },
    });

    const saved = await db.whatsAppMessage.findUnique({
      where: { id: message.id },
    });
    return saved || message;
  }

  public async syncHistory(sessionId: string) {
    const client = this.clients.get(sessionId);
    if (!client) throw new Error(`WhatsApp client is not connected for session ${sessionId}`);

    const sessionRecord = await db.whatsAppSession.findUnique({ where: { id: sessionId } });
    const userId = sessionRecord ? sessionRecord.userId : sessionId;

    if (this.activeSyncs.has(sessionId)) return;

    this.activeSyncs.add(sessionId);
    await db.whatsAppSyncState.upsert({
      where: { userId, sessionId },
      update: {
        status: 'RUNNING',
        syncedChats: 0,
        totalMessages: 0,
        error: null,
        startedAt: new Date(),
        finishedAt: null,
      },
      create: {
        id: sessionId,
        userId,
        sessionId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
    this.io.to(userId).emit('sync_status', { sessionId, status: 'RUNNING' });

    try {
      const chats = await client.getChats();
      await db.whatsAppSyncState.update({
        where: { id: sessionId },
        data: { totalChats: chats.length },
      });

      let totalMessages = 0;
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];
        const chatName = chat?.name || chat?.id?._serialized || `Chat ${i + 1}`;
        await this.upsertChatFromRaw(sessionId, userId, chat);

        try {
          const messages = await chat.fetchMessages({ limit: 500 });
          totalMessages += messages.length;

          for (let m = 0; m < messages.length; m++) {
            const message = messages[m];
            await this.persistWhatsAppMessage(sessionId, userId, message, chat);

            if (m % 10 === 0 || m === messages.length - 1) {
              await db.whatsAppSyncState.update({
                where: { id: sessionId },
                data: {
                  syncedChats: i + 1,
                  totalMessages,
                  lastChatName: chatName,
                  syncedMessagesInChat: m + 1,
                  totalMessagesInChat: messages.length,
                },
              });
              this.io.to(userId).emit('sync_status', {
                sessionId,
                status: 'RUNNING',
                totalChats: chats.length,
                syncedChats: i + 1,
                lastChatName: chatName,
                totalMessages,
                syncedMessagesInChat: m + 1,
                totalMessagesInChat: messages.length,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to sync chat ${chatName}:`, error);
          this.io.to(userId).emit('sync_status', {
            sessionId,
            status: 'RUNNING',
            totalChats: chats.length,
            syncedChats: i + 1,
            lastChatName: chatName,
            totalMessages,
            error: `Failed to sync ${chatName}`,
          });
        }

        await db.whatsAppSyncState.update({
          where: { id: sessionId },
          data: { syncedChats: i + 1, totalMessages, lastChatName: chatName },
        });
        this.io.to(userId).emit('sync_status', {
          sessionId,
          status: 'RUNNING',
          totalChats: chats.length,
          syncedChats: i + 1,
          lastChatName: chatName,
          totalMessages,
        });
      }

      await db.whatsAppSyncState.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', totalMessages, finishedAt: new Date() },
      });
      this.io.to(userId).emit('sync_status', { sessionId, status: 'COMPLETED', totalMessages });
    } catch (error: any) {
      await db.whatsAppSyncState.update({
        where: { id: sessionId },
        data: { status: 'FAILED', error: error?.message || String(error), finishedAt: new Date() },
      });
      this.io.to(userId).emit('sync_status', { sessionId, status: 'FAILED', error: error?.message || String(error) });
      throw error;
    } finally {
      this.activeSyncs.delete(sessionId);
    }
  }

  private async initialize() {
    console.log('Initializing WhatsApp Session Manager...');
    
    // Restore existing connected sessions from DB.
    try {
      const sessions = await db.whatsAppSession.findMany({});
      for (const session of sessions) {
        if (session.status === 'CONNECTED' || session.status === 'AUTHENTICATED') {
          console.log(`Restoring session for user: ${session.userId}, session: ${session.id || session._id}`);
          this.createClient(session.id || session._id, session.userId).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Failed to restore sessions during SessionManager initialization:', error);
    }
  }

  public async createClient(sessionId: string, userId?: string) {
    if (this.clients.has(sessionId)) {
      console.log(`Client for session ${sessionId} already exists.`);
      return this.clients.get(sessionId);
    }

    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const session = await db.whatsAppSession.findUnique({ where: { id: sessionId } });
      if (session) {
        resolvedUserId = session.userId;
      } else {
        resolvedUserId = sessionId; // legacy fallback
      }
    }

    console.log(`Creating new WhatsApp client for session: ${sessionId} (user: ${resolvedUserId})`);

    // Ensure session directory exists
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${sessionId}`);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    this.cleanupSingletonLocks(sessionPath);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionId,
        dataPath: path.join(process.cwd(), '.wwebjs_auth')
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-extensions',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ],
      }
    });

    client.on('error', (err: any) => {
      const message = err?.message ? String(err.message) : String(err);
      console.error(`WhatsApp client error for session ${sessionId}:`, message);
      this.io.to(resolvedUserId!).emit('wa_error', { sessionId, message });
      this.io.to(resolvedUserId!).emit('error', { sessionId, message });
      this.updateSessionStatus(sessionId, 'ERROR', resolvedUserId!, message).catch(() => { });
    });

    this.setupEventListeners(sessionId, client, resolvedUserId!);
    client.initialize().catch((err: any) => {
      const message = err?.message ? String(err.message) : String(err);
      console.error(`Error initializing client for session ${sessionId}:`, message);
      this.io.to(resolvedUserId!).emit('wa_error', { sessionId, message });
      this.io.to(resolvedUserId!).emit('error', { sessionId, message });
      this.updateSessionStatus(sessionId, 'ERROR', resolvedUserId!, message).catch(() => { });
    });

    this.clients.set(sessionId, client);
    return client;
  }

  public getClient(sessionId: string) {
    return this.clients.get(sessionId);
  }

  private setupEventListeners(sessionId: string, client: any, userId: string) {
    client.on('qr', (qr: any) => {
      console.log(`QR Code generated for session ${sessionId} (user ${userId})`);
      this.io.to(userId).emit('qr', { sessionId, qr });
      this.updateSessionStatus(sessionId, 'QR_READY', userId);
    });

    client.on('authenticated', () => {
      console.log(`User ${userId} session ${sessionId} authenticated`);
      this.io.to(userId).emit('authenticated', { sessionId });
      this.updateSessionStatus(sessionId, 'AUTHENTICATED', userId).catch(() => { });
    });

    client.on('ready', async () => {
      const info = client.info;
      console.log(`WhatsApp client ready for session ${sessionId} (${info.wid.user})`);

      await db.whatsAppSession.upsert({
        where: { id: sessionId },
        update: {
          status: 'CONNECTED',
          phoneNumber: info.wid.user,
          pushName: info.pushname,
          lastConnected: new Date(),
          lastErrorMessage: null,
          lastErrorAt: null,
        },
        create: {
          id: sessionId,
          userId,
          status: 'CONNECTED',
          phoneNumber: info.wid.user,
          pushName: info.pushname,
          lastConnected: new Date(),
          lastErrorMessage: null,
          lastErrorAt: null,
        }
      });

      this.io.to(userId).emit('ready', {
        sessionId,
        phoneNumber: info.wid.user,
        pushName: info.pushname
      });
    });

    client.on('disconnected', async (reason: any) => {
      console.log(`User ${userId} session ${sessionId} disconnected: ${reason}`);
      await this.updateSessionStatus(sessionId, 'DISCONNECTED', userId);
      this.io.to(userId).emit('disconnected', { sessionId, reason });
      this.reconnectClient(sessionId).catch(() => { });

      if (reason === 'NAVIGATION') {
        this.destroyClient(sessionId);
      }
    });

    client.on('auth_failure', (msg: any) => {
      console.error(`Auth failure for session ${sessionId} user ${userId}: ${msg}`);
      const message = msg ? String(msg) : 'Authentication failed';
      this.io.to(userId).emit('wa_error', { sessionId, message });
      this.io.to(userId).emit('error', { sessionId, message });
      this.updateSessionStatus(sessionId, 'ERROR', userId, message);
    });

    client.on('message_ack', async (msg: any, ack: any) => {
      const statusMap: Record<number, string> = {
        2: 'SENT',
        3: 'DELIVERED',
        4: 'READ'
      };

      if (statusMap[ack]) {
        await db.messageLog.updateMany({
          where: { userId, messageId: msg.id._serialized },
          data: { status: statusMap[ack] }
        });
        await db.whatsAppMessage.updateMany({
          where: { userId, sessionId, whatsappMessageId: msg.id._serialized },
          data: { status: statusMap[ack] }
        });

        const log = await db.messageLog.findFirst({ where: { userId, messageId: msg.id._serialized } });
        if (log) {
          this.io.to(userId).emit('message_status', {
            sessionId,
            logId: log.id,
            status: statusMap[ack],
            leadId: log.leadId
          });
        }
      }
    });

    client.on('message_create', async (msg: any) => {
      if (msg.from.endsWith('@c.us') || msg.from.endsWith('@g.us') || msg.from.endsWith('@lid')) {
        const phone = (msg.fromMe ? msg.to : msg.from).split('@')[0];
        console.log(`[Message-Event] ${msg.fromMe ? 'Outgoing' : 'Incoming'} message for ${phone} in session ${sessionId}: ${msg.body?.substring(0, 30)}`);
        
        const rawChat = typeof msg.getChat === 'function' ? await msg.getChat() : undefined;
        const savedMessage = await this.persistWhatsAppMessage(sessionId, userId, msg, rawChat);
        
        // Lead finding and automation logic ONLY for INCOMING messages
        if (!msg.fromMe) {
          let lead = await db.lead.findFirst({
            where: { userId, phone: { contains: phone } }
          });

          // AUTO-DISCOVERY FOR UNKNOWN NUMBERS
          if (!lead) {
            console.log(`[Auto-Discovery] Unknown contact detected: ${phone}. Calling discovery endpoint...`);
            try {
              const axios = (await import('axios')).default;
              const serverUrl = process.env.SERVER_URL || 'http://api:3001';
              const apiKey = process.env.API_KEY;

              const discRes = await axios.post(`${serverUrl}/api/leads/discover`, {
                phone,
                message: msg.body,
                sessionId
              }, {
                headers: { 'x-api-key': apiKey }
              });

              if (discRes.data.success) {
                lead = discRes.data.lead;
                console.log(`[Auto-Discovery] New lead created: ${lead!.id}`);
              }
            } catch (discErr) {
              console.error('[Auto-Discovery] Error discovering lead:', discErr);
            }
          }

          if (lead) {
            const log = await db.messageLog.create({
              data: {
                leadId: lead.id,
                userId,
                content: msg.body,
                direction: 'INCOMING',
                status: 'READ',
                messageId: msg.id._serialized
              }
            });

            const activeSequences = await db.sequenceState.findMany({
              where: { userId, leadId: lead.id, status: 'ACTIVE' }
            });

            if (activeSequences.length > 0) {
              for (const state of activeSequences) {
                const sequence = await db.sequence.findUnique({ where: { id: state.sequenceId } });

                if (sequence && sequence.aiReplyEnabled) {
                  console.log(`[AI-Reply] Sequence ${sequence.id} has AI reply enabled for lead ${lead.id}. Generating response...`);
                  try {
                    const replyText = await generateAiReply(lead, msg.body, sequence.aiPrompt || '', userId);
                    if (replyText) {
                      await client.sendMessage(msg.from, replyText);
                      await this.persistWhatsAppMessage(sessionId, userId, {
                        fromMe: true,
                        to: msg.from,
                        body: replyText,
                        timestamp: Math.floor(Date.now() / 1000),
                        type: 'text',
                        id: { _serialized: `ai-reply-${Date.now()}` }
                      }, rawChat);

                      await db.activity.create({
                        data: {
                          leadId: lead.id,
                          userId,
                          type: 'AI_REPLIED',
                          description: `AI automatically replied to message: "${msg.body.substring(0, 30)}..."`
                        }
                      });
                    }
                    await db.sequenceState.update({
                      where: { id: state.id },
                      data: { status: 'STOPPED_BY_REPLY' }
                    });
                  } catch (err) {
                    console.error('[AI-Reply] Error handling AI reply:', err);
                  }
                } else {
                  await db.sequenceState.update({
                    where: { id: state.id },
                    data: { status: 'STOPPED_BY_REPLY' }
                  });
                }
              }

              await db.activity.create({
                data: {
                  leadId: lead.id,
                  userId,
                  type: 'AUTOMATION_STOPPED',
                  description: 'Sequence stopped automatically due to reply.'
                }
              });
            }
            
            this.io.to(userId).emit('incoming_message', {
              sessionId,
              leadId: lead.id,
              businessName: lead.businessName,
              content: msg.body,
              timestamp: new Date()
            });

            // TRIGGER AI INTENT ANALYSIS
            try {
              // We call the backend via fetch or axios to analyze intent
              // Since the server is likely at localhost:3001
              const axios = (await import('axios')).default;
              const serverUrl = process.env.SERVER_URL || 'http://api:3001';
              const apiKey = process.env.API_KEY;

              const analysisRes = await axios.post(`${serverUrl}/api/whatsapp/analyze-intent`, {
                leadId: lead.id,
                message: msg.body
              }, {
                headers: { 'x-api-key': apiKey }
              });

              const analysis = analysisRes.data;
              console.log(`[AI-Intent] Analyzed message for ${lead.businessName}: ${analysis.intent}`);

              if (analysis.intent !== 'UNKNOWN') {
                this.io.to(userId).emit('intent_detected', {
                  leadId: lead.id,
                  businessName: lead.businessName,
                  ...analysis
                });
              }
            } catch (intentErr) {
              console.error('[AI-Intent] Error analyzing intent:', intentErr);
            }
          }
        }

        this.io.to(userId).emit('whatsapp_message', { ...savedMessage, sessionId });
      }
    });

    client.on('call', async (call: any) => {
      console.log(`[Call] Incoming call from ${call.from} in session ${sessionId}`);
      
      const timestamp = new Date();
      const messageId = `call-${call.id}-${timestamp.getTime()}`;
      
      try {
        const chat = await this.getOrCreateChat(sessionId, userId, call.from);
        
        const savedMessage = await db.whatsAppMessage.create({
          data: {
            whatsappMessageId: messageId,
            userId,
            sessionId,
            chatId: chat.jid || chat.id,
            direction: 'INCOMING',
            status: 'READ',
            type: 'call',
            body: 'Cevapsız Arama',
            fromJid: call.from,
            timestamp,
          }
        });

        this.io.to(userId).emit('whatsapp_message', { ...savedMessage, sessionId });
      } catch (err) {
        console.error(`[Call] Error handling call event:`, err);
      }
    });
  }

  private async updateSessionStatus(sessionId: string, status: string, userId: string, errorMessage?: string) {
    await db.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: userId, email: `${userId}@auto-generated.local` }
    });

    const updateData: Record<string, any> = { status };
    const createData: Record<string, any> = {
      userId,
      status,
      lastConnected: status === 'CONNECTED' || status === 'QR_READY' ? new Date() : null,
    };

    if (status === 'ERROR') {
      updateData.lastErrorMessage = errorMessage || 'Unknown error';
      updateData.lastErrorAt = new Date();
      createData.lastErrorMessage = errorMessage || 'Unknown error';
      createData.lastErrorAt = new Date();
    } else if (status === 'QR_READY' || status === 'CONNECTED') {
      updateData.lastErrorMessage = null;
      updateData.lastErrorAt = null;
      createData.lastErrorMessage = null;
      createData.lastErrorAt = null;
    } else {
      updateData.lastErrorMessage = null;
      updateData.lastErrorAt = null;
      createData.lastErrorMessage = null;
      createData.lastErrorAt = null;
    }

    if (status === 'CONNECTED' || status === 'QR_READY') {
      updateData.lastConnected = new Date();
    }

    await db.whatsAppSession.upsert({
      where: { id: sessionId },
      update: updateData,
      create: { ...createData, id: sessionId },
    });
  }

  public async destroyClient(sessionId: string, forceLogout: boolean = false) {
    const client = this.clients.get(sessionId);
    if (client) {
      try {
        if (forceLogout) {
          await this.safeCallClientMethod(sessionId, client, 'logout');
        }
        await this.safeCallClientMethod(sessionId, client, 'destroy');
      } catch (err) {
        console.error(`Error destroying client for session ${sessionId}:`, err);
      } finally {
        this.clients.delete(sessionId);
      }
    }

    const sessionRecord = await db.whatsAppSession.findUnique({ where: { id: sessionId } });
    const userId = sessionRecord ? sessionRecord.userId : sessionId;
    await this.updateSessionStatus(sessionId, 'DISCONNECTED', userId);
  }

  public getStatus(sessionId: string) {
    const client = this.clients.get(sessionId);
    if (!client) return 'DISCONNECTED';
    return client.getState();
  }

  public async sendMessage(
    sessionId: string,
    to: string,
    content: string,
    media?: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const client = this.clients.get(sessionId);
    if (!client) {
      return { success: false, error: 'WhatsApp client not connected' };
    }

    const sessionRecord = await db.whatsAppSession.findUnique({ where: { id: sessionId } });
    const userId = sessionRecord ? sessionRecord.userId : sessionId;

    try {
      let jid = to;
      if (!jid.includes('@')) {
        jid = `${this.normalizePhone(jid)}@c.us`;
      }

      let sentMessage;
      if (media) {
        const { MessageMedia } = whatsappWeb as any;
        const whatsappMedia = MessageMedia.fromFilePath(media.localPath);
        whatsappMedia.mimetype = media.mimeType;
        whatsappMedia.filename = media.fileName;
        sentMessage = await client.sendMessage(jid, whatsappMedia, { caption: content });
      } else {
        sentMessage = await client.sendMessage(jid, content);
      }

      const chat = await this.getOrCreateChat(sessionId, userId, jid);

      await db.whatsAppMessage.create({
        data: {
          userId,
          sessionId,
          chatId: chat?.jid || chat?.id || '',
          direction: 'OUTGOING',
          status: 'SENT',
          type: media ? 'media' : 'text',
          body: content,
          toJid: jid,
          timestamp: new Date(),
          whatsappMessageId: sentMessage?.id?._serialized,
        },
      });

      return { success: true, messageId: sentMessage?.id?._serialized };
    } catch (error: any) {
      console.error(`Error sending message to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  private async getOrCreateChat(sessionId: string, userId: string, jid: string) {
    const phone = this.normalizePhone(jid);
    const lead = await this.findLeadForJid(userId, jid);

    return db.whatsAppChat.upsert({
      where: { userId, sessionId, jid },
      update: {
        userId,
        sessionId,
        lastMessageAt: new Date(),
      },
      create: {
        id: `${userId}:${sessionId}:${jid}`,
        userId,
        sessionId,
        jid,
        name: phone || jid,
        isGroup: false,
        isArchived: false,
        isPinned: false,
        isMuted: false,
        unreadCount: 0,
        lastMessageAt: new Date(),
        contactId: null,
        leadId: lead?.id || null,
      },
    });
  }

  public async reconnectClient(sessionId: string): Promise<boolean> {
    const attempts = this.reconnectionAttempts.get(sessionId) || 0;
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.log(`Max reconnection attempts reached for session ${sessionId}`);
      return false;
    }

    this.reconnectionAttempts.set(sessionId, attempts + 1);
    console.log(`Attempting to reconnect session ${sessionId} (attempt ${attempts + 1})`);

    try {
      await this.destroyClient(sessionId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const sessionRecord = await db.whatsAppSession.findUnique({ where: { id: sessionId } });
      const userId = sessionRecord ? sessionRecord.userId : sessionId;
      await this.createClient(sessionId, userId);
      this.reconnectionAttempts.delete(sessionId);
      return true;
    } catch (error) {
      console.error(`Reconnection failed for session ${sessionId}:`, error);
      return false;
    }
  }
}

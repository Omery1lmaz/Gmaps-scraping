import whatsappWeb from 'whatsapp-web.js';
import { Server } from 'socket.io';
import db from './mongoService.js';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';


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

  private async safeCallClientMethod(userId: string, client: any, method: 'logout' | 'destroy') {
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
        console.warn(`WhatsApp client ${method} skipped for ${userId}; browser session was already closed: ${message}`);
        return;
      }

      throw err;
    }
  }

  private normalizePhone(value: string) {
    return String(value || '').replace(/\D/g, '');
  }

  private async findLeadForJid(jid: string) {
    const phone = this.normalizePhone(jid);
    if (!phone) return null;
    const last10 = phone.slice(-10);

    return db.lead.findFirst({
      where: {
        OR: [
          { phone: { contains: phone } },
          ...(last10 ? [{ phone: { contains: last10 } }] : []),
        ],
      },
    });
  }

  private async saveMedia(rawMessage: any, messageId: string, direction: string) {
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

  private async upsertChatFromRaw(rawChat: any, fallbackJid?: string) {
    const jid = rawChat?.id?._serialized || fallbackJid;
    if (!jid) throw new Error('WhatsApp chat JID is missing');
    const phone = this.normalizePhone(jid);
    const lead = await this.findLeadForJid(jid);

    let contact = null;
    if (!rawChat?.isGroup) {
      contact = await db.whatsAppContact.upsert({
        where: { jid },
        update: {
          phone: phone || null,
          name: rawChat?.name || undefined,
          pushName: rawChat?.contact?.pushname || undefined,
          shortName: rawChat?.contact?.shortName || undefined,
          isBusiness: Boolean(rawChat?.contact?.isBusiness),
          leadId: lead?.id || null,
        },
        create: {
          id: jid,
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
      where: { jid },
      update: {
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
        id: jid,
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

  private async persistWhatsAppMessage(rawMessage: any, rawChat?: any) {
    const chat = await this.upsertChatFromRaw(rawChat, rawMessage?.fromMe ? rawMessage?.to : rawMessage?.from);
    const whatsappMessageId = rawMessage?.id?._serialized;
    if (whatsappMessageId) {
      const existing = await db.whatsAppMessage.findUnique({
        where: { whatsappMessageId },
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
        chatId: chat.id,
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

    await this.saveMedia(rawMessage, message.id, direction);
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

  public async syncHistory(userId: string) {
    const client = this.clients.get(userId);
    if (!client) throw new Error(`WhatsApp client is not connected for ${userId}`);
    if (this.activeSyncs.has(userId)) return;

    this.activeSyncs.add(userId);
    await db.whatsAppSyncState.upsert({
      where: { userId },
      update: {
        status: 'RUNNING',
        syncedChats: 0,
        totalMessages: 0,
        error: null,
        startedAt: new Date(),
        finishedAt: null,
      },
      create: {
        id: userId,
        userId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
    this.io.to(userId).emit('sync_status', { status: 'RUNNING' });

    try {
      const chats = await client.getChats();
      await db.whatsAppSyncState.update({
        where: { userId },
        data: { totalChats: chats.length },
      });

      let totalMessages = 0;
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];
        const chatName = chat?.name || chat?.id?._serialized || `Chat ${i + 1}`;
        await this.upsertChatFromRaw(chat);

        try {
          const messages = await chat.fetchMessages({ limit: 100000 });
          totalMessages += messages.length;

          for (let m = 0; m < messages.length; m++) {
            const message = messages[m];
            await this.persistWhatsAppMessage(message, chat);

            // Granular progress: emit every 10 messages or last message
            if (m % 10 === 0 || m === messages.length - 1) {
              await db.whatsAppSyncState.update({
                where: { userId },
                data: {
                  syncedChats: i + 1,
                  totalMessages,
                  lastChatName: chatName,
                  syncedMessagesInChat: m + 1,
                  totalMessagesInChat: messages.length,
                },
              });
              this.io.to(userId).emit('sync_status', {
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
          // Still emit progress even on failure
          this.io.to(userId).emit('sync_status', {
            status: 'RUNNING',
            totalChats: chats.length,
            syncedChats: i + 1,
            lastChatName: chatName,
            totalMessages,
            error: `Failed to sync ${chatName}`,
          });
        }

        // Always update sync state after each chat
        await db.whatsAppSyncState.update({
          where: { userId },
          data: { syncedChats: i + 1, totalMessages, lastChatName: chatName },
        });
        this.io.to(userId).emit('sync_status', {
          status: 'RUNNING',
          totalChats: chats.length,
          syncedChats: i + 1,
          lastChatName: chatName,
          totalMessages,
        });
      }

      await db.whatsAppSyncState.update({
        where: { userId },
        data: { status: 'COMPLETED', totalMessages, finishedAt: new Date() },
      });
      this.io.to(userId).emit('sync_status', { status: 'COMPLETED', totalMessages });
    } catch (error: any) {
      await db.whatsAppSyncState.update({
        where: { userId },
        data: { status: 'FAILED', error: error?.message || String(error), finishedAt: new Date() },
      });
      this.io.to(userId).emit('sync_status', { status: 'FAILED', error: error?.message || String(error) });
      throw error;
    } finally {
      this.activeSyncs.delete(userId);
    }
  }

  private async initialize() {
    console.log('Initializing WhatsApp Session Manager...');
    
    // Always initialize the default 'mock-admin-user-id' client on startup
    // to enable background automation processing even when the dashboard tab is closed.
    console.log("Automatically starting default client: mock-admin-user-id");
    this.createClient('mock-admin-user-id').catch(err => {
      console.error("Failed to automatically start default client on startup:", err);
    });

    // Restore other existing connected sessions from DB
    const sessions = await db.whatsAppSession.findMany({});
    for (const session of sessions) {
      if (session.userId !== 'mock-admin-user-id' && session.status === 'CONNECTED') {
        console.log(`Restoring session for user: ${session.userId}`);
        this.createClient(session.userId).catch(() => {});
      }
    }
  }

  public async createClient(userId: string) {
    if (this.clients.has(userId)) {
      console.log(`Client for ${userId} already exists.`);
      return this.clients.get(userId);
    }

    console.log(`Creating new WhatsApp client for user: ${userId}`);

    // Ensure session directory exists
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${userId}`);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Clean up existing singleton lock files that might cause conflicts
    // NOTE: Do NOT remove entire session directory to preserve auth data
    this.cleanupSingletonLocks(sessionPath);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: userId,
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

    // Set error handler to prevent crash
    client.on('error', (err: any) => {
      const message = err?.message ? String(err.message) : String(err);
      console.error(`WhatsApp client error for ${userId}:`, message);
      this.io.to(userId).emit('wa_error', { message });
      this.io.to(userId).emit('error', { message });
      this.updateSessionStatus(userId, 'ERROR', message).catch(() => { });
    });

    this.setupEventListeners(userId, client);
    client.initialize().catch((err: any) => {
      const message = err?.message ? String(err.message) : String(err);
      console.error(`Error initializing client for ${userId}:`, message);
      this.io.to(userId).emit('wa_error', { message });
      this.io.to(userId).emit('error', { message });
      this.updateSessionStatus(userId, 'ERROR', message).catch(() => { });
    });

    this.clients.set(userId, client);
    return client;
  }

  public getClient(userId: string) {
    return this.clients.get(userId);
  }

  private setupEventListeners(userId: string, client: any) {
    client.on('qr', (qr: any) => {
      console.log(`QR Code generated for ${userId}`);
      this.io.to(userId).emit('qr', { qr });
      this.updateSessionStatus(userId, 'QR_READY');
    });

    client.on('authenticated', () => {
      console.log(`User ${userId} authenticated`);
      this.io.to(userId).emit('authenticated');
      this.updateSessionStatus(userId, 'AUTHENTICATED').catch(() => { });
    });

    client.on('ready', async () => {
      const info = client.info;
      console.log(`WhatsApp client ready for ${userId} (${info.wid.user})`);

      await db.whatsAppSession.upsert({
        where: { userId },
        update: {
          status: 'CONNECTED',
          phoneNumber: info.wid.user,
          pushName: info.pushname,
          lastConnected: new Date(),
          lastErrorMessage: null,
          lastErrorAt: null,
        },
        create: {
          id: userId,
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
        phoneNumber: info.wid.user,
        pushName: info.pushname
      });
    });

    client.on('disconnected', async (reason: any) => {
      console.log(`User ${userId} disconnected: ${reason}`);
      await this.updateSessionStatus(userId, 'DISCONNECTED');
      this.io.to(userId).emit('disconnected', { reason });
      this.reconnectClient(userId).catch(() => { });

      // Clean up local auth files if it was a logout
      if (reason === 'NAVIGATION') {
        this.destroyClient(userId);
      }
    });

    client.on('auth_failure', (msg: any) => {
      console.error(`Auth failure for ${userId}: ${msg}`);
      const message = msg ? String(msg) : 'Authentication failed';
      this.io.to(userId).emit('wa_error', { message });
      this.io.to(userId).emit('error', { message });
      this.updateSessionStatus(userId, 'ERROR', message);
    });

    client.on('message_ack', async (msg: any, ack: any) => {
      // ack: 0=ERROR, 1=PENDING, 2=SENT, 3=DELIVERED, 4=READ
      const statusMap: Record<number, string> = {
        2: 'SENT',
        3: 'DELIVERED',
        4: 'READ'
      };

      if (statusMap[ack]) {
        await db.messageLog.updateMany({
          where: { messageId: msg.id._serialized },
          data: { status: statusMap[ack] }
        });
        await db.whatsAppMessage.updateMany({
          where: { whatsappMessageId: msg.id._serialized },
          data: { status: statusMap[ack] }
        });

        // Notify dashboard via socket
        const log = await db.messageLog.findFirst({ where: { messageId: msg.id._serialized } });
        if (log) {
          this.io.to(userId).emit('message_status', {
            logId: log.id,
            status: statusMap[ack],
            leadId: log.leadId
          });
        }
      }
    });

    client.on('message', async (msg: any) => {
      if (msg.from.endsWith('@c.us') || msg.from.endsWith('@g.us') || msg.from.endsWith('@lid')) {
        const phone = msg.from.split('@')[0];
        console.log(`[Inbox] Incoming message from ${phone}: ${msg.body}`);
        const rawChat = typeof msg.getChat === 'function' ? await msg.getChat() : undefined;
        const savedMessage = await this.persistWhatsAppMessage(msg, rawChat);

        // 1. Find Lead
        const lead = await db.lead.findFirst({
          where: { phone: { contains: phone } }
        });

        if (lead) {
          // 2. Save to MessageLog
          const log = await db.messageLog.create({
            data: {
              leadId: lead.id,
              content: msg.body,
              direction: 'INCOMING',
              status: 'READ', // WhatsApp web.js marks incoming as read when received in some contexts
              messageId: msg.id._serialized
            }
          });

          // 3. Reply Detection Logic: Stop active sequences
          const activeSequences = await db.sequenceState.findMany({
            where: { leadId: lead.id, status: 'ACTIVE' }
          });

          if (activeSequences.length > 0) {
            await db.sequenceState.updateMany({
              where: { leadId: lead.id, status: 'ACTIVE' },
              data: { status: 'STOPPED_BY_REPLY' }
            });

            await db.activity.create({
              data: {
                leadId: lead.id,
                type: 'AUTOMATION_STOPPED',
                description: 'Sequence stopped automatically due to reply.'
              }
            });
          }

          // 4. Notify Dashboard
          this.io.to(userId).emit('incoming_message', {
            leadId: lead.id,
            businessName: lead.businessName,
            content: msg.body,
            timestamp: new Date()
          });
        }
        this.io.to(userId).emit('whatsapp_message', savedMessage);
      }
    });
  }

  private async updateSessionStatus(userId: string, status: string, errorMessage?: string) {
    // Ensure user exists before creating session (foreign key constraint)
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
      where: { userId },
      update: updateData,
      create: { ...createData, id: userId },
    });
  }

  public async destroyClient(userId: string, forceLogout: boolean = false) {
    const client = this.clients.get(userId);
    if (client) {
      try {
        if (forceLogout) {
          await this.safeCallClientMethod(userId, client, 'logout');
        }
        await this.safeCallClientMethod(userId, client, 'destroy');
      } catch (err) {
        console.error(`Error destroying client for ${userId}:`, err);
      } finally {
        this.clients.delete(userId);
      }
    }
    await this.updateSessionStatus(userId, 'DISCONNECTED');
  }

  public getStatus(userId: string) {
    const client = this.clients.get(userId);
    if (!client) return 'DISCONNECTED';
    return client.getState();
  }

  public async sendMessage(
    userId: string,
    to: string,
    content: string,
    media?: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const client = this.clients.get(userId);
    if (!client) {
      return { success: false, error: 'WhatsApp client not connected' };
    }

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

      await db.whatsAppMessage.create({
        data: {
          chatId: (await this.getOrCreateChat(jid))?.id || '',
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

  private async getOrCreateChat(jid: string) {
    const phone = this.normalizePhone(jid);
    const lead = await this.findLeadForJid(jid);

    return db.whatsAppChat.upsert({
      where: { jid },
      update: {
        lastMessageAt: new Date(),
      },
      create: {
        id: jid,
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

  public async reconnectClient(userId: string): Promise<boolean> {
    const attempts = this.reconnectionAttempts.get(userId) || 0;
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.log(`Max reconnection attempts reached for ${userId}`);
      return false;
    }

    this.reconnectionAttempts.set(userId, attempts + 1);
    console.log(`Attempting to reconnect ${userId} (attempt ${attempts + 1})`);

    try {
      await this.destroyClient(userId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.createClient(userId);
      this.reconnectionAttempts.delete(userId);
      return true;
    } catch (error) {
      console.error(`Reconnection failed for ${userId}:`, error);
      return false;
    }
  }
}

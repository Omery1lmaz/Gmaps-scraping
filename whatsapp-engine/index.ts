import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { WhatsAppSessionManager } from './SessionManager.js';
import db from './mongoService.js';
import { setupWorkers } from './Worker.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, restrict this
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
const sessionManager = new WhatsAppSessionManager(io);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-change-me';

function verifyToken(token?: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.id ? String(decoded.id) : null;
  } catch (_error) {
    return null;
  }
}

function userFromReq(req: express.Request) {
  const authHeader = req.headers.authorization || '';
  return verifyToken(authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
}

async function requireSessionAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = userFromReq(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  (req as any).userId = userId;

  const sessionId = req.params.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

  // If sessionId is the userId itself (legacy single-session fallback)
  if (sessionId === userId) {
    return next();
  }

  // Check if session exists and belongs to this user
  const session = await db.whatsAppSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return res.status(404).json({ error: 'WhatsApp session not found' });
  }

  if (session.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

// Initialize Workers
setupWorkers(sessionManager);

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('join', (payload: string | { token?: string; userId?: string; sessionId?: string }) => {
    const token = typeof payload === 'string' ? undefined : payload?.token;
    const requestedUserId = typeof payload === 'string' ? payload : payload?.userId;
    const requestedSessionId = typeof payload === 'string' ? undefined : payload?.sessionId;
    const userId = verifyToken(token);

    if (!userId || (requestedUserId && requestedUserId !== userId)) {
      socket.emit('wa_error', { message: 'Authentication required' });
      return;
    }
    console.log(`User ${userId} joined their channel (session: ${requestedSessionId || 'default'})`);
    socket.join(userId);
    
    // Auto-start client initialization if joined
    const sessionId = requestedSessionId || userId;
    sessionManager.createClient(sessionId, userId).catch(() => {});
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Endpoints - Compatible with both legacy userId and new sessionId
app.get('/status/:sessionId', requireSessionAccess, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const session = await db.whatsAppSession.findUnique({ where: { id: sessionId } });
  res.json(session || { status: 'DISCONNECTED', lastErrorMessage: null, lastErrorAt: null });
});

app.post('/connect/:sessionId', requireSessionAccess, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const userId = (req as any).userId;
  const force =
    req.query.force === '1' ||
    req.query.force === 'true' ||
    (typeof req.body?.force === 'boolean' && req.body.force === true);

  if (force) {
    await sessionManager.destroyClient(sessionId);
  }
  await sessionManager.createClient(sessionId, userId);
  res.json({ success: true, message: force ? 'Force restart started' : 'Initialization started' });
});

app.post('/logout/:sessionId', requireSessionAccess, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  await sessionManager.destroyClient(sessionId, true);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/sync/:sessionId', requireSessionAccess, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  try {
    // Start sync in background - don't await because it can be very heavy
    sessionManager.syncHistory(sessionId).catch(error => {
      console.error(`Background sync error for ${sessionId}:`, error);
    });
    res.json({ success: true, message: 'Sync started successfully in background' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.WA_ENGINE_PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`🟢 WhatsApp Engine running on port ${PORT}`);
});

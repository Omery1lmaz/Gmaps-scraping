import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Initialize Workers
setupWorkers(sessionManager);

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('join', (userId: string) => {
    console.log(`User ${userId} joined their channel`);
    socket.join(userId);
    
    // Auto-start client initialization if joined
    sessionManager.createClient(userId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Endpoints
app.get('/status/:userId', async (req, res) => {
  const { userId } = req.params;
  const session = await db.whatsAppSession.findUnique({ where: { userId } });
  res.json(session || { status: 'DISCONNECTED', lastErrorMessage: null, lastErrorAt: null });
});

app.post('/connect/:userId', async (req, res) => {
  const { userId } = req.params;
  const force =
    req.query.force === '1' ||
    req.query.force === 'true' ||
    (typeof req.body?.force === 'boolean' && req.body.force === true);

  if (force) {
    await sessionManager.destroyClient(userId);
  }
  await sessionManager.createClient(userId);
  res.json({ success: true, message: force ? 'Force restart started' : 'Initialization started' });
});

app.post('/logout/:userId', async (req, res) => {
  const { userId } = req.params;
  await sessionManager.destroyClient(userId, true);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/sync/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await sessionManager.syncHistory(userId);
    res.json({ success: true, message: 'Sync started successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.WA_ENGINE_PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`🟢 WhatsApp Engine running on port ${PORT}`);
});

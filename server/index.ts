import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getMongoConnection,
  Lead,
  Campaign,
  WhatsAppChat,
  WhatsAppMessage,
  WhatsAppSession,
  WhatsAppSyncState,
  WhatsAppContact,
  WhatsAppMedia,
  Template,
  Sequence,
  SequenceState
} from './dbClient';
import { aiService } from './AIService';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

dotenv.config();

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

const singleMessageQueue = new Queue('single-messages', { connection: redisConnection });
const sequenceQueue = new Queue('sequence-messages', { connection: redisConnection });

// Automated Sequence Polling Cron
setInterval(async () => {
  try {
    const now = new Date();
    const dueStates = await SequenceState.find({
      status: { $in: ['PENDING', 'ACTIVE'] },
      nextRunAt: { $lte: now }
    });

    if (dueStates.length > 0) {
      console.log(`[Sequence Cron] Found ${dueStates.length} due states at ${now.toISOString()}`);
    }

    for (const state of dueStates) {
      console.log(`[Sequence Cron] Queuing state ${state._id} (Lead: ${state.leadId}, Sequence: ${state.sequenceId})`);
      // Mark as IN_PROGRESS to prevent double queuing
      await SequenceState.findByIdAndUpdate(state._id, { status: 'IN_PROGRESS' });
      const job = await sequenceQueue.add('process-sequence-step', {
        leadSequenceStateId: state._id.toString()
      });
      console.log(`[Sequence Cron] Queued job ${job.id} successfully for state ${state._id}`);
    }
  } catch (err) {
    console.error('Sequence Polling Cron Error:', err);
  }
}, 15000); // Check every 15 seconds

const WA_ENGINE_URL = process.env.WHATSAPP_ENGINE_URL || 'http://wa-engine:3002';

async function callWaEngine(path: string, options: RequestInit = {}) {
  const urls = [WA_ENGINE_URL, 'http://localhost:3002'];
  let lastError;
  for (const url of urls) {
    try {
      const res = await fetch(`${url}${path}`, options);
      if (res.ok) return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to call WhatsApp Engine at ${path}`);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Key Authentication Middleware
const authenticateApiKey = (req: Request, res: Response, next: Function) => {
  next();
};

// MongoDB Connection
getMongoConnection();

// API Endpoints

// Get existing external IDs for deduplication
app.get('/api/leads/external-ids', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const externalIds = await Lead.find({}, 'externalId').where('externalId').exists(true);
    res.json(externalIds.map(l => l.externalId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external IDs' });
  }
});

// Receive leads from extension
app.post('/api/leads', authenticateApiKey, async (req: Request, res: Response) => {
  // Basic input validation
  const leadsData = req.body;
  if (!leadsData || (Array.isArray(leadsData) && leadsData.length === 0)) {
    return res.status(400).json({ error: 'Request body is empty or invalid' });
  }
  try {
    const leadsData = req.body;
    const leadsArray = Array.isArray(leadsData) ? leadsData : [leadsData];

    let savedCount = 0;
    let duplicateCount = 0;

    for (const lead of leadsArray) {
      try {
        // Use upsert so enriched data can update existing records
        const updateData: any = {
          name: lead.name || lead.businessName,
          businessName: lead.businessName || lead.name,
          rating: lead.rating,
          reviews: lead.reviews,
          category: lead.category,
          address: lead.address,
          phone: lead.phone,
          website: lead.website,
          url: lead.url,
        };

        // Only set detail fields if they exist (enrichment pass)
        if (lead.openingHours) updateData.openingHours = lead.openingHours;
        if (lead.isOpenNow !== undefined) updateData.isOpenNow = lead.isOpenNow;
        if (lead.plusCode) updateData.plusCode = lead.plusCode;
        if (lead.priceLevel) updateData.priceLevel = lead.priceLevel;
        if (lead.serviceOptions?.length) updateData.serviceOptions = lead.serviceOptions;
        if (lead.description) updateData.description = lead.description;
        if (lead.totalPhotos) updateData.totalPhotos = lead.totalPhotos;
        if (lead.city) updateData.city = lead.city;

        const result = await Lead.updateOne(
          { externalId: lead.id },
          { $set: updateData, $setOnInsert: { externalId: lead.id, createdAt: new Date() } },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          savedCount++;
        } else {
          duplicateCount++;
        }
      } catch (err: any) {
        if (err.code === 11000) {
          duplicateCount++;
        } else {
          console.error('Error saving lead:', err);
        }
      }
    }

    res.status(201).json({
      message: 'Leads processed',
      saved: savedCount,
      duplicates: duplicateCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to build mongoose query for leads based on filters
function buildLeadsQuery(queryParams: any) {
  let query: any = {};
  const { 
    status, minRating, minReviews, category, hasPhone, hasWebsite, search, isOpenNow, priceLevel, city,
    createdAfter, createdBefore, hasOpeningHours, hasDescription, hasServiceOptions,
    hasPlusCode, hasAddress, serviceOption, minPhotos, inPipeline, notInPipeline 
  } = queryParams;

  const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'MEETING_BOOKED', 'CLOSED', 'REJECTED'];

  if (status) query.status = status;

  if (inPipeline === 'true') {
    query.status = { $in: PIPELINE_STAGES };
  } else if (notInPipeline === 'true') {
    query.status = { $nin: PIPELINE_STAGES };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { businessName: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } }
    ];
  }
  if (city) query.city = { $regex: city, $options: 'i' };
  
  if (minRating) query.rating = { $gte: Number(minRating) };
  if (minReviews) query.reviews = { $gte: Number(minReviews) };
  if (category) query.category = category;
  
  if (hasPhone === 'true') query.phone = { $ne: '', $exists: true };
  else if (hasPhone === 'false') query.$or = [{ phone: '' }, { phone: { $exists: false } }];

  if (hasWebsite === 'true') query.website = { $ne: '', $exists: true };
  else if (hasWebsite === 'false') query.$or = [{ website: '' }, { website: { $exists: false } }];

  if (isOpenNow === 'true') query.isOpenNow = true;
  if (priceLevel) query.priceLevel = priceLevel;

  // Date range filter
  if (createdAfter || createdBefore) {
    query.createdAt = {};
    if (createdAfter) query.createdAt.$gte = new Date(createdAfter as string);
    if (createdBefore) query.createdAt.$lte = new Date(createdBefore as string);
  }

  // Has detail info filters
  if (hasOpeningHours === 'true') query.openingHours = { $exists: true, $ne: {} };
  else if (hasOpeningHours === 'false') query.$or = [{ openingHours: {} }, { openingHours: { $exists: false } }];

  if (hasDescription === 'true') query.description = { $exists: true, $ne: '' };
  else if (hasDescription === 'false') query.$or = [{ description: '' }, { description: { $exists: false } }];

  if (hasServiceOptions === 'true') query.serviceOptions = { $exists: true, $ne: [] };
  else if (hasServiceOptions === 'false') query.$or = [{ serviceOptions: [] }, { serviceOptions: { $exists: false } }];

  if (hasPlusCode === 'true') query.plusCode = { $exists: true, $ne: '' };
  else if (hasPlusCode === 'false') query.$or = [{ plusCode: '' }, { plusCode: { $exists: false } }];

  if (hasAddress === 'true') query.address = { $exists: true, $ne: '' };
  else if (hasAddress === 'false') query.$or = [{ address: '' }, { address: { $exists: false } }];

  // Service option filter
  if (serviceOption) query.serviceOptions = serviceOption;

  // Total photos filter
  if (minPhotos) query.totalPhotos = { $gte: Number(minPhotos) };

  return query;
}

// Fetch leads with advanced filtering
app.get('/api/leads', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;

    const query = buildLeadsQuery(req.query);

    const validSortFields = ['name', 'businessName', 'rating', 'reviews', 'createdAt', 'updatedAt', 'city', 'category', 'priceLevel'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(limit),
      Lead.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({ leads, total, page, limit, totalPages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Fetch unique categories for the filter dropdown
app.get('/api/categories', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const categories = await Lead.distinct('category');
    res.json(categories.filter(c => c));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Fetch unique cities for the filter dropdown
app.get('/api/cities', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const cities = await Lead.distinct('city');
    res.json(cities.filter(c => c).sort());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Get a single lead by ID
app.get('/api/leads/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id as string);
    const query = isObjectId 
      ? { $or: [{ _id: req.params.id }, { externalId: req.params.id }] }
      : { externalId: req.params.id };

    const lead = await Lead.findOne(query);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Update a lead (Supports both PATCH and PUT, and auto-formats array of string notes to objects)
const updateLeadHandler = async (req: Request, res: Response) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id as string);
    const query = isObjectId 
      ? { $or: [{ _id: req.params.id }, { externalId: req.params.id }] }
      : { externalId: req.params.id };

    // Format notes if they are sent as strings
    if (req.body.notes && Array.isArray(req.body.notes)) {
      req.body.notes = req.body.notes.map((note: any) => {
        if (typeof note === 'string') {
          return {
            id: new mongoose.Types.ObjectId().toString(),
            content: note,
            createdAt: new Date()
          };
        }
        return note;
      });
    }

    const lead = await Lead.findOneAndUpdate(
      query,
      { $set: req.body },
      { returnDocument: 'after', upsert: false }
    );
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

app.patch('/api/leads/:id', authenticateApiKey, updateLeadHandler);
app.put('/api/leads/:id', authenticateApiKey, updateLeadHandler);

// Add a note to a lead
app.post('/api/leads/:id/notes', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id as string);
    const lead = await Lead.findOneAndUpdate(
      {
        $or: [
          { _id: isValidObjectId ? new mongoose.Types.ObjectId(req.params.id as string) : null },
          { externalId: req.params.id as string }
        ]
      },
      { $push: { notes: { id: new mongoose.Types.ObjectId(), content: req.body.content, createdAt: new Date() } } },
      { returnDocument: 'after' }
    );
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead.notes?.[lead.notes.length - 1]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Update a specific note of a lead
app.put('/api/leads/:id/notes/:noteId', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id as string);
    const query = isValidObjectId 
      ? { $or: [{ _id: req.params.id }, { externalId: req.params.id }] }
      : { externalId: req.params.id as string };

    const lead = await Lead.findOne(query);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const note = lead.notes?.find(n => n.id === req.params.noteId || (n as any)._id?.toString() === req.params.noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    note.content = req.body.content;
    await lead.save();

    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a specific note of a lead
app.delete('/api/leads/:id/notes/:noteId', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id as string);
    const query = isValidObjectId 
      ? { $or: [{ _id: req.params.id }, { externalId: req.params.id }] }
      : { externalId: req.params.id as string };

    const lead = await Lead.findOne(query);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.notes) {
      lead.notes = lead.notes.filter(n => n.id !== req.params.noteId && (n as any)._id?.toString() !== req.params.noteId);
      await lead.save();
    }

    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Get templates
app.get('/api/templates', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create template
app.post('/api/templates', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const template = new Template(req.body);
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
app.put('/api/templates/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    template.name = req.body.name || template.name;
    template.content = req.body.content || template.content;
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
app.delete('/api/templates/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get sequences
app.get('/api/sequences', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const sequences = await Sequence.find().sort({ createdAt: -1 });
    
    // Agreggate states to inject into each sequence response (for frontend counts)
    const sequencesWithCounts = await Promise.all(sequences.map(async (seq) => {
      const stateCount = await SequenceState.countDocuments({ sequenceId: seq._id });
      return { ...seq.toObject(), _count: { leadStates: stateCount } };
    }));
    res.json(sequencesWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sequences' });
  }
});

// Create sequence
app.post('/api/sequences', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequence = new Sequence(req.body);
    await sequence.save();
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sequence' });
  }
});

// Get sequence by ID (includes states)
app.get('/api/sequences/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequence = await Sequence.findById(req.params.id).populate('steps.templateId');
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });

    // Fetch the lead states associated with this sequence
    const states = await SequenceState.find({ sequenceId: sequence._id }).populate('leadId').sort({ createdAt: -1 });
    res.json({ ...sequence.toObject(), states });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sequence details' });
  }
});

// Update sequence settings
app.patch('/api/sequences/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequence = await Sequence.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sequence' });
  }
});

// Delete sequence
app.delete('/api/sequences/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    await Sequence.findByIdAndDelete(req.params.id);
    await SequenceState.deleteMany({ sequenceId: req.params.id }); // Clean up states
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

// Update sequence state (pause/resume/retry/etc)
app.patch('/api/sequences/states/:stateId', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { status, nextRunAt, currentStepIndex, isForced } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (nextRunAt) updateData.nextRunAt = nextRunAt;
    if (currentStepIndex !== undefined) updateData.currentStepIndex = currentStepIndex;
    if (isForced !== undefined) updateData.isForced = isForced;

    // Force run immediately if resuming or restarting
    if (status === 'PENDING') {
      updateData.nextRunAt = new Date();
      if (isForced) {
        updateData.isForced = true;
      }
    }

    const state = await SequenceState.findByIdAndUpdate(req.params.stateId, updateData, { new: true });
    if (!state) return res.status(404).json({ error: 'Sequence state not found' });
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sequence state' });
  }
});

// Remove lead from sequence (Delete sequence state)
app.delete('/api/sequences/states/:stateId', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const state = await SequenceState.findByIdAndDelete(req.params.stateId);
    if (!state) return res.status(404).json({ error: 'Sequence state not found' });

    // Also pull from lead's leadSequenceStates for backward compatibility
    await Lead.findByIdAndUpdate(state.leadId, {
      $pull: { leadSequenceStates: { 'sequence.id': state.sequenceId.toString() } }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sequence state' });
  }
});

// Enroll lead in a sequence
app.post('/api/leads/:id/sequences', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    // Lead id is externalId or actual ID?
    // Using actual _id here is better, but frontend might send externalId
    // Let's resolve the lead first
    const lead = await Lead.findOne({ $or: [{ externalId: req.params.id }, { _id: req.params.id }] });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const sequence = await Sequence.findById(req.body.sequenceId);
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });

    // Check if already enrolled
    const existing = await SequenceState.findOne({ sequenceId: sequence._id, leadId: lead._id });
    if (existing) {
      return res.status(400).json({ error: 'Lead is already enrolled in this sequence' });
    }

    const state = new SequenceState({
      sequenceId: sequence._id,
      leadId: lead._id,
      currentStepIndex: 0,
      status: 'PENDING',
    });
    
    // Set nextRunAt based on delay
    if (sequence.steps && sequence.steps.length > 0) {
      const delayMs = sequence.steps[0].delayHours * 60 * 60 * 1000;
      state.nextRunAt = new Date(Date.now() + delayMs);
    }
    
    await state.save();

    // Push to old leadSequenceStates array for backwards compatibility
    await Lead.findByIdAndUpdate(lead._id, {
      $push: { leadSequenceStates: { id: new mongoose.Types.ObjectId(), status: 'ACTIVE', sequence: { id: sequence._id.toString(), name: sequence.name } } }
    });

    res.json(state);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to enroll in sequence' });
  }
});

// Analyze lead with AI
app.post('/api/ai/analyze-lead/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id as string);
    const query = isObjectId 
      ? { $or: [{ _id: req.params.id }, { externalId: req.params.id }] }
      : { externalId: req.params.id };

    const lead = await Lead.findOne(query);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    // Mock AI analysis
    const analysis = {
      qualityScore: Math.floor(Math.random() * 40) + 60,
      responseLikelihood: Math.floor(Math.random() * 30) + 50,
      outreachFit: Math.random() > 0.5 ? 'HIGH' : 'MEDIUM',
      summary: `${lead.name} potansiyel bir lead. ${lead.category} alanında faaliyet gösteriyor.`
    };
    lead.aiQualityScore = analysis.qualityScore;
    lead.aiResponseLikelihood = analysis.responseLikelihood;
    lead.aiOutreachFit = analysis.outreachFit;
    lead.aiAnalysisSummary = analysis.summary;
    await lead.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze lead' });
  }
});

// Start a new WhatsApp chat
app.post('/api/whatsapp/chats/start', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { phone, content, userId: reqUserId } = req.body;
    const userId = reqUserId || 'mock-admin-user-id';
    
    // Format phone to JID
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
      cleanPhone = `90${cleanPhone}`;
    }
    const chatJid = `${cleanPhone}@c.us`;

    // Upsert the Chat
    let chat = await WhatsAppChat.findOne({ jid: chatJid });
    if (!chat) {
      chat = await WhatsAppChat.create({
        _id: new mongoose.Types.ObjectId().toString(),
        jid: chatJid,
        name: phone, // using the raw phone as name initially
        unreadCount: 0,
        isGroup: false,
        lastMessagePreview: content || '',
        lastMessageAt: new Date()
      });
    }

    if (content) {
      // Create Message
      const messageId = new mongoose.Types.ObjectId().toString();
      const newMessage = await WhatsAppMessage.create({
        _id: messageId,
        chatId: chat.jid, // the queue worker uses this to find the chat
        direction: 'OUTGOING',
        status: 'QUEUED',
        body: content,
        timestamp: new Date(),
      });

      // Add to queue
      await singleMessageQueue.add('send-whatsapp-chat-message', {
        whatsAppMessageId: messageId,
        chatJid: chat.jid,
        content: content,
        userId,
      });
    }

    res.json({ success: true, chat });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to start chat' });
  }
});

// Retrieve all WhatsApp chats
app.get('/api/whatsapp/chats', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { search, filter } = req.query;
    const query: any = {};

    if (search) {
      query.name = { $regex: search as string, $options: 'i' };
    }

    if (filter === 'unread') {
      query.unreadCount = { $gt: 0 };
    } else if (filter === 'groups') {
      query.isGroup = true;
    } else if (filter === 'archived') {
      query.isArchived = true;
    }

    const chats = await WhatsAppChat.find(query).sort({ lastMessageAt: -1 });
    res.json(chats);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch WhatsApp chats' });
  }
});

// Retrieve message history for a chat
app.get('/api/whatsapp/chats/:chatId/messages', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before ? new Date(req.query.before as string) : new Date();

    // Try to find the chat first to resolve the correct ID
    const chat = await WhatsAppChat.findOne({
      $or: [{ _id: chatId }, { id: chatId }, { jid: chatId }]
    });
    const resolvedChatId = chat?.jid || chat?._id?.toString() || chat?.id || chatId;

    // Search by all possible chat ID formats (MongoDB _id, JID)
    const possibleIds = [resolvedChatId, chat?._id?.toString(), chat?.jid, chat?.id].filter(Boolean);
    const query: any = {
      $or: [...new Set(possibleIds)].map(id => ({ chatId: id })),
      timestamp: { $lt: before }
    };
    const messages = await WhatsAppMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // nextCursor = oldest message's timestamp in this batch (last item when sorted newest-first)
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].timestamp : null;

    res.json({
      messages: messages.reverse(), // oldest first for chat display
      nextCursor: nextCursor ? nextCursor.toISOString() : null,
      hasMore,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch messages' });
  }
});

// Send WhatsApp message (Enqueue in BullMQ)
app.post('/api/whatsapp/chats/:chatId/messages', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { body, content, userId: reqUserId, media } = req.body;
    const userId = reqUserId || 'test-user-id';
    const msgText = body || content || '';

    // Resolve actual JID from chat ID
    let actualJid = chatId;
    const chat = await WhatsAppChat.findOne({
      $or: [{ _id: chatId }, { id: chatId }, { jid: chatId }]
    });
    if (chat && chat.jid) {
      actualJid = chat.jid;
    }

    const messageId = new mongoose.Types.ObjectId().toString();

    const newMessage = await WhatsAppMessage.create({
      _id: messageId,
      chatId: actualJid,
      direction: 'OUTGOING',
      status: 'QUEUED',
      body: msgText,
      timestamp: new Date(),
    });

    await singleMessageQueue.add('send-whatsapp-chat-message', {
      whatsAppMessageId: messageId,
      chatJid: actualJid,
      content: msgText,
      userId,
      mediaPath: media?.localPath,
      mediaMimeType: media?.mimeType,
      mediaFileName: media?.fileName,
    });

    res.json(newMessage);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to send WhatsApp message' });
  }
});

// Trigger connection/sync on WhatsApp engine
app.post('/api/whatsapp/sync', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const userId = 'mock-admin-user-id';
    await callWaEngine(`/connect/${userId}`, { method: 'POST' });
    res.json({ success: true, message: 'Sync connection initiated' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to trigger WhatsApp sync' });
  }
});

// Get WhatsApp sync status
app.get('/api/whatsapp/sync/status', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const userId = 'mock-admin-user-id';
    const syncState = await WhatsAppSyncState.findOne({ userId });
    res.json(syncState || { status: 'IDLE' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch sync status' });
  }
});

// Convert WhatsApp contact to a Lead
app.post('/api/whatsapp/contacts/:contactId/convert-lead', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const contact = await WhatsAppContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'WhatsApp contact not found' });
    }

    const leadId = new mongoose.Types.ObjectId().toString();
    const cleanPhone = contact.phone || contact.jid.split('@')[0];

    const lead = await Lead.create({
      _id: leadId,
      externalId: leadId,
      name: contact.name || contact.pushName || cleanPhone,
      businessName: contact.name || contact.pushName || `WA Contact - ${cleanPhone}`,
      phone: cleanPhone,
      source: 'WHATSAPP',
      status: 'NEW',
    });

    contact.leadId = leadId;
    await contact.save();

    await WhatsAppChat.updateOne({ contactId }, { leadId });

    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to convert contact to lead' });
  }
});

// Suggest AI Reply based on chat history
app.post('/api/ai/suggest-reply', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { leadId, history, promptContext } = req.body;
    let lead = null;
    if (leadId) {
      lead = await Lead.findOne({ externalId: leadId });
    }

    if (!lead) {
      lead = { businessName: 'WhatsApp İletişim', category: 'Genel Müşteri' };
    }

    const suggestion = await aiService.suggestReply(lead, history, promptContext);
    res.json({ suggestion });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to suggest AI reply' });
  }
});

// Enqueue WhatsApp message (Legacy fallback)
app.post('/api/whatsapp/enqueue', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    res.json({ success: true, messageId: 'msg_' + Date.now() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enqueue message' });
  }
});

// Get users
app.get('/api/users', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    res.json([
      { id: 'user1', name: 'Admin', email: 'admin@example.com', avatar: 'https://i.pravatar.cc/40?u=1' },
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get tags
app.get('/api/tags', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    res.json([
      { id: 'tag1', name: 'Hot Lead', color: '#ef4444' },
      { id: 'tag2', name: 'Follow-up', color: '#f59e0b' },
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get stats for dashboard (supports filtering)
app.get('/api/stats', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const query = buildLeadsQuery(req.query);

    const totalLeads = await Lead.countDocuments(query);
    const closedLeads = await Lead.countDocuments({ ...query, status: 'CLOSED' });
    const contactedLeads = await Lead.countDocuments({ ...query, status: 'CONTACTED' });

    const ratingAvg = await Lead.aggregate([
      { $match: { ...query, rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const averageRating = ratingAvg.length > 0 ? ratingAvg[0].avgRating : 0;

    const categoryStats = await Lead.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ totalLeads, closedLeads, contactedLeads, averageRating, categoryStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Bulk delete leads
app.post('/api/leads/bulk-delete', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { leadIds, filters, selectAll } = req.body;
    let query: any = {};

    if (selectAll) {
      query = buildLeadsQuery(filters || {});
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      const objectIds = leadIds.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      query = {
        $or: [
          { _id: { $in: objectIds } },
          { externalId: { $in: leadIds } }
        ]
      };
    } else {
      return res.status(400).json({ error: 'No leads specified for deletion' });
    }

    // Find lead IDs first to clean up related data
    const leadsToDelete = await Lead.find(query, { _id: 1 }).lean();
    const leadIdsToDelete = leadsToDelete.map((l: any) => l._id);

    const result = await Lead.deleteMany(query);

    if (leadIdsToDelete.length > 0) {
      await SequenceState.deleteMany({ leadId: { $in: leadIdsToDelete } });
    }

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete leads' });
  }
});

// Bulk update status (Pipeline Stage)
app.post('/api/leads/bulk-update-status', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { leadIds, filters, selectAll, status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    let query: any = {};

    if (selectAll) {
      query = buildLeadsQuery(filters || {});
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      const objectIds = leadIds.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      query = {
        $or: [
          { _id: { $in: objectIds } },
          { externalId: { $in: leadIds } }
        ]
      };
    } else {
      return res.status(400).json({ error: 'No leads specified for status update' });
    }

    const result = await Lead.updateMany(query, { $set: { status, updatedAt: new Date() } });
    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update lead status' });
  }
});

// Bulk enroll leads in sequence
app.post('/api/leads/bulk-enroll-sequence', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { leadIds, filters, selectAll, sequenceId } = req.body;
    if (!sequenceId) {
      return res.status(400).json({ error: 'Sequence ID is required' });
    }

    const sequence = await Sequence.findById(sequenceId);
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    let query: any = {};

    if (selectAll) {
      query = buildLeadsQuery(filters || {});
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      const objectIds = leadIds.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      query = {
        $or: [
          { _id: { $in: objectIds } },
          { externalId: { $in: leadIds } }
        ]
      };
    } else {
      return res.status(400).json({ error: 'No leads specified for sequence enrollment' });
    }

    const leads = await Lead.find(query);
    if (leads.length === 0) {
      return res.json({ success: true, enrolledCount: 0, skippedCount: 0 });
    }

    let enrolledCount = 0;
    let skippedCount = 0;

    for (const lead of leads) {
      // Check if already enrolled
      const existing = await SequenceState.findOne({ sequenceId: sequence._id, leadId: lead._id });
      if (existing) {
        skippedCount++;
        continue;
      }

      const state = new SequenceState({
        sequenceId: sequence._id,
        leadId: lead._id,
        currentStepIndex: 0,
        status: 'PENDING',
      });

      if (sequence.steps && sequence.steps.length > 0) {
        const delayMs = sequence.steps[0].delayHours * 60 * 60 * 1000;
        state.nextRunAt = new Date(Date.now() + delayMs);
      }

      await state.save();

      // Update Lead document sequence state
      await Lead.findByIdAndUpdate(lead._id, {
        $push: {
          leadSequenceStates: {
            id: new mongoose.Types.ObjectId().toString(),
            status: 'ACTIVE',
            sequence: { id: sequence._id.toString(), name: sequence.name }
          }
        }
      });

      enrolledCount++;
    }

    res.json({ success: true, enrolledCount, skippedCount });
  } catch (error) {
    console.error('Bulk enroll error:', error);
    res.status(500).json({ error: 'Failed to bulk enroll leads in sequence' });
  }
});

// AI Smart Lead Search & Filter Matcher
app.post('/api/leads/ai-filter', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Sorgu metni (prompt) zorunludur' });
    }

    const aiResult = await aiService.processSmartAIFilter(prompt);
    
    // Query leads with AI filters using buildLeadsQuery
    const query = buildLeadsQuery(aiResult.mongoFilters || {});
    const leads = await Lead.find(query).limit(100).lean();

    res.json({
      success: true,
      matchedPackageName: aiResult.matchedPackageName,
      matchedPackagePrice: aiResult.matchedPackagePrice,
      marketingStrategy: aiResult.marketingStrategy,
      mongoFilters: aiResult.mongoFilters,
      leads: leads
    });
  } catch (error) {
    console.error('AI filter endpoint failed:', error);
    res.status(500).json({ error: 'Yapay zeka filtrelemesi başarısız oldu' });
  }
});

// Delete a lead
app.delete('/api/leads/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id as string);
    const lead = await Lead.findOneAndDelete({
      $or: [
        { _id: isValidObjectId ? new mongoose.Types.ObjectId(req.params.id as string) : null },
        { externalId: req.params.id as string }
      ]
    });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Clean up related SequenceState documents
    await SequenceState.deleteMany({ leadId: lead._id });

    res.json({ message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Export leads as CSV
app.get('/api/leads/export', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { minRating, minReviews, category, hasPhone, hasWebsite, search, isOpenNow, priceLevel, city,
      createdAfter, createdBefore, hasOpeningHours, hasDescription, hasServiceOptions,
      hasPlusCode, hasAddress, serviceOption, minPhotos } = req.query;
    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }
    if (city) query.city = { $regex: city, $options: 'i' };
    if (minRating) query.rating = { $gte: Number(minRating) };
    if (minReviews) query.reviews = { $gte: Number(minReviews) };
    if (category) query.category = category;
    if (hasPhone === 'true') query.phone = { $ne: '', $exists: true };
    if (hasWebsite === 'true') query.website = { $ne: '', $exists: true };
    if (isOpenNow === 'true') query.isOpenNow = true;
    if (priceLevel) query.priceLevel = priceLevel;

    // Date range filter
    if (createdAfter || createdBefore) {
      query.createdAt = {};
      if (createdAfter) query.createdAt.$gte = new Date(createdAfter as string);
      if (createdBefore) query.createdAt.$lte = new Date(createdBefore as string);
    }

    // Has detail info filters
    if (hasOpeningHours === 'true') query.openingHours = { $exists: true, $ne: {} };
    if (hasDescription === 'true') query.description = { $exists: true, $ne: '' };
    if (hasServiceOptions === 'true') query.serviceOptions = { $exists: true, $ne: [] };
    if (hasPlusCode === 'true') query.plusCode = { $exists: true, $ne: '' };
    if (hasAddress === 'true') query.address = { $exists: true, $ne: '' };

    // Service option filter
    if (serviceOption) query.serviceOptions = serviceOption;

    // Total photos filter
    if (minPhotos) query.totalPhotos = { $gte: Number(minPhotos) };

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    const headers = ['Name', 'Category', 'Rating', 'Reviews', 'Phone', 'Website', 'Address', 'City', 'URL', 'Open Now', 'Price Level', 'Plus Code', 'Service Options', 'Description', 'Opening Hours'];
    const rows = leads.map(l => [
      l.businessName || l.name,
      l.category || '',
      l.rating || '',
      l.reviews || '',
      l.phone || '',
      l.website || '',
      l.address || '',
      l.city || '',
      l.url,
      l.isOpenNow !== undefined ? (l.isOpenNow ? 'Yes' : 'No') : '',
      l.priceLevel || '',
      l.plusCode || '',
      (l.serviceOptions || []).join('; '),
      (l.description || '').replace(/"/g, '""'),
      l.openingHours ? Object.entries(l.openingHours).map(([day, hours]) => `${day}: ${hours}`).join('; ') : ''
    ].map(v => `"${v}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Campaign endpoints (MongoDB Persistence)
app.get('/api/campaigns', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    let campaignsList = await Campaign.find().sort({ createdAt: -1 });

    // Seed default campaigns if empty
    if (campaignsList.length === 0) {
      await Campaign.create([
        { name: 'Antalya Restoran Tanıtımı', templateId: 'welcome', status: 'ACTIVE', filters: { city: 'Antalya', category: 'Restaurant', minRating: '4.0' } },
        { name: 'İstanbul Kafe Outreach', templateId: 'followup', status: 'PAUSED', filters: { city: 'İstanbul', category: 'Cafe', minRating: '4.2' } }
      ]);
      campaignsList = await Campaign.find().sort({ createdAt: -1 });
    }

    const results = await Promise.all(campaignsList.map(async (camp: any) => {
      let query: any = {};
      if (camp.filters?.city) {
        query.city = { $regex: camp.filters.city, $options: 'i' };
      }
      if (camp.filters?.category) {
        query.category = camp.filters.category;
      }
      if (camp.filters?.minRating) {
        query.rating = { $gte: Number(camp.filters.minRating) };
      }

      const leadsCount = await Lead.countDocuments(query);

      return {
        id: camp._id,
        name: camp.name,
        templateId: camp.templateId,
        status: camp.status,
        filters: camp.filters,
        userId: camp.userId,
        createdAt: camp.createdAt,
        updatedAt: camp.updatedAt,
        leadsCount,
        _count: { leads: leadsCount }
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.get('/api/campaigns/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const camp = await Campaign.findById(req.params.id);
    if (!camp) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let query: any = {};
    if (camp.filters?.city) {
      query.city = { $regex: camp.filters.city, $options: 'i' };
    }
    if (camp.filters?.category) {
      query.category = camp.filters.category;
    }
    if (camp.filters?.minRating) {
      query.rating = { $gte: Number(camp.filters.minRating) };
    }
    const leadsCount = await Lead.countDocuments(query);

    res.json({
      id: camp._id,
      name: camp.name,
      templateId: camp.templateId,
      status: camp.status,
      filters: camp.filters,
      userId: camp.userId,
      createdAt: camp.createdAt,
      updatedAt: camp.updatedAt,
      leadsCount,
      _count: { leads: leadsCount }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

app.post('/api/campaigns', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const newCamp = new Campaign(req.body);
    await newCamp.save();

    res.status(201).json({
      id: newCamp._id,
      ...newCamp.toObject()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.patch('/api/campaigns/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const updatedCamp = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after' }
    );
    if (!updatedCamp) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({
      id: updatedCamp._id,
      ...updatedCamp.toObject()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

app.delete('/api/campaigns/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const deletedCamp = await Campaign.findByIdAndDelete(req.params.id);
    if (!deletedCamp) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

app.get('/api/campaigns/:id/analytics', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    res.json({
      impressions: 1250,
      clicks: 85,
      conversions: 12,
      spend: 245.50,
      ctr: 6.8,
      cpc: 2.89
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pinoHttp from 'pino-http';
import logger from './logger';
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
  User,
  Template,
  Sequence,
  SequenceState,
  PipelineStage,
  Meeting,
  ScrapeTask,
  ScrapeCategory,
  Tag,
  CalendlyIntegration
} from './dbClient';
import { aiService } from './AIService';
import { CalendarService } from './CalendarService';
import { CalendlyService } from './CalendlyService';
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
      logger.info({ count: dueStates.length }, '[Sequence Cron] Found due states');
    }

    for (const state of dueStates) {
      logger.info({ stateId: state._id, leadId: state.leadId }, '[Sequence Cron] Queuing state');
      // Mark as IN_PROGRESS to prevent double queuing
      await SequenceState.findByIdAndUpdate(state._id, { status: 'IN_PROGRESS' });
      const job = await sequenceQueue.add('process-sequence-step', {
        leadSequenceStateId: state._id.toString()
      });
      logger.debug({ jobId: job.id, stateId: state._id }, '[Sequence Cron] Queued job successfully');
    }
  } catch (err) {
    console.error('Sequence Polling Cron Error:', err);
  }
}, 15000); // Check every 15 seconds

const WA_ENGINE_URL = process.env.WHATSAPP_ENGINE_URL || 'http://wa-engine:3002';
const WHATSAPP_MEDIA_DIR = process.env.WHATSAPP_MEDIA_DIR || path.join(__dirname, 'media', 'whatsapp');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  plan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: Date | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function publicUser(user: any): AuthUser {
  return {
    id: user._id?.toString?.() || user.id,
    email: user.email,
    name: user.name,
    plan: user.plan || 'free',
    subscriptionStatus: user.subscriptionStatus || 'inactive',
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
  };
}

function signAuthToken(user: any) {
  return jwt.sign(publicUser(user), JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

function getUserId(req: Request) {
  if (!req.user?.id) throw new Error('Authenticated user missing');
  return req.user.id;
}

function userScope(req: Request, query: any = {}) {
  return { ...query, userId: getUserId(req) };
}

function scopedIdQuery(req: Request, id: string) {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return userScope(req, isObjectId
    ? { $or: [{ _id: id }, { externalId: id }] }
    : { externalId: id });
}

async function callWaEngine(path: string, userId: string, options: RequestInit = {}) {
  const urls = [WA_ENGINE_URL, 'http://wa-engine:3002', 'http://localhost:3002'];
  let lastError;
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '5m' });
  for (const url of urls) {
    try {
      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      } as HeadersInit;
      const res = await fetch(`${url}${path}`, { ...options, headers });
      if (res.ok) return res;
      
      // If not OK, try to get error message from response
      const errorData = await res.json().catch(() => ({}));
      lastError = new Error(errorData.error || errorData.message || `WhatsApp Engine responded with status ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to call WhatsApp Engine at ${path}`);
}

const app = express();
app.use(pinoHttp({ logger }));
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/media/whatsapp', express.static(WHATSAPP_MEDIA_DIR));

// JWT Authentication Middleware
const authenticateApiKey = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = {
      id: String(decoded.id),
      email: decoded.email || '',
      name: decoded.name || '',
      plan: decoded.plan || 'free',
      subscriptionStatus: decoded.subscriptionStatus || 'active',
      subscriptionExpiresAt: decoded.subscriptionExpiresAt || null,
    };
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to enforce tiered plans for specific features
const requirePlan = (allowedPlans: string[]) => {
  return async (req: Request, res: Response, next: Function) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (allowedPlans.includes(user.plan)) {
        return next();
      }

      const planNames: Record<string, string> = {
        'starter': 'Starter',
        'pro': 'Growth',
        'enterprise': 'Agency'
      };

      const requiredPlanName = planNames[allowedPlans[0]] || allowedPlans[0];

      res.status(403).json({
        error: 'Subscription Required',
        message: `Bu özellik için en az ${requiredPlanName} paketi gereklidir. Lütfen planınızı yükseltin!`,
        code: 'PREMIUM_REQUIRED'
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during plan verification' });
    }
  };
};

const requireStarterPlan = requirePlan(['starter', 'pro', 'enterprise']);
const requireProPlan = requirePlan(['pro', 'enterprise']);
const requireEnterprisePlan = requirePlan(['enterprise']);

// MongoDB Connection
getMongoConnection();

// API Endpoints

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim() || email.split('@')[0];

    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and at least 6 character password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email is already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    
    // Create default pipeline stages for the new user
    const defaultStages = [
      { name: 'NEW', label: 'Yeni Lead', order: 1, color: 'blue', icon: 'Plus' },
      { name: 'CONTACTED', label: 'İletişime Geçildi', order: 2, color: 'indigo', icon: 'MessageSquare' },
      { name: 'FOLLOW_UP', label: 'Takip Ediliyor', order: 3, color: 'amber', icon: 'Clock' },
      { name: 'MEETING_BOOKED', label: 'Toplantı Planlandı', order: 4, color: 'emerald', icon: 'Calendar' },
      { name: 'CLOSED', label: 'Kapandı / Başarılı', order: 5, color: 'purple', icon: 'CheckCircle2' },
      { name: 'REJECTED', label: 'Reddedildi', order: 6, color: 'rose', icon: 'XCircle' }
    ];
    await PipelineStage.insertMany(defaultStages.map(s => ({ ...s, userId: user._id.toString() })));

    res.status(201).json({ user: publicUser(user), token: signAuthToken(user) });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ user: publicUser(user), token: signAuthToken(user) });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to login' });
  }
});

app.get('/api/auth/me', authenticateApiKey, async (req: Request, res: Response) => {
  const user = await User.findById(getUserId(req));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(publicUser(user));
});

// Subscription billing portals
app.get('/api/subscription', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const totalLeads = await Lead.countDocuments({ userId });
    res.json({
      plan: user.plan || 'free',
      subscriptionStatus: user.subscriptionStatus || 'inactive',
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      leadsScrapedCount: totalLeads,
      leadsScrapedLimit: user.leadsScrapedLimit || 20,
      totalLeadsLimit: user.totalLeadsLimit || 100,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch subscription' });
  }
});

app.post('/api/subscription/upgrade', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { plan } = req.body;

    if (!['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mock payment processing delay (feel realistic)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update user subscription state
    user.plan = plan;
    user.subscriptionStatus = 'active';
    
    // Set expiry to 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    user.subscriptionExpiresAt = nextYear;
    
    user.stripeCustomerId = `cus_${Math.random().toString(36).substring(2, 10)}`;
    user.stripeSubscriptionId = `sub_${Math.random().toString(36).substring(2, 10)}`;

    await user.save();

    res.json({
      success: true,
      message: `Aboneliğiniz başarıyla ${plan.toUpperCase()} seviyesine yükseltildi!`,
      user: publicUser(user)
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to upgrade subscription' });
  }
});

app.post('/api/subscription/cancel', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.plan = 'free';
    user.subscriptionStatus = 'canceled';
    user.subscriptionExpiresAt = null;

    await user.save();

    res.json({
      success: true,
      message: 'Aboneliğiniz iptal edildi.',
      user: publicUser(user)
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to cancel subscription' });
  }
});

// Get existing external IDs for deduplication
app.get('/api/leads/external-ids', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const externalIds = await Lead.find(userScope(req), 'externalId').where('externalId').exists(true);
    res.json(externalIds.map(l => l.externalId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external IDs' });
  }
});

// Helper to automatically enroll new leads based on active rules
async function checkAndAutoEnrollLead(lead: any, userId: string) {
  try {
    // Find all active sequences that have autoEnrollEnabled: true
    const activeSequences = await Sequence.find({ userId, isActive: true, autoEnrollEnabled: true });
    for (const seq of activeSequences) {
      // Check if lead already enrolled in this sequence
      const existingState = await SequenceState.findOne({ userId, sequenceId: seq._id, leadId: lead._id });
      if (existingState) continue;

      // Match city
      if (seq.autoEnrollCity && seq.autoEnrollCity !== 'all' && seq.autoEnrollCity !== '') {
        const leadCity = (lead.city || '').toLowerCase().trim();
        const ruleCity = seq.autoEnrollCity.toLowerCase().trim();
        if (!leadCity.includes(ruleCity) && !ruleCity.includes(leadCity)) continue;
      }

      // Match category
      if (seq.autoEnrollCategory && seq.autoEnrollCategory !== 'all' && seq.autoEnrollCategory !== '') {
        const leadCat = (lead.category || '').toLowerCase().trim();
        const ruleCat = seq.autoEnrollCategory.toLowerCase().trim();
        if (!leadCat.includes(ruleCat) && !ruleCat.includes(leadCat)) continue;
      }

      // Match rating
      if (seq.autoEnrollMinRating > 0) {
        const leadRating = Number(lead.rating) || 0;
        if (leadRating < seq.autoEnrollMinRating) continue;
      }

      // Match website status
      if (seq.autoEnrollHasWebsite === 'true' && !lead.website) continue;
      if (seq.autoEnrollHasWebsite === 'false' && lead.website) continue;

      // Match phone status
      if (seq.autoEnrollHasPhone === 'true' && !lead.phone) continue;
      if (seq.autoEnrollHasPhone === 'false' && lead.phone) continue;

      // Match found! Enroll the lead
      const state = new SequenceState({
        userId,
        sequenceId: seq._id,
        leadId: lead._id,
        currentStepIndex: 0,
        currentStepId: seq.steps?.[0]?.id,
        status: 'PENDING',
      });
      
      if (seq.steps && seq.steps.length > 0) {
        const delayMs = seq.steps[0].delayHours * 60 * 60 * 1000;
        state.nextRunAt = new Date(Date.now() + delayMs);
      }
      
      await state.save();

      // Push to old leadSequenceStates array for backwards compatibility
      await Lead.findByIdAndUpdate(lead._id, {
        $push: { leadSequenceStates: { id: new mongoose.Types.ObjectId(), status: 'ACTIVE', sequence: { id: seq._id.toString(), name: seq.name } } }
      });
      
      logger.info({ 
        leadId: lead._id, 
        sequenceId: seq._id, 
        leadName: lead.businessName || lead.name 
      }, '[AutoEnroll] Lead successfully enrolled');
    }
  } catch (error) {
    logger.error({ err: error }, '[AutoEnroll] Error during auto-enrollment');
  }
}

// Receive leads from extension
app.post('/api/leads', authenticateApiKey, async (req: Request, res: Response) => {
  // Basic input validation
  const leadsData = req.body;
  if (!leadsData || (Array.isArray(leadsData) && leadsData.length === 0)) {
    return res.status(400).json({ error: 'Request body is empty or invalid' });
  }
  try {
    const userId = getUserId(req);
    
    // Plan limit check
    const currentUser = await User.findById(userId);
    if (currentUser) {
      const planLimits = {
        'free': 50,
        'starter': 1000,
        'pro': 5000,
        'enterprise': 25000
      };
      
      const userLimit = planLimits[currentUser.plan as keyof typeof planLimits] || 50;
      const totalLeads = await Lead.countDocuments({ userId });
      
      if (totalLeads >= userLimit) {
        const planNames = {
          'free': 'Ücretsiz',
          'starter': 'Starter',
          'pro': 'Growth',
          'enterprise': 'Agency'
        };
        const currentPlanName = planNames[currentUser.plan as keyof typeof planNames];
        
        return res.status(403).json({
          error: 'Subscription Limit Reached',
          message: `${currentPlanName} plan limitine ulaştınız (Maksimum ${userLimit} kayıt). Daha fazla kayıt kaydetmek için lütfen planınızı yükseltin!`,
          code: 'LIMIT_REACHED'
        });
      }
    }

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
        if (lead.country) updateData.country = lead.country;

        const result = await Lead.updateOne(
          { userId, externalId: lead.id },
          { $set: updateData, $setOnInsert: { userId, externalId: lead.id, createdAt: new Date() } },
          { upsert: true }
        );

        const savedLead = await Lead.findOne({ userId, externalId: lead.id });

        if (result.upsertedCount > 0) {
          savedCount++;
          // Trigger auto-enrollment
          if (savedLead) {
            await checkAndAutoEnrollLead(savedLead, userId);
          }
        } else {
          duplicateCount++;
          // Trigger auto-enrollment in case it wasn't previously enrolled
          if (savedLead) {
            await checkAndAutoEnrollLead(savedLead, userId);
          }
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

    const query = userScope(req, buildLeadsQuery(req.query));

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

app.post('/api/leads/discover', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    const userId = getUserId(req);

    // Clean phone number for matching
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // Check if lead already exists
    let lead = await Lead.findOne({ userId, phone: { $regex: cleanPhone } });
    if (lead) return res.json({ success: true, lead, alreadyExisted: true });

    // Create new lead
    lead = await Lead.create({
      userId,
      externalId: `discover-${Date.now()}`,
      name: `WhatsApp Lead (${phone})`,
      businessName: `Bilinmeyen İşletme (${phone})`,
      phone,
      status: 'NEW',
      url: 'https://whatsapp.com',
      activities: [{
        id: new mongoose.Types.ObjectId().toString(),
        type: 'LEAD_DISCOVERED',
        description: `WhatsApp üzerinden yeni iletişim keşfedildi. İlk mesaj: "${message?.substring(0, 50)}..."`,
        createdAt: new Date()
      }]
    });

    // Trigger AI analysis in background
    aiService.analyzeLead(lead, userId).catch(e => console.error('Auto-analysis failed:', e));

    res.json({ success: true, lead });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to discover lead' });
  }
});

// Fetch unique categories for the filter dropdown
app.get('/api/categories', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const categories = await Lead.distinct('category', userScope(req));
    res.json(categories.filter(c => c));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Fetch unique cities for the filter dropdown
app.get('/api/cities', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const cities = await Lead.distinct('city', userScope(req));
    res.json(cities.filter(c => c).sort());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Get a single lead by ID
app.get('/api/leads/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const query = scopedIdQuery(req, req.params.id as string);

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
    const query = scopedIdQuery(req, req.params.id as string);

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
      { $set: { ...req.body, userId: getUserId(req) } },
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
    const lead = await Lead.findOneAndUpdate(
      scopedIdQuery(req, req.params.id as string),
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
    const query = scopedIdQuery(req, req.params.id as string);

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
    const query = scopedIdQuery(req, req.params.id as string);

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
app.get('/api/templates', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const templates = await Template.find(userScope(req)).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Upload media
app.post('/api/upload', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data || !fileName) {
      return res.status(400).json({ error: 'Missing base64Data or fileName' });
    }

    // Process base64 (remove data:image/png;base64, header if exists)
    const base64Content = base64Data.split(';base64,').pop() || base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Generate unique filename with userId prefix
    const userId = getUserId(req);
    const uniqueFileName = `${userId}-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadPath = path.join(__dirname, 'uploads', uniqueFileName);
    
    // Write to disk
    const fs = require('fs');
    fs.writeFileSync(uploadPath, buffer);
    
    // Return URL
    const fileUrl = `http://localhost:3001/uploads/${uniqueFileName}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Create template
app.post('/api/templates', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const template = new Template({ ...req.body, userId: getUserId(req) });
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
app.put('/api/templates/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const template = await Template.findOne(userScope(req, { _id: req.params.id }));
    if (!template) return res.status(404).json({ error: 'Template not found' });
    template.name = req.body.name || template.name;
    template.content = req.body.content || template.content;
    template.category = req.body.category || template.category;
    if (req.body.hasMedia !== undefined) template.hasMedia = req.body.hasMedia;
    if (req.body.mediaType !== undefined) template.mediaType = req.body.mediaType;
    if (req.body.mediaUrl !== undefined) template.mediaUrl = req.body.mediaUrl;
    if (req.body.mimeType !== undefined) template.mimeType = req.body.mimeType;
    if (req.body.fileName !== undefined) template.fileName = req.body.fileName;
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
app.delete('/api/templates/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    await Template.findOneAndDelete(userScope(req, { _id: req.params.id }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get sequences
app.get('/api/sequences', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequences = await Sequence.find(userScope(req)).sort({ createdAt: -1 });
    
    // Agreggate states to inject into each sequence response (for frontend counts)
    const sequencesWithCounts = await Promise.all(sequences.map(async (seq) => {
      const stateCount = await SequenceState.countDocuments(userScope(req, { sequenceId: seq._id }));
      return { ...seq.toObject(), _count: { leadStates: stateCount } };
    }));
    res.json(sequencesWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sequences' });
  }
});

// Create sequence
app.post('/api/sequences', authenticateApiKey, requireProPlan, async (req: Request, res: Response) => {
  try {
    const sequence = new Sequence({ ...req.body, userId: getUserId(req) });
    await sequence.save();
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sequence' });
  }
});

// Get sequence by ID (includes states)
app.get('/api/sequences/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequence = await Sequence.findOne(userScope(req, { _id: req.params.id })).populate('steps.templateId');
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });

    // Fetch the lead states associated with this sequence
    const states = await SequenceState.find(userScope(req, { sequenceId: sequence._id })).populate('leadId').sort({ createdAt: -1 });
    res.json({ ...sequence.toObject(), states });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sequence details' });
  }
});

// Update sequence settings
app.patch('/api/sequences/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequence = await Sequence.findOneAndUpdate(userScope(req, { _id: req.params.id }), { $set: { ...req.body, userId: getUserId(req) } }, { new: true });
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sequence' });
  }
});

// Pause all states in sequence
app.post('/api/sequences/:id/pause', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequenceId = req.params.id;
    const result = await SequenceState.updateMany(
      userScope(req, { sequenceId, status: { $in: ['PENDING', 'ACTIVE', 'IN_PROGRESS', 'PROCESSING'] } }),
      { $set: { status: 'PAUSED' } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause sequence states' });
  }
});

// Resume all paused states in sequence
app.post('/api/sequences/:id/resume', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequenceId = req.params.id;
    const result = await SequenceState.updateMany(
      userScope(req, { sequenceId, status: 'PAUSED' }),
      { $set: { status: 'PENDING', nextRunAt: new Date() } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume sequence states' });
  }
});

// Restart all states in sequence (Reset to step 1)
app.post('/api/sequences/:id/restart', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequenceId = req.params.id;
    const sequence = await Sequence.findOne(userScope(req, { _id: sequenceId }));
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });

    let firstStepDelayMs = 0;
    if (sequence.steps && sequence.steps.length > 0) {
      firstStepDelayMs = sequence.steps[0].delayHours * 60 * 60 * 1000;
    }

    const result = await SequenceState.updateMany(
      userScope(req, { sequenceId }),
      { 
        $set: { 
          status: 'PENDING', 
          currentStepIndex: 0, 
          nextRunAt: new Date(Date.now() + firstStepDelayMs),
          lastError: undefined,
          isForced: false
        } 
      }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restart sequence states' });
  }
});

// Remove all leads from sequence (Clear sequence)
app.post('/api/sequences/:id/clear', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const sequenceId = req.params.id;
    
    // Pull from leadSequenceStates of the enrolled leads
    const states = await SequenceState.find(userScope(req, { sequenceId }));
    const leadIds = states.map(s => s.leadId);
    
    if (leadIds.length > 0) {
      await Lead.updateMany(
        userScope(req, { _id: { $in: leadIds } }),
        { $pull: { leadSequenceStates: { 'sequence.id': sequenceId } } }
      );
    }
    
    const result = await SequenceState.deleteMany(userScope(req, { sequenceId }));
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear sequence states' });
  }
});

// Delete sequence
app.delete('/api/sequences/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    await Sequence.findOneAndDelete(userScope(req, { _id: req.params.id }));
    await SequenceState.deleteMany(userScope(req, { sequenceId: req.params.id })); // Clean up states
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

    const state = await SequenceState.findOneAndUpdate(userScope(req, { _id: req.params.stateId }), updateData, { new: true });
    if (!state) return res.status(404).json({ error: 'Sequence state not found' });
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sequence state' });
  }
});

// Remove lead from sequence (Delete sequence state)
app.delete('/api/sequences/states/:stateId', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const state = await SequenceState.findOneAndDelete(userScope(req, { _id: req.params.stateId }));
    if (!state) return res.status(404).json({ error: 'Sequence state not found' });

    // Also pull from lead's leadSequenceStates for backward compatibility
    await Lead.findOneAndUpdate(userScope(req, { _id: state.leadId }), {
      $pull: { leadSequenceStates: { 'sequence.id': state.sequenceId.toString() } }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sequence state' });
  }
});

// Enroll lead in a sequence
app.post('/api/leads/:id/sequences', authenticateApiKey, requireProPlan, async (req: Request, res: Response) => {
  try {
    // Lead id is externalId or actual ID?
    // Using actual _id here is better, but frontend might send externalId
    // Let's resolve the lead first
    const userId = getUserId(req);
    const lead = await Lead.findOne(scopedIdQuery(req, req.params.id as string));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const sequence = await Sequence.findOne(userScope(req, { _id: req.body.sequenceId }));
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' });

    // Check if already enrolled
    const existing = await SequenceState.findOne({ userId, sequenceId: sequence._id, leadId: lead._id });
    if (existing) {
      return res.status(400).json({ error: 'Lead is already enrolled in this sequence' });
    }

    const state = new SequenceState({
      userId,
      sequenceId: sequence._id,
      leadId: lead._id,
      currentStepIndex: 0,
      currentStepId: sequence.steps?.[0]?.id,
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
app.post('/api/ai/analyze-lead/:id', authenticateApiKey, requireStarterPlan, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const query = scopedIdQuery(req, req.params.id as string);

    const lead = await Lead.findOne(query);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    await aiService.analyzeLead(lead, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze lead' });
  }
});

// Personalize message with AI
app.post('/api/ai/personalize', authenticateApiKey, requireStarterPlan, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { leadId, template, tone } = req.body;
    
    const lead = await Lead.findOne(scopedIdQuery(req, leadId));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Get previous messages to check for similarity
    const previousMessages = await WhatsAppMessage.find({ userId, chatId: lead.phone + '@c.us' })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('body');
    
    const previousBodies = previousMessages.map(m => m.body).filter((body): body is string => typeof body === 'string');

    const generation = await aiService.generatePersonalizedOutreach(
      lead,
      template,
      tone,
      userId,
      previousBodies
    );

    res.json(generation);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to personalize message' });
  }
});

// Meeting endpoints
app.get('/api/meetings', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const meetings = await Meeting.find(userScope(req)).sort({ date: 1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

app.post('/api/meetings', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const meeting = new Meeting({ ...req.body, userId });
    await meeting.save();

    // Try to sync with calendar if user has connection
    try {
      const user = await User.findById(userId);
      if (user?.calendarConnections?.some(c => c.provider === 'google' && c.isActive)) {
        await CalendarService.createEvent(userId, meeting._id.toString());
      }
    } catch (syncError) {
      console.error('Failed to sync meeting with calendar:', syncError);
      // We don't fail the whole request if sync fails
    }

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Calendar Integrations
app.get('/api/calendar/google/auth', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const url = await CalendarService.getGoogleAuthUrl();
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendar/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/settings?error=no_code`);
    }
    // Redirect back to dashboard with the code
    res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/settings?google_code=${code}`);
  } catch (error: any) {
    res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/settings?error=auth_failed`);
  }
});

app.post('/api/calendar/google/connect', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = getUserId(req);
    const connection = await CalendarService.handleGoogleCallback(code, userId);
    res.json({ success: true, connection });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendar/connections', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(getUserId(req));
    res.json(user?.calendarConnections || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

app.delete('/api/calendar/connections/:provider', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(getUserId(req));
    if (user) {
      user.calendarConnections = user.calendarConnections?.filter(c => c.provider !== provider);
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

app.get('/api/calendar/events', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const events = await CalendarService.listEvents(getUserId(req));
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar/sync', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const count = await CalendarService.syncEventsFromGoogle(getUserId(req));
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Calendly Integrations
app.get('/api/calendly/auth', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const url = CalendlyService.getAuthUrl();
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendly/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/settings?error=no_code`);
    }
    res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/settings?calendly_code=${code}`);
  } catch (error: any) {
    res.redirect(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/settings?error=auth_failed`);
  }
});

app.post('/api/calendly/connect', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = getUserId(req);
    const integration = await CalendlyService.handleCallback(code, userId);
    res.json({ success: true, integration });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendly/integration', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const integration = await CalendlyIntegration.findOne({ userId: getUserId(req) });
    res.json(integration);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch Calendly integration' });
  }
});

app.delete('/api/calendly/integration', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    await CalendlyIntegration.deleteOne({ userId: getUserId(req) });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to disconnect Calendly' });
  }
});

app.get('/api/calendly/event-types', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const eventTypes = await CalendlyService.getEventTypes(getUserId(req));
    res.json(eventTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendly/event-types/select', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { uri } = req.body;
    const userId = getUserId(req);
    const integration = await CalendlyService.selectEventType(userId, uri);
    res.json({ success: true, integration });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendly/sync', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const count = await CalendlyService.syncMeetings(getUserId(req));
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Scrape Task endpoints
app.get('/api/scrape-tasks', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const tasks = await ScrapeTask.find(userScope(req)).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scrape tasks' });
  }
});

app.post('/api/scrape-tasks', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const task = new ScrapeTask({ ...req.body, userId: getUserId(req) });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create scrape task' });
  }
});

// Scrape Category endpoints
app.get('/api/scrape-categories', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const categories = await ScrapeCategory.find(userScope(req)).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scrape categories' });
  }
});

app.post('/api/scrape-categories', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const category = new ScrapeCategory({ ...req.body, userId: getUserId(req) });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create scrape category' });
  }
});

const COUNTRY_DIALING_CODES: Record<string, string> = {
  // Turkish
  'türkiye': '90',
  'turkiye': '90',
  'turkey': '90',
  'tr': '90',
  'almanya': '49',
  'germany': '49',
  'de': '49',
  'fransa': '33',
  'france': '33',
  'fr': '33',
  'ingiltere': '44',
  'birleşik krallık': '44',
  'united kingdom': '44',
  'uk': '44',
  'gb': '44',
  'amerika': '1',
  'abd': '1',
  'usa': '1',
  'united states': '1',
  'us': '1',
  'kanada': '1',
  'canada': '1',
  'ca': '1',
  'italya': '39',
  'italy': '39',
  'it': '39',
  'ispanya': '34',
  'spain': '34',
  'es': '34',
  'hollanda': '31',
  'netherlands': '31',
  'nl': '31',
  'belçika': '32',
  'belgium': '32',
  'be': '32',
  'azerbaycan': '994',
  'azerbaijan': '994',
  'az': '994',
  'suudi arabistan': '966',
  'saudi arabia': '966',
  'sa': '966',
  'birleşik arap emirlikleri': '971',
  'uae': '971',
  'ae': '971',
  'yunanistan': '30',
  'greece': '30',
  'gr': '30',
  'bulgaristan': '359',
  'bulgaria': '359',
  'bg': '359',
  'romanya': '40',
  'romania': '40',
  'ro': '40',
  'rusya': '7',
  'russia': '7',
  'ru': '7',
  'ukrayna': '380',
  'ukraine': '380',
  'ua': '380',
  'avusturya': '43',
  'austria': '43',
  'at': '43',
  'isviçre': '41',
  'switzerland': '41',
  'ch': '41',
  'isveç': '46',
  'sweden': '46',
  'se': '46',
  'norveç': '47',
  'norway': '47',
  'no': '47',
  'danimarka': '45',
  'denmark': '45',
  'dk': '45',
  'polonya': '48',
  'poland': '48',
  'pl': '48',
  'portekiz': '351',
  'portugal': '351',
  'pt': '351'
};

function getCountryDialingCode(countryName?: string): string | null {
  if (!countryName) return null;
  const normalized = countryName.trim().toLowerCase();
  
  if (COUNTRY_DIALING_CODES[normalized]) {
    return COUNTRY_DIALING_CODES[normalized];
  }
  
  for (const [key, value] of Object.entries(COUNTRY_DIALING_CODES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return null;
}

function normalizePhone(phone: string, country?: string): string {
  let cleaned = String(phone || '').replace(/\D/g, '');
  
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  const cc = getCountryDialingCode(country);

  if (cc) {
    if (cleaned.startsWith(cc) && cleaned.length > 9) {
      return cleaned;
    }
    return `${cc}${cleaned}`;
  }

  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    cleaned = `90${cleaned}`;
  }
  return cleaned;
}

async function getSessionId(req: Request, userId: string): Promise<string> {
  const querySessionId = (req.query.sessionId as string) || (req.body.sessionId as string);
  if (querySessionId) return querySessionId;
  const activeSession = await WhatsAppSession.findOne({ userId, status: 'CONNECTED' });
  if (activeSession) return activeSession._id.toString();
  const anySession = await WhatsAppSession.findOne({ userId });
  return anySession ? anySession._id.toString() : userId; // fallback to userId
}

// GET all WhatsApp sessions for a user
app.get('/api/whatsapp/sessions', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessions = await WhatsAppSession.find({ userId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch sessions' });
  }
});

// POST create a new WhatsApp session with subscription plan limits checking
app.post('/api/whatsapp/sessions', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { sessionName } = req.body;

    const planLimits: Record<string, number> = {
      free: 0,
      starter: 1,
      pro: 3,
      enterprise: 10,
    };

    const userPlan = user.plan || 'free';
    const limit = planLimits[userPlan] !== undefined ? planLimits[userPlan] : 0;

    const currentSessionsCount = await WhatsAppSession.countDocuments({ userId });

    if (currentSessionsCount >= limit) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_REACHED',
        message: `Planınız (${userPlan}) en fazla ${limit} WhatsApp hesabı eklemenize izin veriyor. Lütfen planınızı yükseltin.`,
        limit,
      });
    }

    const sessionId = new mongoose.Types.ObjectId().toString();
    const newSession = await WhatsAppSession.create({
      _id: sessionId,
      userId,
      sessionName: sessionName || 'WhatsApp Hesabı',
      status: 'DISCONNECTED',
    });

    try {
      await callWaEngine(`/connect/${sessionId}`, userId, { method: 'POST' });
    } catch (engineError) {
      console.error('Failed to trigger connection in wa-engine:', engineError);
    }

    res.status(201).json(newSession);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create WhatsApp session' });
  }
});

// PUT rename a WhatsApp session
app.put('/api/whatsapp/sessions/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessionId = req.params.id;
    const { sessionName } = req.body;

    const session = await WhatsAppSession.findOneAndUpdate(
      { _id: sessionId, userId },
      { $set: { sessionName, updatedAt: new Date() } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'WhatsApp session not found' });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update session' });
  }
});

// DELETE disconnect and remove a WhatsApp session
app.delete('/api/whatsapp/sessions/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessionId = req.params.id;

    const session = await WhatsAppSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: 'WhatsApp session not found' });
    }

    try {
      await callWaEngine(`/logout/${sessionId}`, userId, { method: 'POST' });
    } catch (engineError) {
      console.error('Failed to logout session in wa-engine:', engineError);
    }

    await WhatsAppSession.deleteOne({ _id: sessionId, userId });

    res.json({ success: true, message: 'WhatsApp session disconnected and removed' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to delete session' });
  }
});

// Start a new WhatsApp chat
app.post('/api/whatsapp/chats/start', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { phone, content } = req.body;
    const userId = getUserId(req);
    const sessionId = await getSessionId(req, userId);
    
    // Find the lead by this phone number to get its country
    let targetCountry: string | undefined = undefined;
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly) {
      const last10 = digitsOnly.slice(-10);
      const lead = await Lead.findOne(userScope(req, {
        phone: { $regex: last10 }
      }));
      if (lead) {
        targetCountry = lead.country;
      }
    }

    // Format phone to JID
    const cleanPhone = normalizePhone(phone, targetCountry);
    const chatJid = `${cleanPhone}@c.us`;

    // Upsert the Chat
    let chat = await WhatsAppChat.findOne({ userId, sessionId, jid: chatJid });
    if (!chat) {
      chat = await WhatsAppChat.create({
        _id: `${userId}:${sessionId}:${chatJid}`,
        userId,
        sessionId,
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
        userId,
        sessionId,
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
        sessionId,
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
    const userId = getUserId(req);
    const sessionId = await getSessionId(req, userId);
    
    const query: any = { userId, sessionId };

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

app.get('/api/whatsapp/unread-count', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const chats = await WhatsAppChat.find({ userId });
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    res.json({ count: totalUnread });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch unread count' });
  }
});

app.post('/api/whatsapp/analyze-intent', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { leadId, message } = req.body;
    const userId = getUserId(req);
    
    const lead = await Lead.findOne({ userId, _id: leadId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const analysis = await aiService.analyzeMessageIntent(lead, message);
    
    // Auto-update status if AI suggests it and it's a significant change
    if (analysis.suggestedStatus && analysis.suggestedStatus !== lead.status) {
      const oldStatus = lead.status;
      lead.status = analysis.suggestedStatus;
      
      // Log as activity
      lead.activities = lead.activities || [];
      lead.activities.push({
        id: new mongoose.Types.ObjectId().toString(),
        type: 'STATUS_CHANGED',
        description: `Yapay Zekâ niyet tespiti (${analysis.intent}): Durum ${oldStatus} -> ${analysis.suggestedStatus} olarak güncellendi. Nedeni: ${analysis.reasoning}`,
        createdAt: new Date()
      });
      
      await lead.save();
    }

    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to analyze intent' });
  }
});

// Internal endpoint for WhatsApp engine to get AI sequence replies
app.post('/api/internal/ai/sequence-reply', async (req: Request, res: Response) => {
  try {
    const { leadId, lastMessage, aiPrompt, userId } = req.body;
    const lead = await Lead.findOne({ userId, externalId: leadId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const reply = await aiService.generateSequenceAIResponse(lead, lastMessage, aiPrompt);
    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to generate AI response' });
  }
});

// Retrieve message history for a chat
app.get('/api/whatsapp/chats/:chatId/messages', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before ? new Date(req.query.before as string) : new Date();
    const userId = getUserId(req);
    const sessionId = await getSessionId(req, userId);

    // Try to find the chat first to resolve the correct ID and session context
    const chat = await WhatsAppChat.findOne({
      userId,
      $or: [{ _id: chatId }, { id: chatId }, { jid: chatId }]
    });
    const resolvedChatId = chat?.jid || chat?._id?.toString() || chat?.id || chatId;
    const chatSessionId = chat?.sessionId || sessionId;

    // Search by all possible chat ID formats (MongoDB _id, JID)
    const possibleIds = [resolvedChatId, chat?._id?.toString(), chat?.jid, chat?.id].filter(Boolean);
    const query: any = {
      userId,
      $or: [...new Set(possibleIds)].map(id => ({ chatId: id })),
      timestamp: { $lt: before }
    };

    // If we have a session ID context (either from the chat or the current active session), use it
    if (chatSessionId) {
      query.sessionId = chatSessionId;
    }

    const messages = await WhatsAppMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(limit + 1)
      .lean();

    // Fetch and attach media for these messages
    const messagesWithMedia = await Promise.all(messages.map(async (msg) => {
      const media = await WhatsAppMedia.find({ messageId: msg._id }).lean();
      return { ...msg, media };
    }));

    const hasMore = messagesWithMedia.length > limit;
    if (hasMore) messagesWithMedia.pop();

    // nextCursor = oldest message's timestamp in this batch (last item when sorted newest-first)
    const nextCursor = messagesWithMedia.length > 0 ? messagesWithMedia[messagesWithMedia.length - 1].timestamp : null;

    res.json({
      messages: messagesWithMedia.reverse(), // oldest first for chat display
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
    const { body, content, media, type, mediaUrl, mimeType, fileName } = req.body;
    const userId = getUserId(req);
    const sessionId = await getSessionId(req, userId);
    const msgText = body || content || '';

    // Resolve actual JID from chat ID
    let actualJid = chatId;
    const chat = await WhatsAppChat.findOne({
      userId,
      sessionId,
      $or: [{ _id: chatId }, { id: chatId }, { jid: chatId }]
    });
    if (chat && chat.jid) {
      actualJid = chat.jid;
    }

    const messageId = new mongoose.Types.ObjectId().toString();

    // Handle base64 media if provided (Legacy/Dashboard Direct Flow)
    let finalMediaPath = media?.localPath;
    let finalMimeType = media?.mimeType || mimeType;
    let finalFileName = media?.fileName || fileName;

    if (media?.data && media.data.includes('base64,')) {
      try {
        const base64Data = media.data.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const subdir = 'outgoing';
        // Use the path that is mounted in whatsapp-engine's /app/media/whatsapp volume
        const dir = path.join('/app/media/whatsapp', subdir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const ext = finalMimeType ? `.${finalMimeType.split('/')[1]}` : '';
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const localPath = path.join(dir, name);
        fs.writeFileSync(localPath, buffer);
        
        // Convert the container-internal path /app/media/whatsapp/outgoing/... to the path expected by the engine container
        // Since both have /app/media/whatsapp mounted at the same internal path, we can use the same path string.
        finalMediaPath = localPath;
        if (!finalFileName) finalFileName = name;
        console.log(`[MediaUpload] Saved base64 media to ${localPath}`);

        // Create the media record immediately so it's visible in the UI
        await WhatsAppMedia.create({
          _id: new mongoose.Types.ObjectId().toString(),
          userId,
          messageId,
          fileName: finalFileName,
          mimeType: finalMimeType,
          localPath: finalMediaPath,
          publicUrl: `/media/whatsapp/${subdir}/${name}`,
          size: buffer.length,
        });
      } catch (err) {
        console.error('[MediaUpload] Failed to save base64 media:', err);
      }
    }

    // Support production-grade Media Message Job Schema
    if (type && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(type)) {
      if (!mediaUrl) {
        return res.status(400).json({ error: 'mediaUrl is required for media message jobs' });
      }

      const newMessage = await WhatsAppMessage.create({
        _id: messageId,
        userId,
        sessionId,
        chatId: actualJid,
        direction: 'OUTGOING',
        status: 'QUEUED',
        type: type.toLowerCase(),
        body: msgText || `[Sent Media: ${type}]`,
        timestamp: new Date(),
      });

      // Enqueue to the queue using new send-media-job name
      await singleMessageQueue.add('send-media-job', {
        sessionId: sessionId,
        chatId: actualJid,
        type: type,
        mediaUrl: mediaUrl,
        caption: msgText || undefined,
        mimeType: mimeType,
        fileName: fileName,
        metadata: { messageId }
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      });

      return res.json(newMessage);
    }

    // Existing fallback behavior
    const newMessage = await WhatsAppMessage.create({
      _id: messageId,
      userId,
      sessionId,
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
      sessionId,
      mediaPath: finalMediaPath,
      mediaMimeType: finalMimeType,
      mediaFileName: finalFileName,
    });

    res.json(newMessage);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to send WhatsApp message' });
  }
});

// Trigger connection/sync on WhatsApp engine
app.post('/api/whatsapp/sync', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessionId = await getSessionId(req, userId);
    await callWaEngine(`/sync/${sessionId}`, userId, { method: 'POST' });
    res.json({ success: true, message: 'Sync connection initiated' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to trigger WhatsApp sync' });
  }
});

// Get WhatsApp sync status
app.get('/api/whatsapp/sync/status', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessionId = await getSessionId(req, userId);
    const syncState = await WhatsAppSyncState.findOne({ userId, sessionId });
    res.json(syncState || { status: 'IDLE' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch sync status' });
  }
});

// Convert WhatsApp contact to a Lead
app.post('/api/whatsapp/contacts/:contactId/convert-lead', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const contact = await WhatsAppContact.findOne(userScope(req, { _id: contactId }));
    if (!contact) {
      return res.status(404).json({ error: 'WhatsApp contact not found' });
    }

    const leadId = new mongoose.Types.ObjectId().toString();
    const cleanPhone = contact.phone || contact.jid.split('@')[0];

    const lead = await Lead.create({
      _id: leadId,
      userId: getUserId(req),
      externalId: leadId,
      name: contact.name || contact.pushName || cleanPhone,
      businessName: contact.name || contact.pushName || `WA Contact - ${cleanPhone}`,
      phone: cleanPhone,
      source: 'WHATSAPP',
      status: 'NEW',
    });

    contact.leadId = leadId;
    await contact.save();

    await WhatsAppChat.updateOne(userScope(req, { contactId }), { leadId });

    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to convert contact to lead' });
  }
});

// Suggest AI Reply based on chat history
app.post('/api/ai/suggest-reply', authenticateApiKey, requireStarterPlan, async (req: Request, res: Response) => {
  try {
    const { leadId, history, promptContext } = req.body;
    let lead = null;
    if (leadId) {
      lead = await Lead.findOne(userScope(req, { externalId: leadId }));
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
app.post('/api/whatsapp/enqueue', authenticateApiKey, requireStarterPlan, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { leadId, content } = req.body;
    if (!leadId || !content) return res.status(400).json({ error: 'leadId and content are required' });

    const lead = await Lead.findOne(scopedIdQuery(req, leadId));
    if (!lead?.phone) return res.status(404).json({ error: 'Lead with phone not found' });

    const messageId = new mongoose.Types.ObjectId().toString();
    await singleMessageQueue.add('send-message', {
      logId: messageId,
      leadId: lead._id.toString(),
      phone: lead.phone,
      content,
      userId,
    });

    res.json({ success: true, messageId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enqueue message' });
  }
});

// Get users
app.get('/api/users', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(getUserId(req));
    res.json(user ? [publicUser(user)] : []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Pipeline Stages endpoints
app.get('/api/pipeline-stages', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const stages = await PipelineStage.find(userScope(req)).sort({ order: 1 });
    res.json(stages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pipeline stages' });
  }
});

app.post('/api/pipeline-stages', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const stage = new PipelineStage({ ...req.body, userId: getUserId(req) });
    await stage.save();
    res.status(201).json(stage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pipeline stage' });
  }
});

app.put('/api/pipeline-stages/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const stage = await PipelineStage.findOneAndUpdate(
      userScope(req, { _id: req.params.id }),
      { $set: req.body },
      { new: true }
    );
    if (!stage) return res.status(404).json({ error: 'Pipeline stage not found' });
    res.json(stage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pipeline stage' });
  }
});

app.delete('/api/pipeline-stages/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const stage = await PipelineStage.findOneAndDelete(userScope(req, { _id: req.params.id }));
    if (!stage) return res.status(404).json({ error: 'Pipeline stage not found' });
    res.json({ message: 'Pipeline stage deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pipeline stage' });
  }
});

// Get tags
app.get('/api/tags', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const tags = await Tag.find(userScope(req)).sort({ name: 1 });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.post('/api/tags', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const tag = new Tag({ ...req.body, userId: getUserId(req) });
    await tag.save();
    res.status(201).json(tag);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

app.delete('/api/tags/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const tag = await Tag.findOneAndDelete(userScope(req, { _id: req.params.id }));
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Get stats for dashboard (supports filtering)
app.get('/api/stats', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const query = userScope(req, buildLeadsQuery(req.query));

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
      query = userScope(req, buildLeadsQuery(filters || {}));
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      const objectIds = leadIds.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      query = {
        userId: getUserId(req),
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
      await SequenceState.deleteMany(userScope(req, { leadId: { $in: leadIdsToDelete } }));
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
      query = userScope(req, buildLeadsQuery(filters || {}));
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      const objectIds = leadIds.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      query = {
        userId: getUserId(req),
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
app.post('/api/leads/bulk-enroll-sequence', authenticateApiKey, requireProPlan, async (req: Request, res: Response) => {
  try {
    const { leadIds, filters, selectAll, sequenceId } = req.body;
    if (!sequenceId) {
      return res.status(400).json({ error: 'Sequence ID is required' });
    }

    const userId = getUserId(req);
    const sequence = await Sequence.findOne({ userId, _id: sequenceId });
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    let query: any = {};

    if (selectAll) {
      query = userScope(req, buildLeadsQuery(filters || {}));
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      const objectIds = leadIds.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      query = {
        userId,
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
      const existing = await SequenceState.findOne({ userId, sequenceId: sequence._id, leadId: lead._id });
      if (existing) {
        skippedCount++;
        continue;
      }

      const state = new SequenceState({
        userId,
        sequenceId: sequence._id,
        leadId: lead._id,
        currentStepIndex: 0,
        currentStepId: sequence.steps?.[0]?.id,
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
app.post('/api/leads/ai-filter', authenticateApiKey, requireStarterPlan, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Sorgu metni (prompt) zorunludur' });
    }

    const aiResult = await aiService.processSmartAIFilter(prompt);
    
    // Query leads with AI filters using buildLeadsQuery
    const query = userScope(req, buildLeadsQuery(aiResult.mongoFilters || {}));
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
    const lead = await Lead.findOneAndDelete(scopedIdQuery(req, req.params.id as string));
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Clean up related SequenceState documents
    await SequenceState.deleteMany(userScope(req, { leadId: lead._id }));

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
    let query: any = userScope(req);

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

    const user = await User.findById(req.user?.id);
    let leads;
    if (user?.plan === 'free') {
      leads = await Lead.find(query).sort({ createdAt: -1 }).limit(10);
    } else {
      leads = await Lead.find(query).sort({ createdAt: -1 });
    }

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
app.get('/api/campaigns', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const campaignsList = await Campaign.find({ userId }).sort({ createdAt: -1 });

    const results = await Promise.all(campaignsList.map(async (camp: any) => {
      let query: any = { userId };
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
    const userId = getUserId(req);
    const camp = await Campaign.findOne({ userId, _id: req.params.id });
    if (!camp) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let query: any = { userId };
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

app.post('/api/campaigns', authenticateApiKey, requireProPlan, async (req: Request, res: Response) => {
  try {
    const newCamp = new Campaign({ ...req.body, userId: getUserId(req) });
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
    const updatedCamp = await Campaign.findOneAndUpdate(
      { userId: getUserId(req), _id: req.params.id },
      { $set: { ...req.body, userId: getUserId(req) } },
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
    const deletedCamp = await Campaign.findOneAndDelete({ userId: getUserId(req), _id: req.params.id });
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
  logger.info({ port: PORT }, '🚀 Server running');
});

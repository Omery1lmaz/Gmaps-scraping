import mongoose from 'mongoose';
import crypto from 'crypto';
import * as Models from './models/index.js';

// Generate a unique string ID for models that use _id: String
function generateId(): string {
  return crypto.randomUUID();
}

// Ensure MongoDB is connected before any operation
async function ensureConnected() {
  if (mongoose.connection.readyState !== 1) {
    const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://mongo:27017/gmaps-lead-scraper';
    await mongoose.connect(MONGODB_URL);
    console.log('[MongoService] Connected to MongoDB');
  }
}

// Helper: build Mongoose filter from Prisma-style where clause
function buildFilter(where: any): any {
  if (!where) return {};
  const filter: any = {};

  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(value)) {
      filter.$or = value.map((clause: any) => buildFilter(clause));
    } else if (key === 'AND' && Array.isArray(value)) {
      filter.$and = value.map((clause: any) => buildFilter(clause));
    } else if (key === 'NOT' && typeof value === 'object') {
      filter.$not = buildFilter(value);
    } else if (key === 'id') {
      filter._id = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const op: any = {};
      if ('equals' in value && value.equals !== undefined) op.$eq = value.equals;
      if ('not' in value && value.not !== undefined) op.$ne = value.not;
      if ('in' in value && value.in !== undefined) op.$in = value.in;
      if ('notIn' in value && value.notIn !== undefined) op.$nin = value.notIn;
      if ('lt' in value && value.lt !== undefined) op.$lt = value.lt;
      if ('lte' in value && value.lte !== undefined) op.$lte = value.lte;
      if ('gt' in value && value.gt !== undefined) op.$gt = value.gt;
      if ('gte' in value && value.gte !== undefined) op.$gte = value.gte;
      if ('contains' in value && value.contains !== undefined) op.$regex = value.contains;
      if (Object.keys(op).length > 0) {
        filter[key] = op;
      } else {
        filter[key] = value;
      }
    } else {
      filter[key] = value;
    }
  }
  return filter;
}

// Helper: convert Prisma orderBy to Mongoose sort
function buildSort(orderBy: any): any {
  if (!orderBy) return {};
  if (typeof orderBy === 'object' && !Array.isArray(orderBy)) {
    const sort: any = {};
    for (const [key, val] of Object.entries(orderBy)) {
      sort[key] = val === 'asc' ? 1 : -1;
    }
    return sort;
  }
  return {};
}

class MongoService {
  get user() { return this.createModelApi(Models.User); }
  get tag() { return this.createModelApi(Models.Tag); }
  get note() { return this.createModelApi(Models.Note); }
  get activity() { return this.createModelApi(Models.Activity); }
  get lead() { return this.createModelApi(Models.Lead); }
  get whatsAppSession() { return this.createModelApi(Models.WhatsAppSession); }
  get whatsAppSyncState() { return this.createModelApi(Models.WhatsAppSyncState); }
  get whatsAppContact() { return this.createModelApi(Models.WhatsAppContact); }
  get whatsAppChat() { return this.createModelApi(Models.WhatsAppChat); }
  get whatsAppMessage() { return this.createModelApi(Models.WhatsAppMessage); }
  get whatsAppMedia() { return this.createModelApi(Models.WhatsAppMedia); }
  get whatsAppMediaDLQ() { return this.createModelApi(Models.WhatsAppMediaDLQ); }
  get messageTemplate() { return this.createModelApi(Models.MessageTemplate); }
  get campaign() { return this.createModelApi(Models.Campaign); }
  get campaignLead() { return this.createModelApi(Models.CampaignLead); }
  get sequence() { return this.createModelApi(Models.Sequence); }

  get sequenceState() { return this.createModelApi(Models.SequenceState); }
  get messageLog() { return this.createModelApi(Models.MessageLog); }
  get aIGeneration() { return this.createModelApi(Models.AIGeneration); }

  private createModelApi(model: mongoose.Model<any>) {
    return {
      findUnique: async (args: { where: any; include?: any }) => {
        await ensureConnected();
        const filter = buildFilter(args.where);
        const doc = await model.findOne(filter).lean();
        if (!doc) return null;
        return { ...doc, id: (doc as any)._id };
      },

      findFirst: async (args: { where: any; orderBy?: any; include?: any }) => {
        await ensureConnected();
        const filter = buildFilter(args.where);
        let query = model.findOne(filter);
        if (args.orderBy) query = query.sort(buildSort(args.orderBy));
        const doc = await query.lean();
        if (!doc) return null;
        return { ...doc, id: (doc as any)._id };
      },

      findMany: async (args: { where?: any; orderBy?: any; take?: number; include?: any }) => {
        await ensureConnected();
        const filter = buildFilter(args.where || {});
        let query = model.find(filter);
        if (args.orderBy) query = query.sort(buildSort(args.orderBy));
        if (args.take) query = query.limit(args.take);
        const docs = await query.lean();
        return docs.map((d: any) => ({ ...d, id: d._id }));
      },

      create: async (args: { data: any; include?: any }) => {
        await ensureConnected();
        const docData: any = {};
        for (const [key, value] of Object.entries(args.data)) {
          docData[key === 'id' ? '_id' : key] = value;
        }
        if (!docData._id) {
          docData._id = generateId();
        }
        const doc = await model.create(docData);
        return { ...doc.toObject(), id: doc._id };
      },

      update: async (args: { where: any; data: any; include?: any }) => {
        await ensureConnected();
        const filter = buildFilter(args.where);
        const updateData: any = {};
        for (const [key, value] of Object.entries(args.data)) {
          updateData[key] = value;
        }
        const doc = await model.findOneAndUpdate(filter, { $set: updateData }, { returnDocument: 'after' }).lean();
        if (!doc) return null;
        return { ...doc, id: (doc as any)._id };
      },

      updateMany: async (args: { where: any; data: any }) => {
        await ensureConnected();
        const filter = buildFilter(args.where);
        const updateData: any = {};
        for (const [key, value] of Object.entries(args.data)) {
          updateData[key] = value;
        }
        const result = await model.updateMany(filter, { $set: updateData });
        return { count: result.modifiedCount };
      },

      upsert: async (args: { where: any; update: any; create: any }) => {
        await ensureConnected();
        const filter = buildFilter(args.where);

        const updateData: any = {};
        for (const [key, value] of Object.entries(args.update)) {
          if (value !== undefined) updateData[key] = value;
        }

        const createData: any = {};
        for (const [key, value] of Object.entries(args.create)) {
          if (value !== undefined) createData[key === 'id' ? '_id' : key] = value;
        }
        
        if (!createData._id) {
          if (filter._id && typeof filter._id === 'string') {
            createData._id = filter._id;
          } else {
            createData._id = generateId();
          }
        }

        // To avoid 'ConflictingUpdateOperators', a field cannot be in both $set and $setOnInsert.
        // Logic:
        // 1. All fields in 'update' go to $set (applied on update AND on insert).
        // 2. All fields in 'create' that are NOT in 'update' go to $setOnInsert (applied ONLY on insert).
        const setOnInsertData: any = {};
        for (const [key, value] of Object.entries(createData)) {
          if (!(key in updateData)) {
            setOnInsertData[key] = value;
          }
        }

        try {
          const doc = await model.findOneAndUpdate(
            filter,
            { 
              $set: updateData,
              $setOnInsert: setOnInsertData
            },
            { upsert: true, returnDocument: 'after', lean: true }
          );
          return { ...doc, id: (doc as any)._id };
        } catch (error: any) {
          if (error.code === 11000) {
            // If we still get a duplicate key error, it might be due to a race condition on a unique index 
            // that is NOT part of the filter, or the filter itself if multiple upserts happen simultaneously.
            // In case of E11000, we try one more time by finding and updating.
            const existing = await model.findOne(filter).lean();
            if (existing) {
              const doc = await model.findOneAndUpdate(filter, { $set: updateData }, { returnDocument: 'after', lean: true });
              return { ...doc, id: (doc as any)._id };
            }
          }
          throw error;
        }
      },

      count: async (args: { where?: any }) => {
        await ensureConnected();
        return model.countDocuments(buildFilter(args.where || {}));
      },

      delete: async (args: { where: any }) => {
        await ensureConnected();
        await model.deleteOne(buildFilter(args.where));
        return {};
      },

      deleteMany: async (args: { where: any }) => {
        await ensureConnected();
        const result = await model.deleteMany(buildFilter(args.where));
        return { count: result.deletedCount };
      },
    };
  }
}

const mongoService = new MongoService();
export default mongoService;
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Lead from './models/Lead';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Key Authentication Middleware
const authenticateApiKey = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.API_KEY;
  if (validKey && apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmaps-leads';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Endpoints

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
          name: lead.name,
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

// Fetch leads with advanced filtering
app.get('/api/leads', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { minRating, minReviews, category, hasPhone, hasWebsite, search, isOpenNow, priceLevel, city,
            createdAfter, createdBefore, hasOpeningHours, hasDescription, hasServiceOptions,
            hasPlusCode, hasAddress, serviceOption, minPhotos } = req.query;

    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
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

    // Service option filter (contains specific service)
    if (serviceOption) query.serviceOptions = serviceOption;

    // Total photos filter
    if (minPhotos) query.totalPhotos = { $gte: Number(minPhotos) };

    const leads = await Lead.find(query).sort({ createdAt: -1 });
    res.json(leads);
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

// Get stats for dashboard
app.get('/api/stats', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const categoryStats = await Lead.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ totalLeads, categoryStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Delete a lead
app.delete('/api/leads/:id', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
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
      l.name,
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

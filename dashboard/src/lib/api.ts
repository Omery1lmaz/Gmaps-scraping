import axios, { type AxiosInstance } from 'axios';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// Add JWT auth to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('leadflow_auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface LeadsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  city?: string;
  search?: string;
  category?: string;
  minRating?: number;
  minReviews?: number;
  hasPhone?: string;     // 'true' | 'false' | 'all'
  hasWebsite?: string;   // 'true' | 'false' | 'all'
  isOpenNow?: string;    // 'true' | 'false'
  priceLevel?: string;
  createdAfter?: string;
  createdBefore?: string;
  hasOpeningHours?: string;
  hasDescription?: string;
  hasServiceOptions?: string;
  hasPlusCode?: string;
  hasAddress?: string;
  serviceOption?: string;
  minPhotos?: number;
  inPipeline?: boolean;
  notInPipeline?: boolean;
}

export interface Lead {
  id: string;
  _id?: string;
  businessName: string;
  name?: string;
  rating?: number;
  reviews?: number;
  reviewCount?: number;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  url?: string;
  status?: string;
  openingHours?: Record<string, string>;
  isOpenNow?: boolean;
  priceLevel?: string;
  serviceOptions?: string[];
  description?: string;
  totalPhotos?: number;
  tags?: Array<{ id: string; name: string; color: string }>;
  notes?: Array<{ id: string; content: string; createdAt: string }>;
  activities?: Array<{ id: string; type: string; description: string; createdAt: string }>;
  messageLogs?: Array<{ id: string; content: string; direction: 'INCOMING' | 'OUTGOING'; status: string; createdAt: string }>;
  assignedTo?: { id: string; name: string; email: string; avatar: string };
  leadSequenceStates?: Array<{ id: string; status: string; sequence: { id: string; name: string } }>;
  aiQualityScore?: number;
  aiResponseLikelihood?: number;
  aiOutreachFit?: string;
  aiAnalysisSummary?: string;
  _count?: { notes: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Function to fetch leads (returns a Promise)
export const fetchLeads = async (params: LeadsParams = {}): Promise<LeadsResponse> => {
  const response = await api.get('/leads', { params });
  return response.data;
};

// For direct use without React Query
export const getLeads = (params: LeadsParams = {}) => fetchLeads(params);
export const getLead = (id: string) => api.get(`/leads/${id}`).then(res => res.data);
export const updateLead = (id: string, data: any) => api.patch(`/leads/${id}`, data).then(res => res.data);
export const addNote = (id: string, content: string) => api.post(`/leads/${id}/notes`, { content }).then(res => res.data);
export const updateNote = (leadId: string, noteId: string, content: string) => api.put(`/leads/${leadId}/notes/${noteId}`, { content }).then(res => res.data);
export const deleteNote = (leadId: string, noteId: string) => api.delete(`/leads/${leadId}/notes/${noteId}`).then(res => res.data);
export const getUsers = () => api.get('/users').then(res => res.data);
export const getTags = () => api.get('/tags').then(res => res.data);
export const getCategories = (): Promise<string[]> => api.get('/categories').then(res => res.data);
export const getCities = (): Promise<string[]> => api.get('/cities').then(res => res.data);
export const getStats = (params: LeadsParams = {}) => api.get('/stats', { params }).then(res => res.data);

// Bulk actions
export const bulkDeleteLeads = (data: { leadIds?: string[]; filters?: LeadsParams; selectAll?: boolean }) =>
  api.post('/leads/bulk-delete', data).then(res => res.data);

export const bulkUpdateLeadsStatus = (data: { leadIds?: string[]; filters?: LeadsParams; selectAll?: boolean; status: string }) =>
  api.post('/leads/bulk-update-status', data).then(res => res.data);

export const bulkEnrollLeadsInSequence = (data: { leadIds?: string[]; filters?: LeadsParams; selectAll?: boolean; sequenceId: string }) =>
  api.post('/leads/bulk-enroll-sequence', data).then(res => res.data);

export const aiFilterLeads = (prompt: string): Promise<{
  success: boolean;
  matchedPackageName: string;
  matchedPackagePrice: string;
  marketingStrategy: string;
  mongoFilters: LeadsParams;
  leads: Lead[];
}> => api.post('/leads/ai-filter', { prompt }).then(res => res.data);

// Campaigns
export const getCampaigns = () => api.get('/campaigns').then(res => res.data);
export const getCampaign = (id: string) => api.get(`/campaigns/${id}`).then(res => res.data);
export const createCampaign = (data: any) => api.post('/campaigns', data).then(res => res.data);
export const updateCampaignStatus = (id: string, status: string) => api.patch(`/campaigns/${id}`, { status }).then(res => res.data);
export const getCampaignAnalytics = (id: string) => api.get(`/campaigns/${id}/analytics`).then(res => res.data);

// Templates
export const getTemplates = () => api.get('/templates').then(res => res.data);
export const createTemplate = (data: any) => api.post('/templates', data).then(res => res.data);
export const updateTemplate = (id: string, data: any) => api.put(`/templates/${id}`, data).then(res => res.data);
export const deleteTemplate = (id: string) => api.delete(`/templates/${id}`).then(res => res.data);

// Sequences
export const getSequences = () => api.get('/sequences').then(res => res.data);
export const getSequenceDetails = (id: string) => api.get(`/sequences/${id}`).then(res => res.data);
export const createSequence = (data: any) => api.post('/sequences', data).then(res => res.data);
export const updateSequence = (id: string, data: any) => api.patch(`/sequences/${id}`, data).then(res => res.data);
export const deleteSequence = (id: string) => api.delete(`/sequences/${id}`).then(res => res.data);
export const enrollLeadInSequence = (leadId: string, sequenceId: string) => api.post(`/leads/${leadId}/sequences`, { sequenceId }).then(res => res.data);
export const updateSequenceState = (stateId: string, status: string, additionalData: any = {}) => api.patch(`/sequences/states/${stateId}`, { status, ...additionalData }).then(res => res.data);
export const deleteSequenceState = (stateId: string) => api.delete(`/sequences/states/${stateId}`).then(res => res.data);
export const pauseSequence = (id: string) => api.post(`/sequences/${id}/pause`).then(res => res.data);
export const resumeSequence = (id: string) => api.post(`/sequences/${id}/resume`).then(res => res.data);
export const restartSequence = (id: string) => api.post(`/sequences/${id}/restart`).then(res => res.data);
export const clearSequence = (id: string) => api.post(`/sequences/${id}/clear`).then(res => res.data);

// Meetings
export const getMeetings = () => api.get('/meetings').then(res => res.data);
export const createMeeting = (data: any) => api.post('/meetings', data).then(res => res.data);

// Calendar Integrations
export const getGoogleAuthUrl = () => api.get('/calendar/google/auth').then(res => res.data);
export const connectGoogleCalendar = (code: string) => api.post('/calendar/google/connect', { code }).then(res => res.data);
export const getCalendarConnections = () => api.get('/calendar/connections').then(res => res.data);
export const deleteCalendarConnection = (provider: string) => api.delete(`/calendar/connections/${provider}`).then(res => res.data);
export const getCalendarEvents = () => api.get('/calendar/events').then(res => res.data);
export const syncCalendar = () => api.post('/calendar/sync').then(res => res.data);

// Create waApi instance for WhatsApp Engine requests
const waApi: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002',
});

// Add JWT auth to every request
waApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('leadflow_auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { api, waApi };

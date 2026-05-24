import axios from 'axios';
import CalendlyIntegration from './models/CalendlyIntegration';
import User from './models/User';
import Meeting from './models/Meeting';
import Lead from './models/Lead';

const CALENDLY_CLIENT_ID = process.env.CALENDLY_CLIENT_ID || '';
const CALENDLY_CLIENT_SECRET = process.env.CALENDLY_CLIENT_SECRET || '';
const CALENDLY_REDIRECT_URI = process.env.CALENDLY_REDIRECT_URI || 'http://localhost:3001/api/calendly/callback';

export class CalendlyService {
  /**
   * Check if we are running in mock/sandbox mode (no env credentials configured)
   */
  private static isMockMode(): boolean {
    return !CALENDLY_CLIENT_ID || !CALENDLY_CLIENT_SECRET;
  }

  /**
   * Generates the Calendly OAuth redirection URL
   */
  static getAuthUrl(): string {
    if (this.isMockMode()) {
      // Direct mock redirection to simulation endpoint
      console.log('[CalendlyService] No client credentials found. Directing to sandbox OAuth.');
      return `${CALENDLY_REDIRECT_URI}?code=mock_sandbox_auth_code_2026`;
    }
    
    return `https://auth.calendly.com/oauth/authorize?client_id=${CALENDLY_CLIENT_ID}&redirect_uri=${encodeURIComponent(CALENDLY_REDIRECT_URI)}&response_type=code`;
  }

  /**
   * Exchanges authorization code for Calendly access & refresh tokens
   */
  static async handleCallback(code: string, userId: string) {
    console.log(`[CalendlyService] Handling OAuth callback for user: ${userId}`);

    let accessToken: string;
    let refreshToken: string;
    let expiresAt: Date;
    let userUri: string;
    let organizationUri: string;
    let schedulingUrl: string;

    if (this.isMockMode() || code.startsWith('mock_')) {
      // Mock Sandbox authorization
      console.log('[CalendlyService] Executing in SANDBOX mock mode');
      accessToken = `mock_access_token_${Math.random().toString(36).substring(2)}`;
      refreshToken = `mock_refresh_token_${Math.random().toString(36).substring(2)}`;
      expiresAt = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours expiry
      userUri = 'https://api.calendly.com/users/mock_user_123';
      organizationUri = 'https://api.calendly.com/organizations/mock_org_456';
      schedulingUrl = 'https://calendly.com/mock-wpaiflow-sandbox';
    } else {
      // Real API exchange
      try {
        const tokenRes = await axios.post('https://auth.calendly.com/oauth/token', 
          new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: CALENDLY_REDIRECT_URI,
            client_id: CALENDLY_CLIENT_ID,
            client_secret: CALENDLY_CLIENT_SECRET,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const data = tokenRes.data;
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000);

        // Fetch User and Org URIs from Calendly /users/me
        const userRes = await axios.get('https://api.calendly.com/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        userUri = userRes.data.resource.uri;
        organizationUri = userRes.data.resource.current_organization;
        schedulingUrl = userRes.data.resource.scheduling_url;
      } catch (err: any) {
        console.error('[CalendlyService] OAuth exchange failed:', err.response?.data || err.message);
        throw new Error('Calendly OAuth exchange failed');
      }
    }

    // Save or update integration
    const integration = await CalendlyIntegration.findOneAndUpdate(
      { userId },
      {
        userId,
        accessToken,
        refreshToken,
        expiresAt,
        organizationUri,
        userUri,
        schedulingUrl,
        connectedAt: new Date(),
        syncStatus: 'idle'
      },
      { upsert: true, new: true }
    );

    return integration;
  }

  /**
   * Refreshes the Calendly access token securely
   */
  static async refreshAccessToken(userId: string) {
    const integration = await CalendlyIntegration.findOne({ userId });
    if (!integration) throw new Error('No Calendly integration found');

    if (this.isMockMode() || integration.refreshToken.startsWith('mock_')) {
      console.log('[CalendlyService] Mock token refresh invoked');
      integration.accessToken = `mock_access_token_refreshed_${Math.random().toString(36).substring(2)}`;
      integration.expiresAt = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours
      await integration.save();
      return integration.accessToken;
    }

    try {
      const res = await axios.post('https://auth.calendly.com/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refreshToken,
          client_id: CALENDLY_CLIENT_ID,
          client_secret: CALENDLY_CLIENT_SECRET,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const data = res.data;
      integration.accessToken = data.access_token;
      integration.refreshToken = data.refresh_token || integration.refreshToken; // Use new if provided
      integration.expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000);
      await integration.save();

      console.log(`[CalendlyService] Token refreshed successfully for user: ${userId}`);
      return integration.accessToken;
    } catch (err: any) {
      console.error('[CalendlyService] Token refresh failed:', err.response?.data || err.message);
      integration.syncStatus = 'failed';
      await integration.save();
      throw new Error('Failed to refresh Calendly token');
    }
  }

  /**
   * Get valid access token (refreshes automatically if expired)
   */
  private static async getValidToken(userId: string): Promise<string> {
    const integration = await CalendlyIntegration.findOne({ userId });
    if (!integration) throw new Error('Calendly integration not found');

    const bufferMs = 5 * 60 * 1000; // 5 min safety buffer
    if (integration.expiresAt && new Date(integration.expiresAt.getTime() - bufferMs) <= new Date()) {
      return await this.refreshAccessToken(userId);
    }

    return integration.accessToken;
  }

  /**
   * Fetches user's active event types
   */
  static async getEventTypes(userId: string) {
    const token = await this.getValidToken(userId);
    const integration = await CalendlyIntegration.findOne({ userId });
    if (!integration) throw new Error('Integration not found');

    if (this.isMockMode() || token.startsWith('mock_')) {
      // Mock active event types
      return [
        {
          name: '15 Dakika Tanışma Görüşmesi',
          uri: 'https://api.calendly.com/event_types/mock_15m',
          schedulingUrl: `${integration.schedulingUrl}/15min`
        },
        {
          name: '30 Dakika WPAIFlow B2B Demo Sunumu',
          uri: 'https://api.calendly.com/event_types/mock_30m',
          schedulingUrl: `${integration.schedulingUrl}/demo`
        },
        {
          name: '60 Dakika B2B Entegrasyon Kurulumu',
          uri: 'https://api.calendly.com/event_types/mock_60m',
          schedulingUrl: `${integration.schedulingUrl}/setup`
        }
      ];
    }

    try {
      const res = await axios.get('https://api.calendly.com/event_types', {
        headers: { Authorization: `Bearer ${token}` },
        params: { user: integration.userUri, active: true }
      });

      return res.data.collection.map((item: any) => ({
        name: item.name,
        uri: item.uri,
        schedulingUrl: item.scheduling_url
      }));
    } catch (err: any) {
      console.error('[CalendlyService] Failed to fetch event types:', err.response?.data || err.message);
      throw new Error('Failed to fetch event types from Calendly');
    }
  }

  /**
   * Sets the default event type for outreach links
   */
  static async selectEventType(userId: string, eventTypeUri: string) {
    const integration = await CalendlyIntegration.findOne({ userId });
    if (!integration) throw new Error('Integration not found');

    // Retrieve the event details to store correct name & scheduling URL
    const eventTypes = await this.getEventTypes(userId);
    const selected = eventTypes.find(e => e.uri === eventTypeUri);
    if (!selected) throw new Error('Specified Event Type not found');

    integration.selectedEventType = selected;
    integration.schedulingUrl = selected.schedulingUrl; // Override default with event scheduling URL
    await integration.save();

    console.log(`[CalendlyService] Default booking link set to: ${selected.schedulingUrl}`);
    return integration;
  }

  /**
   * Syncs scheduled events from Calendly to the Meetings collection
   */
  static async syncMeetings(userId: string) {
    console.log(`[CalendlyService] Syncing scheduled events for: ${userId}`);
    const token = await this.getValidToken(userId);
    const integration = await CalendlyIntegration.findOne({ userId });
    if (!integration) throw new Error('Integration not found');

    let rawEvents: any[] = [];

    if (this.isMockMode() || token.startsWith('mock_')) {
      // Mock Sandbox scheduled events
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      rawEvents = [
        {
          uri: 'https://api.calendly.com/scheduled_events/mock_event_991',
          name: '30 Dakika WPAIFlow B2B Demo Sunumu',
          status: 'active',
          start_time: tomorrow.toISOString(),
          location: { type: 'google_conference', join_url: 'https://meet.google.com/abc-defg-hij' },
          invitees: [
            {
              email: 'info@antalyadentalclinic.com', // Let's use a sample business email
              name: 'Dr. Ahmet Yılmaz',
              text_reminder_number: '+905554443322'
            }
          ]
        }
      ];
    } else {
      // Real API sync
      try {
        const eventsRes = await axios.get('https://api.calendly.com/scheduled_events', {
          headers: { Authorization: `Bearer ${token}` },
          params: { user: integration.userUri, status: 'active' }
        });

        const collection = eventsRes.data.collection || [];
        
        // Fetch invitee details for each event (since Calendly v2 hides emails in `/scheduled_events` list)
        for (const ev of collection) {
          const inviteesRes = await axios.get(`${ev.uri}/invitees`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          rawEvents.push({
            ...ev,
            invitees: inviteesRes.data.collection || []
          });
        }
      } catch (err: any) {
        console.error('[CalendlyService] Failed to sync meetings from API:', err.response?.data || err.message);
        integration.syncStatus = 'failed';
        await integration.save();
        throw new Error('Failed to retrieve Calendly events');
      }
    }

    let syncCount = 0;

    for (const raw of rawEvents) {
      const eventId = raw.uri;
      const title = raw.name;
      const date = new Date(raw.start_time);
      const isCancelled = raw.status === 'canceled';
      const meetingLink = raw.location?.join_url || raw.location?.location || '';
      
      const invitee = raw.invitees[0];
      const email = invitee?.email || '';
      const inviteeName = invitee?.name || 'Calendly Guest';
      
      // Auto-match invitee email with a Lead
      const relatedLeads: mongoose.Types.ObjectId[] = [];
      if (email) {
        const matchedLead = await Lead.findOne({ userId, email: new RegExp(email, 'i') });
        if (matchedLead) {
          relatedLeads.push(matchedLead._id as any);
          
          // Auto-promote lead pipeline state to MEETING_BOOKED
          if (matchedLead.status !== 'MEETING_BOOKED') {
            matchedLead.status = 'MEETING_BOOKED';
            await matchedLead.save();
            console.log(`[CalendlySync] Discovered Lead match! Promoted Lead: ${matchedLead.businessName} to MEETING_BOOKED`);
          }
        }
      }

      // Upsert into Meetings collection
      const existingMeeting = await Meeting.findOne({ userId, externalEventId: eventId });
      
      if (existingMeeting) {
        existingMeeting.status = isCancelled ? 'CANCELLED' : 'CONFIRMED';
        existingMeeting.date = date;
        existingMeeting.meetingLink = meetingLink;
        if (relatedLeads.length > 0) {
          existingMeeting.relatedLeads = relatedLeads;
        }
        await existingMeeting.save();
      } else {
        await Meeting.create({
          userId,
          title: `${title} - ${inviteeName}`,
          date,
          relatedLeads,
          notes: `Calendly Randevusu (${inviteeName}). E-posta: ${email}`,
          externalEventId: eventId,
          provider: 'calendly',
          meetingLink,
          status: isCancelled ? 'CANCELLED' : 'CONFIRMED'
        });
        syncCount++;
      }
    }

    integration.syncStatus = 'synced';
    await integration.save();

    console.log(`[CalendlyService] Synced successfully. Added ${syncCount} new events.`);
    return syncCount;
  }
}

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import User from './models/User';
import Meeting from './models/Meeting';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/google/callback';

export class CalendarService {
  private static getOAuthClient(userId: string, connection: any): OAuth2Client {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.expiryDate?.getTime(),
    });

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        await User.updateOne(
          { _id: userId, 'calendarConnections.provider': 'google' },
          { 
            $set: { 
              'calendarConnections.$.accessToken': tokens.access_token,
              'calendarConnections.$.refreshToken': tokens.refresh_token,
              'calendarConnections.$.expiryDate': tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
            } 
          }
        );
      } else {
        await User.updateOne(
          { _id: userId, 'calendarConnections.provider': 'google' },
          { 
            $set: { 
              'calendarConnections.$.accessToken': tokens.access_token,
              'calendarConnections.$.expiryDate': tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
            } 
          }
        );
      }
    });

    return oauth2Client;
  }

  static async getGoogleAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  static async handleGoogleCallback(code: string, userId: string) {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const connection = {
      provider: 'google' as const,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
      email: userInfo.data.email!,
      isActive: true,
    };

    // Upsert connection
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const existingIndex = user.calendarConnections?.findIndex(c => c.provider === 'google' && c.email === connection.email);
    
    if (existingIndex !== undefined && existingIndex > -1) {
      user.calendarConnections![existingIndex] = connection;
    } else {
      user.calendarConnections = user.calendarConnections || [];
      user.calendarConnections.push(connection);
    }

    await user.save();
    return connection;
  }

  static async createEvent(userId: string, meetingId: string) {
    const user = await User.findById(userId);
    const meeting = await Meeting.findById(meetingId).populate('relatedLeads');
    
    if (!user || !meeting) throw new Error('User or Meeting not found');

    const connection = user.calendarConnections?.find(c => c.provider === 'google' && c.isActive);
    if (!connection) throw new Error('No active Google Calendar connection found');

    const auth = this.getOAuthClient(userId, connection);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: meeting.title,
      location: meeting.location || '',
      description: meeting.notes || '',
      start: {
        dateTime: meeting.date.toISOString(),
      },
      end: {
        dateTime: new Date(meeting.date.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration default
      },
      attendees: meeting.relatedLeads.map((lead: any) => ({ email: lead.email })).filter(a => a.email),
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    meeting.externalEventId = res.data.id!;
    meeting.provider = 'google';
    meeting.status = 'CONFIRMED';
    await meeting.save();

    return res.data;
  }

  static async listEvents(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const connection = user.calendarConnections?.find(c => c.provider === 'google' && c.isActive);
    if (!connection) return [];

    const auth = this.getOAuthClient(userId, connection);
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return res.data.items || [];
  }

  static async syncEventsFromGoogle(userId: string) {
    const events = await this.listEvents(userId);
    if (!events || events.length === 0) return 0;

    let syncedCount = 0;
    for (const event of events) {
      // Basic logic to sync Google events to local Meetings
      // We check if meeting with this externalEventId already exists
      const existing = await Meeting.findOne({ userId, externalEventId: event.id });
      if (!existing) {
        await Meeting.create({
          userId,
          title: event.summary || 'Google Calendar Event',
          date: event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date || Date.now()),
          externalEventId: event.id,
          provider: 'google',
          notes: event.description || '',
          location: event.location || '',
          meetingLink: event.hangoutLink || '',
          status: 'CONFIRMED'
        });
        syncedCount++;
      }
    }
    return syncedCount;
  }

  static async suggestMeetingSlots(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const connection = user.calendarConnections?.find(c => c.provider === 'google' && c.isActive);
    if (!connection) return null;

    const auth = this.getOAuthClient(userId, connection);
    const calendar = google.calendar({ version: 'v3', auth });

    // Look for slots in the next 3 days
    const timeMin = new Date();
    timeMin.setHours(timeMin.getHours() + 2); // Start looking from 2 hours from now
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 3);

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items || [];
    
    // Simple logic: find 3 slots of 30 mins during working hours (9-18)
    const suggestions: string[] = [];
    let checkDate = new Date(timeMin);
    
    while (suggestions.length < 3 && checkDate < timeMax) {
      const hour = checkDate.getHours();
      
      // If within working hours
      if (hour >= 9 && hour <= 17) {
        // Check if this slot conflicts with any event
        const slotStart = new Date(checkDate);
        const slotEnd = new Date(checkDate.getTime() + 30 * 60 * 1000);
        
        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
          const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
          return (slotStart < eventEnd && slotEnd > eventStart);
        });

        if (!hasConflict) {
          suggestions.push(slotStart.toLocaleString('tr-TR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            hour: '2-digit', 
            minute: '2-digit' 
          }));
          // Advance by 2 hours to avoid bunching suggestions
          checkDate.setHours(checkDate.getHours() + 2);
        } else {
          // Advance by 30 mins
          checkDate.setTime(checkDate.getTime() + 30 * 60 * 1000);
        }
      } else {
        // Advance to next day 9 AM if outside working hours
        if (hour > 17) {
          checkDate.setDate(checkDate.getDate() + 1);
          checkDate.setHours(9, 0, 0, 0);
        } else if (hour < 9) {
          checkDate.setHours(9, 0, 0, 0);
        }
      }
    }

    return suggestions;
  }
}

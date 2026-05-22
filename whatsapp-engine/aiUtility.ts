import db from './mongoService.js';

export async function generateAiReply(
  lead: any, 
  lastMessage: string, 
  aiPrompt: string, 
  userId: string
): Promise<string> {
  const serverUrl = process.env.INTERNAL_API_URL || 'http://api:3001';
  const url = `${serverUrl}/api/internal/ai/sequence-reply`;

  console.log(`[AI-Utility] Requesting sequence reply from server: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: lead.externalId || lead.id,
        lastMessage,
        aiPrompt,
        userId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-Utility] Server returned error (${response.status}):`, errorText);
      return '';
    }

    const data = await response.json() as { reply: string };
    return data.reply || '';
  } catch (error) {
    console.error('[AI-Utility] Failed to connect to server for AI reply:', error);
    
    // Fallback for local development if 'api' service name doesn't resolve
    if (serverUrl.includes('api:3001')) {
      try {
        console.log('[AI-Utility] Retrying with localhost fallback...');
        const localResponse = await fetch('http://localhost:3001/api/internal/ai/sequence-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.externalId || lead.id, lastMessage, aiPrompt, userId }),
        });
        const data = await localResponse.json() as { reply: string };
        return data.reply || '';
      } catch (localErr) {
        console.error('[AI-Utility] Localhost fallback also failed.');
      }
    }
    
    return '';
  }
}

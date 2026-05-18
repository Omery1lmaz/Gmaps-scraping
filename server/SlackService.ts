import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import Lead from './models/Lead';
import { aiService } from './AIService';

export interface SlackMessage {
  channel: string;
  text: string;
  ts: string;
  user?: string;
  thread_ts?: string;
}

export class SlackService {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private channels: string[] = [];
  private isListening: boolean = false;

  constructor(channels: string[] = []) {
    this.channels = channels;
  }

  async initialize(): Promise<void> {
    try {
      const botToken = process.env.SLACK_BOT_TOKEN;
      const teamId = process.env.SLACK_TEAM_ID;

      if (!botToken || !teamId) {
        throw new Error('SLACK_BOT_TOKEN and SLACK_TEAM_ID must be set');
      }

      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-slack'],
        env: {
          SLACK_BOT_TOKEN: botToken,
          SLACK_TEAM_ID: teamId,
        },
      });

      this.client = new Client({
        name: 'slack-service',
        version: '1.0.0',
      });

      await this.client.connect(this.transport);
      console.log('Slack MCP client connected');
    } catch (error) {
      console.error('Failed to initialize Slack MCP client:', error);
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    if (this.isListening) {
      console.log('Already listening for Slack messages');
      return;
    }

    this.isListening = true;
    console.log('Started listening for Slack messages...');
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      const slackMsg: SlackMessage = {
        channel: message.channel,
        text: message.text,
        ts: message.ts,
        user: message.user,
        thread_ts: message.thread_ts,
      };

      console.log('Received Slack message:', slackMsg);

      const lead = await this.findOrCreateLead(slackMsg);

      if (lead) {
        await this.saveSlackMessage(slackMsg, lead.id);

        const aiResponse = await this.generateResponse(slackMsg, lead);

        if (aiResponse && slackMsg.channel) {
          await this.sendMessage(slackMsg.channel, aiResponse, slackMsg.thread_ts);
        }
      }
    } catch (error) {
      console.error('Error handling Slack message:', error);
    }
  }

  private async findOrCreateLead(message: SlackMessage): Promise<any> {
    const phoneMatch = message.text.match(/(\d{10,11})/);
    const nameMatch = message.text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);

    let lead = null;

    if (phoneMatch) {
      const phone = phoneMatch[1];
      lead = await Lead.findOne({ phone: { $regex: phone.slice(-10) } });
    }

    if (!lead && nameMatch) {
      const name = nameMatch[1];
      lead = await Lead.findOne({ 
        name: { $regex: name, $options: 'i' } 
      });
    }

    return lead;
  }

  private async saveSlackMessage(message: SlackMessage, leadId: string): Promise<void> {
    console.log('Saving Slack message for lead:', leadId);
  }

  private async generateResponse(message: SlackMessage, lead: any): Promise<string> {
    try {
      const prompt = `
        You are a helpful assistant for a lead management system.
        Lead: ${lead.name}
        Category: ${lead.category}
        Message: "${message.text}"
        
        Task: Generate a helpful, professional response that addresses the message content.
        Keep it concise and relevant to the lead.
      `;

      const response = await aiService.generateText(prompt, 'gpt-4o-mini');
      return response.text;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'Thank you for your message. We will get back to you soon.';
    }
  }

  private async sendMessage(channel: string, text: string, threadTs?: string): Promise<void> {
    if (!this.client) {
      throw new Error('MCP client not initialized');
    }

    try {
      await this.client.callTool({
        name: 'chat.postMessage',
        arguments: {
          channel,
          text,
          thread_ts: threadTs,
        },
      });
      console.log('Message sent to Slack channel:', channel);
    } catch (error) {
      console.error('Error sending message to Slack:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    this.isListening = false;
    if (this.transport) {
      await this.transport.close();
    }
    console.log('Stopped listening for Slack messages');
  }

  async getChannelMessages(channel: string, limit: number = 10): Promise<SlackMessage[]> {
    if (!this.client) {
      await this.initialize();
    }

    const result = await this.client!.callTool({
      name: 'conversations.history',
      arguments: {
        channel,
        limit,
      },
    });

    const messages = result?.content as any[] || [];
    return messages.map((msg: any) => ({
      channel: msg.channel,
      text: msg.text,
      ts: msg.ts,
      user: msg.user,
    }));
  }
}

export const slackService = new SlackService();
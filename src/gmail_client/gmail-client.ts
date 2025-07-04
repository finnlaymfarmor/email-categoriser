import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GmailAuth } from '../auth/gmail-auth';

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  labels: string[];
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
}

export class GmailClient {
  private auth: GmailAuth;
  private gmail: any;

  constructor() {
    this.auth = new GmailAuth();
  }

  async initialize(): Promise<void> {
    const authClient = await this.auth.authenticate();
    this.gmail = google.gmail({ version: 'v1', auth: authClient });
  }

  async getMessages(maxResults: number = 50, query?: string): Promise<EmailMessage[]> {
    if (!this.gmail) {
      await this.initialize();
    }

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    });

    const messages = response.data.messages || [];
    const emailMessages: EmailMessage[] = [];

    for (const message of messages) {
      const fullMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const emailMessage = this.parseMessage(fullMessage.data);
      emailMessages.push(emailMessage);
    }

    return emailMessages;
  }

  async getUnreadMessages(): Promise<EmailMessage[]> {
    return this.getMessages(50, 'is:unread');
  }

  async getMessagesByLabel(labelName: string): Promise<EmailMessage[]> {
    return this.getMessages(50, `label:${labelName}`);
  }

  private parseMessage(messageData: any): EmailMessage {
    const headers = messageData.payload.headers;
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const to = headers.find((h: any) => h.name === 'To')?.value || '';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    const body = this.extractMessageBody(messageData.payload);

    return {
      id: messageData.id,
      threadId: messageData.threadId,
      snippet: messageData.snippet,
      subject,
      from,
      to,
      date,
      body,
      labels: messageData.labelIds || [],
    };
  }

  private extractMessageBody(payload: any): string {
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return '';
  }

  async getLabels(): Promise<GmailLabel[]> {
    if (!this.gmail) {
      await this.initialize();
    }

    const response = await this.gmail.users.labels.list({
      userId: 'me',
    });

    return response.data.labels || [];
  }

  async createLabel(name: string, color?: string): Promise<GmailLabel> {
    if (!this.gmail) {
      await this.initialize();
    }

    const labelResource = {
      name,
      messageListVisibility: 'show',
      labelListVisibility: 'labelShow',
      ...(color && { color: { backgroundColor: color, textColor: '#ffffff' } })
    };

    const response = await this.gmail.users.labels.create({
      userId: 'me',
      resource: labelResource,
    });

    return response.data;
  }

  async getLabelByName(name: string): Promise<GmailLabel | null> {
    const labels = await this.getLabels();
    return labels.find(label => label.name === name) || null;
  }

  async addLabelToMessage(messageId: string, labelId: string): Promise<void> {
    if (!this.gmail) {
      await this.initialize();
    }

    await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: [labelId],
      },
    });
  }

  async addLabelToMessages(messageIds: string[], labelId: string): Promise<void> {
    for (const messageId of messageIds) {
      await this.addLabelToMessage(messageId, labelId);
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async removeLabelFromMessage(messageId: string, labelId: string): Promise<void> {
    if (!this.gmail) {
      await this.initialize();
    }

    await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: [labelId],
      },
    });
  }

  async getOrCreateLabel(name: string, color?: string): Promise<GmailLabel> {
    let label = await this.getLabelByName(name);
    if (!label) {
      label = await this.createLabel(name, color);
    }
    return label;
  }
}
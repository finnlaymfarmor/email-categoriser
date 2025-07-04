import { GmailClient } from '../gmail_client/gmail-client';
import { EmailClientInterface, EmailLabel } from './email-client-interface';
import { EmailMessage } from '../gmail_client/gmail-client';

export class GmailClientAdapter implements EmailClientInterface {
  private gmailClient: GmailClient;

  constructor() {
    this.gmailClient = new GmailClient();
  }

  async initialize(): Promise<void> {
    return this.gmailClient.initialize();
  }

  async getMessages(maxResults?: number, query?: string): Promise<EmailMessage[]> {
    return this.gmailClient.getMessages(maxResults, query);
  }

  async getUnreadMessages(): Promise<EmailMessage[]> {
    return this.gmailClient.getUnreadMessages();
  }

  async getMessagesByLabel(labelName: string): Promise<EmailMessage[]> {
    return this.gmailClient.getMessagesByLabel(labelName);
  }

  async getLabels(): Promise<EmailLabel[]> {
    const gmailLabels = await this.gmailClient.getLabels();
    return gmailLabels.map(label => ({
      id: label.id,
      name: label.name,
      type: label.type
    }));
  }

  async createLabel(name: string, color?: string): Promise<EmailLabel> {
    const gmailLabel = await this.gmailClient.createLabel(name, color);
    return {
      id: gmailLabel.id,
      name: gmailLabel.name,
      type: gmailLabel.type
    };
  }

  async getLabelByName(name: string): Promise<EmailLabel | null> {
    const gmailLabel = await this.gmailClient.getLabelByName(name);
    if (!gmailLabel) return null;
    
    return {
      id: gmailLabel.id,
      name: gmailLabel.name,
      type: gmailLabel.type
    };
  }

  async addLabelToMessage(messageId: string, labelId: string): Promise<void> {
    return this.gmailClient.addLabelToMessage(messageId, labelId);
  }

  async addLabelToMessages(messageIds: string[], labelId: string): Promise<void> {
    return this.gmailClient.addLabelToMessages(messageIds, labelId);
  }

  async removeLabelFromMessage(messageId: string, labelId: string): Promise<void> {
    return this.gmailClient.removeLabelFromMessage(messageId, labelId);
  }

  async getOrCreateLabel(name: string, color?: string): Promise<EmailLabel> {
    const gmailLabel = await this.gmailClient.getOrCreateLabel(name, color);
    return {
      id: gmailLabel.id,
      name: gmailLabel.name,
      type: gmailLabel.type
    };
  }
}
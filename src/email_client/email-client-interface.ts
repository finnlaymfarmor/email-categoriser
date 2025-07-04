import { EmailMessage } from '../gmail_client/gmail-client';

export interface EmailLabel {
  id: string;
  name: string;
  type?: string;
}

export interface EmailClientInterface {
  initialize(): Promise<void>;
  getMessages(maxResults?: number, query?: string): Promise<EmailMessage[]>;
  getUnreadMessages(): Promise<EmailMessage[]>;
  getMessagesByLabel(labelName: string): Promise<EmailMessage[]>;
  getLabels(): Promise<EmailLabel[]>;
  createLabel(name: string, color?: string): Promise<EmailLabel>;
  getLabelByName(name: string): Promise<EmailLabel | null>;
  addLabelToMessage(messageId: string, labelId: string): Promise<void>;
  addLabelToMessages(messageIds: string[], labelId: string): Promise<void>;
  removeLabelFromMessage(messageId: string, labelId: string): Promise<void>;
  getOrCreateLabel(name: string, color?: string): Promise<EmailLabel>;
}

export type EmailProvider = 'gmail' | 'outlook';
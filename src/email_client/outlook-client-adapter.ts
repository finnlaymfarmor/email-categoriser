import { OutlookClient } from '../outlook_client/outlook-client';
import { EmailClientInterface, EmailLabel } from './email-client-interface';
import { EmailMessage } from '../gmail_client/gmail-client';

export class OutlookClientAdapter implements EmailClientInterface {
  private outlookClient: OutlookClient;

  constructor() {
    this.outlookClient = new OutlookClient();
  }

  async initialize(): Promise<void> {
    return this.outlookClient.initialize();
  }

  async getMessages(maxResults?: number, query?: string): Promise<EmailMessage[]> {
    return this.outlookClient.getMessages(maxResults, query);
  }

  async getUnreadMessages(): Promise<EmailMessage[]> {
    return this.outlookClient.getUnreadMessages();
  }

  async getMessagesByLabel(labelName: string): Promise<EmailMessage[]> {
    return this.outlookClient.getMessagesByCategory(labelName);
  }

  async getLabels(): Promise<EmailLabel[]> {
    const outlookCategories = await this.outlookClient.getCategories();
    return outlookCategories.map(category => ({
      id: category.id,
      name: category.displayName,
      type: 'user'
    }));
  }

  async createLabel(name: string, color?: string): Promise<EmailLabel> {
    const outlookCategory = await this.outlookClient.createCategory(name, color);
    return {
      id: outlookCategory.id,
      name: outlookCategory.displayName,
      type: 'user'
    };
  }

  async getLabelByName(name: string): Promise<EmailLabel | null> {
    const outlookCategory = await this.outlookClient.getCategoryByName(name);
    if (!outlookCategory) return null;
    
    return {
      id: outlookCategory.id,
      name: outlookCategory.displayName,
      type: 'user'
    };
  }

  async addLabelToMessage(messageId: string, labelId: string): Promise<void> {
    // For Outlook, we need to use the category name, not ID
    const category = await this.outlookClient.getCategoryByName(labelId);
    const categoryName = category?.displayName || labelId;
    return this.outlookClient.addCategoryToMessage(messageId, categoryName);
  }

  async addLabelToMessages(messageIds: string[], labelId: string): Promise<void> {
    // For Outlook, we need to use the category name, not ID
    const category = await this.outlookClient.getCategoryByName(labelId);
    const categoryName = category?.displayName || labelId;
    return this.outlookClient.addCategoryToMessages(messageIds, categoryName);
  }

  async removeLabelFromMessage(messageId: string, labelId: string): Promise<void> {
    // For Outlook, we need to use the category name, not ID
    const category = await this.outlookClient.getCategoryByName(labelId);
    const categoryName = category?.displayName || labelId;
    return this.outlookClient.removeCategoryFromMessage(messageId, categoryName);
  }

  async getOrCreateLabel(name: string, color?: string): Promise<EmailLabel> {
    const outlookCategory = await this.outlookClient.getOrCreateCategory(name, color);
    return {
      id: outlookCategory.id,
      name: outlookCategory.displayName,
      type: 'user'
    };
  }
}
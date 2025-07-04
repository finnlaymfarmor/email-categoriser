import { Client } from '@microsoft/microsoft-graph-client';
import { OutlookAuth } from '../auth/outlook-auth';
import { EmailMessage } from '../gmail_client/gmail-client';

export interface OutlookMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  bodyPreview: string;
  body: {
    content: string;
    contentType: string;
  };
  isRead: boolean;
  categories: string[];
}

export interface OutlookCategory {
  id: string;
  displayName: string;
  color: string;
}

export class OutlookClient {
  private auth: OutlookAuth;
  private client: Client | null = null;

  constructor() {
    this.auth = new OutlookAuth();
  }

  async initialize(): Promise<void> {
    const accessToken = await this.auth.authenticate();
    
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  async getMessages(maxResults: number = 50, filter?: string): Promise<EmailMessage[]> {
    if (!this.client) {
      await this.initialize();
    }

    let query = this.client!.api('/me/messages')
      .top(maxResults)
      .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,isRead,categories')
      .orderby('receivedDateTime desc');

    if (filter) {
      query = query.filter(filter);
    }

    const response = await query.get();
    const messages: OutlookMessage[] = response.value || [];

    return messages.map(msg => this.convertToEmailMessage(msg));
  }

  async getUnreadMessages(): Promise<EmailMessage[]> {
    return this.getMessages(50, 'isRead eq false');
  }

  async getMessagesByCategory(categoryName: string): Promise<EmailMessage[]> {
    return this.getMessages(50, `categories/any(c:c eq '${categoryName}')`);
  }

  private convertToEmailMessage(outlookMessage: OutlookMessage): EmailMessage {
    return {
      id: outlookMessage.id,
      threadId: outlookMessage.id, // Outlook doesn't have the same thread concept
      snippet: outlookMessage.bodyPreview,
      subject: outlookMessage.subject || '',
      from: outlookMessage.from?.emailAddress?.address || '',
      to: outlookMessage.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
      date: outlookMessage.receivedDateTime,
      body: outlookMessage.body?.content || outlookMessage.bodyPreview || '',
      labels: outlookMessage.categories || []
    };
  }

  async getCategories(): Promise<OutlookCategory[]> {
    if (!this.client) {
      await this.initialize();
    }

    const response = await this.client.api('/me/outlook/masterCategories').get();
    return response.value || [];
  }

  async createCategory(name: string, color: string = 'preset0'): Promise<OutlookCategory> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const categoryData = {
        displayName: name,
        color: color
      };

      const response = await this.client.api('/me/outlook/masterCategories').post(categoryData);
      return response;
    } catch (error: any) {
      if (error.code === 'ErrorAccessDenied') {
        console.log(`\n❌ Permission Error: Cannot create category "${name}"`);
        console.log('Your Azure app needs additional permissions:');
        console.log('1. Go to Azure Portal > App registrations > Your app');
        console.log('2. Go to "API permissions"');
        console.log('3. Add "MailboxSettings.ReadWrite" permission');
        console.log('4. Grant admin consent');
        console.log('5. Wait 5-10 minutes for permissions to propagate');
        console.log('\n💡 Skipping category creation for now...\n');
        
        // Return a mock category so the process can continue
        return {
          id: name,
          displayName: name,
          color: color
        };
      }
      throw error;
    }
  }

  async getCategoryByName(name: string): Promise<OutlookCategory | null> {
    const categories = await this.getCategories();
    return categories.find(cat => cat.displayName === name) || null;
  }

  async addCategoryToMessage(messageId: string, categoryName: string): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      // Get current message to preserve existing categories
      const message = await this.client.api(`/me/messages/${messageId}`)
        .select('categories')
        .get();

      const currentCategories = message.categories || [];
      
      // Add new category if not already present
      if (!currentCategories.includes(categoryName)) {
        const updatedCategories = [...currentCategories, categoryName];
        
        await this.client.api(`/me/messages/${messageId}`)
          .patch({
            categories: updatedCategories
          });
      }
    } catch (error: any) {
      if (error.code === 'ErrorAccessDenied') {
        console.log(`⚠️  Permission Error: Cannot apply category "${categoryName}" to message`);
        console.log('Your Azure app needs "Mail.ReadWrite" permission');
        console.log('💡 Please add this permission in Azure Portal and grant admin consent\n');
        return; // Continue without failing
      }
      throw error;
    }
  }

  async addCategoryToMessages(messageIds: string[], categoryName: string): Promise<void> {
    for (const messageId of messageIds) {
      await this.addCategoryToMessage(messageId, categoryName);
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async removeCategoryFromMessage(messageId: string, categoryName: string): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    // Get current message categories
    const message = await this.client.api(`/me/messages/${messageId}`)
      .select('categories')
      .get();

    const currentCategories = message.categories || [];
    const updatedCategories = currentCategories.filter((cat: string) => cat !== categoryName);
    
    await this.client.api(`/me/messages/${messageId}`)
      .patch({
        categories: updatedCategories
      });
  }

  async getOrCreateCategory(name: string, color: string = 'preset0'): Promise<OutlookCategory> {
    let category = await this.getCategoryByName(name);
    if (!category) {
      category = await this.createCategory(name, color);
    }
    return category;
  }
}
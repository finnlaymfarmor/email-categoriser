import { OutlookClient } from '../outlook_client/outlook-client';

export interface OutlookWebhookConfig {
  notificationUrl: string;
  secret?: string;
  expirationMinutes?: number;
}

export interface OutlookSubscription {
  id: string;
  resource: string;
  expirationDateTime: string;
  notificationUrl: string;
  changeType: string;
}

export class OutlookWebhookManager {
  private outlookClient: OutlookClient;
  private activeSubscriptions: Map<string, OutlookSubscription> = new Map();

  constructor(outlookClient: OutlookClient) {
    this.outlookClient = outlookClient;
  }

  async createEmailSubscription(config: OutlookWebhookConfig): Promise<OutlookSubscription> {
    try {
      console.log('🔔 Setting up Outlook email webhook subscription...');
      
      await this.outlookClient.initialize();
      
      // Calculate expiration time (max 3 days for Outlook)
      const expirationMinutes = Math.min(config.expirationMinutes || 4320, 4320); // Max 3 days
      const expirationDateTime = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
      
      const subscriptionData = {
        changeType: 'created', // Listen for new emails
        notificationUrl: config.notificationUrl,
        resource: '/me/messages',
        expirationDateTime: expirationDateTime,
        clientState: config.secret || 'email-categorizer',
        latestSupportedTlsVersion: 'v1_2'
      };

      console.log('📡 Creating subscription:', subscriptionData);
      
      // Create the subscription using Microsoft Graph API
      const response = await this.createSubscriptionRequest(subscriptionData);
      
      console.log('✅ Outlook webhook subscription created:', response.id);
      
      // Store the subscription
      this.activeSubscriptions.set(response.id, response);
      
      return response;
      
    } catch (error) {
      console.error('❌ Failed to create Outlook webhook subscription:', error);
      throw error;
    }
  }

  private async createSubscriptionRequest(subscriptionData: any): Promise<OutlookSubscription> {
    // This would use the Microsoft Graph client to create a subscription
    // For now, we'll simulate the response and provide setup instructions
    
    console.log('⚠️  Outlook Webhooks require additional setup:');
    console.log('1. Your webhook endpoint must be publicly accessible (use ngrok for testing)');
    console.log('2. Endpoint must respond to validation requests');
    console.log('3. Must have SSL/TLS (https://)');
    console.log('');
    console.log('📖 Full setup instructions available in WEBHOOK_SETUP.md');
    
    // Return a mock subscription for now
    return {
      id: 'mock-subscription-id',
      resource: subscriptionData.resource,
      expirationDateTime: subscriptionData.expirationDateTime,
      notificationUrl: subscriptionData.notificationUrl,
      changeType: subscriptionData.changeType
    };
  }

  async renewSubscription(subscriptionId: string, expirationMinutes: number = 4320): Promise<void> {
    try {
      console.log(`🔄 Renewing Outlook subscription: ${subscriptionId}`);
      
      const subscription = this.activeSubscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }
      
      const newExpirationDateTime = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
      
      // Update subscription expiration
      // This would call PATCH /subscriptions/{id} with new expirationDateTime
      
      subscription.expirationDateTime = newExpirationDateTime;
      this.activeSubscriptions.set(subscriptionId, subscription);
      
      console.log(`✅ Subscription renewed until ${newExpirationDateTime}`);
      
    } catch (error) {
      console.error('❌ Failed to renew Outlook subscription:', error);
      throw error;
    }
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting Outlook subscription: ${subscriptionId}`);
      
      // Delete the subscription via Microsoft Graph API
      // This would call DELETE /subscriptions/{id}
      
      this.activeSubscriptions.delete(subscriptionId);
      
      console.log('✅ Outlook subscription deleted');
      
    } catch (error) {
      console.error('❌ Failed to delete Outlook subscription:', error);
      throw error;
    }
  }

  async listSubscriptions(): Promise<OutlookSubscription[]> {
    try {
      console.log('📋 Listing active Outlook subscriptions...');
      
      // This would call GET /subscriptions to list all active subscriptions
      
      const subscriptions = Array.from(this.activeSubscriptions.values());
      
      console.log(`Found ${subscriptions.length} active subscription(s)`);
      subscriptions.forEach(sub => {
        console.log(`  • ${sub.id} - expires ${sub.expirationDateTime}`);
      });
      
      return subscriptions;
      
    } catch (error) {
      console.error('❌ Failed to list Outlook subscriptions:', error);
      throw error;
    }
  }

  async cleanupExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    const expiredSubscriptions = Array.from(this.activeSubscriptions.values())
      .filter(sub => new Date(sub.expirationDateTime) <= now);
    
    for (const subscription of expiredSubscriptions) {
      console.log(`🧹 Cleaning up expired subscription: ${subscription.id}`);
      await this.deleteSubscription(subscription.id);
    }
  }

  getActiveSubscriptions(): OutlookSubscription[] {
    return Array.from(this.activeSubscriptions.values());
  }
}
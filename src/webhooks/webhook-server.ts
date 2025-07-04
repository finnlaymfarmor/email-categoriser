import express from 'express';
import { createHash, createHmac } from 'crypto';
import { EmailClientInterface } from '../email_client/email-client-interface';
import { LLMEmailCategorizer } from '../categorization/llm-email-categorizer';
import { EmailMessage } from '../gmail_client/gmail-client';

export interface WebhookConfig {
  port: number;
  secret?: string;
  enabled: boolean;
  gmailTopic?: string;
  outlookValidationToken?: string;
}

export class WebhookServer {
  private app: express.Application;
  private server: any;
  private emailClient: EmailClientInterface;
  private categorizer: LLMEmailCategorizer;
  private config: WebhookConfig;
  private isRunning: boolean = false;

  constructor(emailClient: EmailClientInterface, categorizer: LLMEmailCategorizer, config: WebhookConfig) {
    this.emailClient = emailClient;
    this.categorizer = categorizer;
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.raw({ type: 'application/json' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.text());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Gmail Push Notification endpoint
    this.app.post('/webhooks/gmail', (req, res) => {
      this.handleGmailWebhook(req, res);
    });

    // Outlook Graph API webhook endpoint
    this.app.post('/webhooks/outlook', (req, res) => {
      this.handleOutlookWebhook(req, res);
    });

    // Outlook webhook validation endpoint
    this.app.get('/webhooks/outlook', (req, res) => {
      this.handleOutlookValidation(req, res);
    });
  }

  private async handleGmailWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      console.log('📧 Received Gmail webhook notification');
      
      // Verify the request (optional but recommended)
      if (this.config.secret && !this.verifyGmailSignature(req)) {
        console.log('❌ Invalid Gmail webhook signature');
        res.status(401).send('Unauthorized');
        return;
      }

      // Decode the Pub/Sub message
      const pubsubMessage = req.body;
      let messageData;
      
      try {
        if (pubsubMessage.message && pubsubMessage.message.data) {
          const decodedData = Buffer.from(pubsubMessage.message.data, 'base64').toString();
          messageData = JSON.parse(decodedData);
          console.log('📨 Gmail notification data:', messageData);
        }
      } catch (error) {
        console.log('⚠️  Could not decode Gmail message data, proceeding with general check');
      }

      // Process new emails (we'll check for new emails since this is a notification)
      await this.processNewEmails('gmail');
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Error handling Gmail webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  private async handleOutlookWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      console.log('📧 Received Outlook webhook notification');
      
      // Verify the request
      if (this.config.secret && !this.verifyOutlookSignature(req)) {
        console.log('❌ Invalid Outlook webhook signature');
        res.status(401).send('Unauthorized');
        return;
      }

      const notification = req.body;
      console.log('📨 Outlook notification:', notification);

      // Process new emails
      await this.processNewEmails('outlook');
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Error handling Outlook webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  private handleOutlookValidation(req: express.Request, res: express.Response): void {
    const validationToken = req.query.validationToken as string;
    
    if (validationToken) {
      console.log('✅ Outlook webhook validation successful');
      res.status(200).send(validationToken);
    } else {
      console.log('❌ Missing Outlook validation token');
      res.status(400).send('Bad Request');
    }
  }

  private verifyGmailSignature(req: express.Request): boolean {
    // Gmail Pub/Sub doesn't use HMAC signatures by default
    // You could implement JWT token verification here if needed
    return true;
  }

  private verifyOutlookSignature(req: express.Request): boolean {
    const signature = req.headers['x-webhook-signature'] as string;
    if (!signature || !this.config.secret) {
      return true; // Skip verification if no secret configured
    }

    const expectedSignature = createHmac('sha256', this.config.secret)
      .update(req.body)
      .digest('hex');

    return signature === expectedSignature;
  }

  private async processNewEmails(provider: string): Promise<void> {
    try {
      console.log(`🔍 Checking for new emails via ${provider} webhook...`);
      
      // Get recent unread emails (last 10 minutes worth)
      const recentEmails = await this.getRecentEmails();
      
      if (recentEmails.length === 0) {
        console.log('📭 No new emails to process');
        return;
      }

      console.log(`📬 Processing ${recentEmails.length} recent email(s)...`);

      // Categorize the emails
      const categorizedEmails = await this.categorizer.categorizeEmails(recentEmails);
      const groupedEmails = this.categorizer.groupEmailsByLabel(categorizedEmails);

      // Apply labels/categories
      for (const [labelName, emails] of Object.entries(groupedEmails)) {
        if (emails.length > 0) {
          console.log(`🏷️  Applying "${labelName}" to ${emails.length} email(s)`);
          
          try {
            const emailLabel = await this.emailClient.getOrCreateLabel(labelName);
            const messageIds = emails.map(e => e.email.id);
            await this.emailClient.addLabelToMessages(messageIds, emailLabel.id);
            
            console.log(`✅ Applied "${labelName}" to ${emails.length} email(s)`);
          } catch (error) {
            console.error(`❌ Failed to apply label "${labelName}":`, error);
          }
        }
      }

      // Log summary
      console.log('\n📊 Webhook Processing Summary:');
      Object.entries(groupedEmails).forEach(([label, emails]) => {
        if (emails.length > 0) {
          console.log(`  • ${label.replace(/_/g, ' ').toUpperCase()}: ${emails.length} email(s)`);
        }
      });
      console.log('');

    } catch (error) {
      console.error('❌ Error processing webhook emails:', error);
    }
  }

  private async getRecentEmails(): Promise<EmailMessage[]> {
    try {
      // Get recent emails from the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const allEmails = await this.emailClient.getMessages(20);
      
      // Filter for emails received in the last 10 minutes
      return allEmails.filter(email => {
        const emailDate = new Date(email.date);
        return emailDate > tenMinutesAgo;
      });
    } catch (error) {
      console.error('Error fetching recent emails:', error);
      return [];
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🌐 Webhook server is already running');
      return;
    }

    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        this.isRunning = true;
        console.log(`🌐 Webhook server started on port ${this.config.port}`);
        console.log(`📧 Gmail webhook endpoint: http://localhost:${this.config.port}/webhooks/gmail`);
        console.log(`📧 Outlook webhook endpoint: http://localhost:${this.config.port}/webhooks/outlook`);
        console.log(`🏥 Health check: http://localhost:${this.config.port}/health`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        console.log('🛑 Webhook server stopped');
        resolve();
      });
    });
  }

  getStatus(): { isRunning: boolean; port: number; endpoints: string[] } {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      endpoints: [
        `/webhooks/gmail`,
        `/webhooks/outlook`,
        `/health`
      ]
    };
  }
}
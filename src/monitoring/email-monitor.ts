import { EmailClientInterface } from '../email_client/email-client-interface';
import { LLMEmailCategorizer } from '../categorization/llm-email-categorizer';
import { EmailMessage } from '../gmail_client/gmail-client';
import fs from 'fs';
import path from 'path';

export interface MonitorConfig {
  pollInterval: number; // in minutes
  enabled: boolean;
  maxEmailsPerCheck: number;
  logActivity: boolean;
}

export class EmailMonitor {
  private emailClient: EmailClientInterface;
  private categorizer: LLMEmailCategorizer;
  private config: MonitorConfig;
  private isRunning: boolean = false;
  private lastCheckPath: string;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(emailClient: EmailClientInterface, categorizer: LLMEmailCategorizer, config: MonitorConfig) {
    this.emailClient = emailClient;
    this.categorizer = categorizer;
    this.config = config;
    this.lastCheckPath = path.join(process.cwd(), '.last-email-check');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('📧 Email monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log(`📧 Starting email monitor (checking every ${this.config.pollInterval} minutes)`);
    
    // Initial check
    await this.checkForNewEmails();
    
    // Set up periodic checking
    this.intervalId = setInterval(async () => {
      try {
        await this.checkForNewEmails();
      } catch (error) {
        console.error('❌ Error during email check:', error);
      }
    }, this.config.pollInterval * 60 * 1000);

    console.log('✅ Email monitor started successfully');
    console.log('💡 Press Ctrl+C to stop monitoring');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('🛑 Email monitor stopped');
  }

  private async checkForNewEmails(): Promise<void> {
    if (this.config.logActivity) {
      console.log(`🔍 Checking for new emails... (${new Date().toLocaleTimeString()})`);
    }

    try {
      const lastCheckTime = this.getLastCheckTime();
      const newEmails = await this.getEmailsSince(lastCheckTime);

      if (newEmails.length === 0) {
        if (this.config.logActivity) {
          console.log('📭 No new emails found');
        }
        this.updateLastCheckTime();
        return;
      }

      console.log(`📬 Found ${newEmails.length} new email(s) - categorizing...`);

      // Categorize new emails
      const categorizedEmails = await this.categorizer.categorizeEmails(newEmails);
      const groupedEmails = this.categorizer.groupEmailsByLabel(categorizedEmails);

      // Apply labels to new emails
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
      console.log('\n📊 New Email Summary:');
      Object.entries(groupedEmails).forEach(([label, emails]) => {
        if (emails.length > 0) {
          console.log(`  • ${label.replace(/_/g, ' ').toUpperCase()}: ${emails.length} email(s)`);
        }
      });

      this.updateLastCheckTime();
      console.log(`⏰ Next check at ${new Date(Date.now() + this.config.pollInterval * 60 * 1000).toLocaleTimeString()}\n`);

    } catch (error) {
      console.error('❌ Error checking for new emails:', error);
    }
  }

  private async getEmailsSince(since: Date): Promise<EmailMessage[]> {
    try {
      // Get recent emails (more than we need to ensure we don't miss any)
      const recentEmails = await this.emailClient.getMessages(this.config.maxEmailsPerCheck * 2);
      
      // Filter emails that are newer than last check
      const newEmails = recentEmails.filter(email => {
        const emailDate = new Date(email.date);
        return emailDate > since;
      });

      // Limit to max emails per check
      return newEmails.slice(0, this.config.maxEmailsPerCheck);
    } catch (error) {
      console.error('Error fetching emails since last check:', error);
      return [];
    }
  }

  private getLastCheckTime(): Date {
    try {
      const lastCheckData = fs.readFileSync(this.lastCheckPath, 'utf8');
      return new Date(lastCheckData);
    } catch (error) {
      // If no previous check time, start from 1 hour ago
      return new Date(Date.now() - 60 * 60 * 1000);
    }
  }

  private updateLastCheckTime(): void {
    const now = new Date().toISOString();
    fs.writeFileSync(this.lastCheckPath, now);
  }

  getStatus(): { isRunning: boolean; nextCheck?: Date; config: MonitorConfig } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.intervalId ? new Date(Date.now() + this.config.pollInterval * 60 * 1000) : undefined,
      config: this.config
    };
  }
}
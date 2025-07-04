import { EmailClientInterface } from './email_client/email-client-interface';
import { EmailClientFactory } from './email_client/email-client-factory';
import { AppConfigManager } from './config/app-config';
import { LLMEmailCategorizer } from './categorization/llm-email-categorizer';
import { WebhookServer } from './webhooks/webhook-server';

export class EmailWebhookApp {
  private emailClient: EmailClientInterface;
  private categorizer: LLMEmailCategorizer;
  private webhookServer: WebhookServer;

  constructor(emailClient: EmailClientInterface) {
    this.emailClient = emailClient;
    this.categorizer = new LLMEmailCategorizer();
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Email Categorizer Webhook Server...');
      
      // Load configuration
      const config = await AppConfigManager.loadConfig();
      
      if (!config.webhooks?.enabled) {
        console.log('❌ Webhooks are not enabled in app-config.json');
        console.log('💡 Set webhooks.enabled to true to enable real-time categorization');
        return;
      }

      console.log(`📧 Using ${config.emailProvider} as email provider`);
      
      // Initialize components
      console.log('🔧 Setting up email categorizer...');
      await this.categorizer.createDefaultConfig();
      
      console.log('🔌 Initializing email client...');
      await this.emailClient.initialize();
      
      // Create and start webhook server
      this.webhookServer = new WebhookServer(this.emailClient, this.categorizer, {
        port: config.webhooks.port || 3000,
        secret: config.webhooks.secret,
        enabled: config.webhooks.enabled,
        gmailTopic: config.webhooks.gmailTopic,
        outlookValidationToken: config.webhooks.outlookValidationToken
      });

      console.log('📊 Webhook configuration:');
      console.log(`  • Port: ${config.webhooks.port || 3000}`);
      console.log(`  • Secret: ${config.webhooks.secret ? 'Configured' : 'Not set'}`);
      console.log(`  • Gmail Topic: ${config.webhooks.gmailTopic || 'Not configured'}`);
      console.log('');

      await this.webhookServer.start();

      console.log('🎯 Webhook server is ready to receive notifications!');
      console.log('📚 See WEBHOOK_SETUP.md for configuration instructions');

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\n📄 Received shutdown signal...');
        await this.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n\n📄 Received termination signal...');
        await this.stop();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ Failed to start webhook server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    if (this.webhookServer) {
      await this.webhookServer.stop();
    }
    console.log('👋 Email webhook server stopped');
  }
}

if (require.main === module) {
  async function main() {
    try {
      // Load configuration
      const config = await AppConfigManager.loadConfig();
      
      // Create email client based on configuration
      const emailClient = EmailClientFactory.create(config.emailProvider);
      
      // Create and start the webhook app
      const app = new EmailWebhookApp(emailClient);
      await app.start();
    } catch (error) {
      console.error('Failed to start webhook application:', error);
      process.exit(1);
    }
  }
  
  main();
}
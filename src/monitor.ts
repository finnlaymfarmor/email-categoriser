import { EmailClientInterface } from './email_client/email-client-interface';
import { EmailClientFactory } from './email_client/email-client-factory';
import { AppConfigManager } from './config/app-config';
import { LLMEmailCategorizer } from './categorization/llm-email-categorizer';
import { EmailMonitor } from './monitoring/email-monitor';

export class EmailMonitorApp {
  private emailClient: EmailClientInterface;
  private categorizer: LLMEmailCategorizer;
  private monitor: EmailMonitor;

  constructor(emailClient: EmailClientInterface) {
    this.emailClient = emailClient;
    this.categorizer = new LLMEmailCategorizer();
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Email Categorizer Monitor...');
      
      // Load configuration
      const config = await AppConfigManager.loadConfig();
      
      if (!config.monitoring?.enabled) {
        console.log('❌ Monitoring is not enabled in app-config.json');
        console.log('💡 Set monitoring.enabled to true to enable automatic categorization');
        return;
      }

      console.log(`📧 Using ${config.emailProvider} as email provider`);
      
      // Initialize components
      console.log('🔧 Setting up email categorizer...');
      await this.categorizer.createDefaultConfig();
      
      console.log('🔌 Initializing email client...');
      await this.emailClient.initialize();
      
      // Create and start monitor
      this.monitor = new EmailMonitor(this.emailClient, this.categorizer, {
        pollInterval: config.monitoring.pollInterval,
        enabled: config.monitoring.enabled,
        maxEmailsPerCheck: config.monitoring.maxEmailsPerCheck,
        logActivity: config.monitoring.logActivity
      });

      console.log('📊 Monitor configuration:');
      console.log(`  • Check interval: ${config.monitoring.pollInterval} minutes`);
      console.log(`  • Max emails per check: ${config.monitoring.maxEmailsPerCheck}`);
      console.log(`  • Log activity: ${config.monitoring.logActivity ? 'Yes' : 'No'}`);
      console.log('');

      await this.monitor.start();

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
      console.error('❌ Failed to start email monitor:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    if (this.monitor) {
      await this.monitor.stop();
    }
    console.log('👋 Email monitor stopped');
  }
}

if (require.main === module) {
  async function main() {
    try {
      // Load configuration
      const config = await AppConfigManager.loadConfig();
      
      // Create email client based on configuration
      const emailClient = EmailClientFactory.create(config.emailProvider);
      
      // Create and start the monitor app
      const app = new EmailMonitorApp(emailClient);
      await app.start();
    } catch (error) {
      console.error('Failed to start monitor application:', error);
      process.exit(1);
    }
  }
  
  main();
}
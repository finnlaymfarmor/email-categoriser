import { EmailClientInterface } from './email_client/email-client-interface';
import { EmailClientFactory } from './email_client/email-client-factory';
import { AppConfigManager } from './config/app-config';
import { LLMEmailCategorizer } from './categorization/llm-email-categorizer';
import { EmailUtils } from './utils/email-utils';

export class EmailCategoriserApp {
  private emailClient: EmailClientInterface;
  private categorizer: LLMEmailCategorizer;

  constructor(emailClient: EmailClientInterface) {
    this.emailClient = emailClient;
    this.categorizer = new LLMEmailCategorizer();
  }

  async run(): Promise<void> {
    try {
      console.log('Setting up default labels configuration...');
      await this.categorizer.createDefaultConfig();

      console.log('Initializing email client...');
      await this.emailClient.initialize();

      console.log('Fetching emails...');
      const emails = await this.emailClient.getUnreadMessages();
      
      console.log(`Found ${emails.length} unread emails`);

      if (emails.length === 0) {
        console.log('No unread emails found!');
        return;
      }

      console.log('Categorizing emails using LLM...');
      console.log('(This may take a few moments as each email is analyzed)');
      
      const categorizedEmails = await this.categorizer.categorizeEmails(emails);

      const groupedEmails = this.categorizer.groupEmailsByLabel(categorizedEmails);
      const stats = this.categorizer.getLabelStats(categorizedEmails);
      const labelDescriptions = await this.categorizer.getLabelDescriptions();

      console.log('\n=== EMAIL CATEGORIZATION SUMMARY ===');
      Object.entries(stats).forEach(([label, count]) => {
        if (count > 0) {
          console.log(`${label.replace(/_/g, ' ').toUpperCase()}: ${count} emails`);
        }
      });

      console.log('\n=== APPLYING LABELS TO EMAIL ===');

      for (const [labelName, emails] of Object.entries(groupedEmails)) {
        if (emails.length > 0) {
          console.log(`Creating/updating label: ${labelName}`);
          const emailLabel = await this.emailClient.getOrCreateLabel(labelName);

          console.log(`Applying label "${labelName}" to ${emails.length} emails...`);
          const messageIds = emails.map(e => e.email.id);
          await this.emailClient.addLabelToMessages(messageIds, emailLabel.id);
          
          console.log(`✓ Applied "${labelName}" to ${emails.length} emails`);
        }
      }

      console.log('\n=== DETAILED BREAKDOWN ===');
      Object.entries(groupedEmails).forEach(([label, emails]) => {
        if (emails.length > 0) {
          console.log(`\n${label.replace(/_/g, ' ').toUpperCase()} (${emails.length} emails):`);
          console.log(`Description: ${labelDescriptions[label]}`);
          emails.forEach(({ email, confidence, reasoning }) => {
            console.log(`\n  • ${EmailUtils.truncateText(email.subject, 60)}`);
            console.log(`    From: ${EmailUtils.extractName(email.from)}`);
            console.log(`    Confidence: ${(confidence * 100).toFixed(1)}%`);
            console.log(`    Reasoning: ${reasoning}`);
          });
        }
      });

      console.log('\n=== EMAIL LABELS APPLIED ===');
      console.log('✓ All emails have been labeled in your email client');
      console.log('✓ Check your email client to see the categorized emails');
      console.log('✓ Labels/categories are applied for easy identification');

      console.log('\n=== CONFIGURATION INFO ===');
      console.log('• Customize labels by editing labels-config.json');
      console.log('• Add your own labels with custom prompts');
      console.log('• Set ANTHROPIC_API_KEY environment variable');
      console.log('• Change email provider in app-config.json (gmail/outlook)');

    } catch (error) {
      console.error('Error running email categoriser:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        console.log('\nPlease set your Anthropic API key:');
        console.log('export ANTHROPIC_API_KEY="your-api-key-here"');
      }
      if (error instanceof Error && error.message.includes('insufficient')) {
        console.log('\nYou need to re-authenticate with additional permissions:');
        console.log('Delete token.json and run again to get label management permissions');
      }
    }
  }
}

if (require.main === module) {
  async function main() {
    try {
      // Load configuration
      const config = await AppConfigManager.loadConfig();
      console.log(`Using ${config.emailProvider} as email provider`);
      
      // Create email client based on configuration
      const emailClient = EmailClientFactory.create(config.emailProvider);
      
      // Create and run the app
      const app = new EmailCategoriserApp(emailClient);
      await app.run();
    } catch (error) {
      console.error('Failed to start application:', error);
      process.exit(1);
    }
  }
  
  main();
}
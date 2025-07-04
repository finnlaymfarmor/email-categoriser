import { EmailMessage } from '../gmail_client/gmail-client';
import { LLMService } from '../llm/llm-service';
import { LabelsConfigManager, LabelsConfiguration } from '../config/labels-config';

export interface LLMCategorizedEmail {
  email: EmailMessage;
  label: string;
  confidence: number;
  reasoning: string;
}

export class LLMEmailCategorizer {
  private llmService: LLMService;
  private configManager: LabelsConfigManager;

  constructor(anthropicApiKey?: string) {
    this.llmService = new LLMService(anthropicApiKey);
    this.configManager = new LabelsConfigManager();
  }

  async categorizeEmail(email: EmailMessage): Promise<LLMCategorizedEmail> {
    const config = await this.configManager.loadConfig();
    const availableLabels = this.configManager.getAvailableLabels(config);
    const labelPrompts = this.configManager.getLabelPrompts(config);

    const emailContent = this.formatEmailForLLM(email);
    
    const result = await this.llmService.categorizeEmail(
      emailContent,
      availableLabels,
      labelPrompts
    );

    return {
      email,
      label: result.label,
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  }

  async categorizeEmails(emails: EmailMessage[]): Promise<LLMCategorizedEmail[]> {
    const config = await this.configManager.loadConfig();
    const availableLabels = this.configManager.getAvailableLabels(config);
    const labelPrompts = this.configManager.getLabelPrompts(config);

    const emailContents = emails.map(email => ({
      id: email.id,
      content: this.formatEmailForLLM(email)
    }));

    const results = await this.llmService.batchCategorizeEmails(
      emailContents,
      availableLabels,
      labelPrompts
    );

    return results.map(result => {
      const email = emails.find(e => e.id === result.id)!;
      return {
        email,
        label: result.label,
        confidence: result.confidence,
        reasoning: result.reasoning
      };
    });
  }

  private formatEmailForLLM(email: EmailMessage): string {
    return `Subject: ${email.subject}
From: ${email.from}
To: ${email.to}
Date: ${email.date}

Preview: ${email.snippet}

${email.body ? `Body: ${email.body.substring(0, 1000)}${email.body.length > 1000 ? '...' : ''}` : ''}`;
  }

  async getAvailableLabels(): Promise<string[]> {
    const config = await this.configManager.loadConfig();
    return this.configManager.getAvailableLabels(config);
  }

  async getLabelDescriptions(): Promise<Record<string, string>> {
    const config = await this.configManager.loadConfig();
    const descriptions: Record<string, string> = {};
    
    config.labels.forEach(label => {
      descriptions[label.name] = label.description || label.prompt;
    });
    
    return descriptions;
  }

  async createDefaultConfig(): Promise<void> {
    await this.configManager.createDefaultConfig();
  }

  async addCustomLabel(name: string, prompt: string, description?: string, examples?: string[]): Promise<void> {
    const config = await this.configManager.loadConfig();
    const newLabel = { name, prompt, description, examples };
    const updatedConfig = this.configManager.addLabel(config, newLabel);
    await this.configManager.saveConfig(updatedConfig);
  }

  async removeLabel(labelName: string): Promise<void> {
    const config = await this.configManager.loadConfig();
    const updatedConfig = this.configManager.removeLabel(config, labelName);
    await this.configManager.saveConfig(updatedConfig);
  }

  groupEmailsByLabel(categorizedEmails: LLMCategorizedEmail[]): Record<string, LLMCategorizedEmail[]> {
    const grouped: Record<string, LLMCategorizedEmail[]> = {};
    
    categorizedEmails.forEach(categorizedEmail => {
      if (!grouped[categorizedEmail.label]) {
        grouped[categorizedEmail.label] = [];
      }
      grouped[categorizedEmail.label].push(categorizedEmail);
    });
    
    return grouped;
  }

  getLabelStats(categorizedEmails: LLMCategorizedEmail[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    categorizedEmails.forEach(categorizedEmail => {
      stats[categorizedEmail.label] = (stats[categorizedEmail.label] || 0) + 1;
    });
    
    return stats;
  }
}
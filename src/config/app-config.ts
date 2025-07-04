import { EmailProvider } from '../email_client/email-client-interface';
import fs from 'fs';
import path from 'path';

export interface AppConfig {
  emailProvider: EmailProvider;
  maxResults?: number;
  monitoring?: {
    enabled: boolean;
    pollInterval: number; // in minutes
    maxEmailsPerCheck: number;
    logActivity: boolean;
  };
  webhooks?: {
    enabled: boolean;
    port: number;
    secret?: string;
    gmailTopic?: string;
    outlookValidationToken?: string;
  };
}

const CONFIG_PATH = path.join(process.cwd(), 'app-config.json');

export class AppConfigManager {
  private static defaultConfig: AppConfig = {
    emailProvider: 'gmail',
    maxResults: 50,
    monitoring: {
      enabled: false,
      pollInterval: 5, // check every 5 minutes
      maxEmailsPerCheck: 10,
      logActivity: true
    },
    webhooks: {
      enabled: false,
      port: 3000,
      secret: undefined,
      gmailTopic: undefined,
      outlookValidationToken: undefined
    }
  };

  static async loadConfig(): Promise<AppConfig> {
    try {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(content);
      return { ...this.defaultConfig, ...config };
    } catch (error) {
      console.log('No app-config.json found, using default configuration (Gmail)');
      return this.defaultConfig;
    }
  }

  static async saveConfig(config: AppConfig): Promise<void> {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  static async createDefaultConfig(): Promise<void> {
    if (!fs.existsSync(CONFIG_PATH)) {
      await this.saveConfig(this.defaultConfig);
      console.log('Created default app-config.json');
    }
  }
}
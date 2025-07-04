import fs from 'fs';
import path from 'path';

export interface LabelConfig {
  name: string;
  prompt: string;
  description?: string;
  examples?: string[];
}

export interface LabelsConfiguration {
  labels: LabelConfig[];
}

export class LabelsConfigManager {
  private configPath: string;
  private defaultConfig: LabelsConfiguration = {
    labels: [
      {
        name: 'to_respond',
        prompt: 'Emails that require a response from me - questions directed at me, requests for information, decisions needed, or conversations where I need to reply',
        description: 'Emails you need to respond to',
        examples: ['Direct questions to me', 'Requests for decisions', 'Meeting invitations needing RSVP', 'Client inquiries']
      },
      {
        name: 'fyi',
        prompt: 'Important informational emails that don\'t require my response but are important for me to know - updates, announcements, or information relevant to my work or interests',
        description: 'Emails that don\'t require your response, but are important',
        examples: ['Project updates', 'Company announcements', 'Policy changes', 'Important news']
      },
      {
        name: 'comment',
        prompt: 'Collaborative communications from team tools like comments in Google Docs, Microsoft Office, Slack notifications, or other team collaboration platforms',
        description: 'Team chats in tools like Google Docs or Microsoft Office',
        examples: ['Google Docs comments', 'Office 365 comments', 'Slack notifications', 'Team collaboration updates']
      },
      {
        name: 'notification',
        prompt: 'Automated updates and notifications from tools, services, and platforms I use - system notifications, app updates, service alerts',
        description: 'Automated updates from tools you use',
        examples: ['GitHub notifications', 'App updates', 'Service alerts', 'System notifications', 'Backup reports']
      },
      {
        name: 'meeting_update',
        prompt: 'Calendar and meeting-related updates from platforms like Zoom, Google Meet, Microsoft Teams, calendar invitations, meeting reminders, or scheduling changes',
        description: 'Calendar updates from Zoom, Google Meet, etc',
        examples: ['Zoom meeting links', 'Calendar invitations', 'Meeting reminders', 'Schedule changes', 'Meeting recordings']
      },
      {
        name: 'awaiting_reply',
        prompt: 'Emails where I\'m expecting a response - follow-ups to my previous emails, replies to questions I asked, or confirmations I\'m waiting for',
        description: 'Emails you\'re expecting a reply to',
        examples: ['Replies to my questions', 'Confirmations I requested', 'Follow-up responses', 'Pending approvals']
      },
      {
        name: 'actioned',
        prompt: 'Email threads that have been resolved, completed, or no longer need attention - confirmations of completed tasks, resolved issues, or closed conversations',
        description: 'Email threads that have been resolved',
        examples: ['Task completion confirmations', 'Issue resolved notifications', 'Completed project updates', 'Closed tickets']
      },
      {
        name: 'marketing',
        prompt: 'Marketing emails, promotional content, cold emails, newsletters from companies trying to sell products or services, or unsolicited business communications',
        description: 'Marketing or cold emails',
        examples: ['Product promotions', 'Sales pitches', 'Cold outreach', 'Marketing newsletters', 'Advertising emails']
      }
    ]
  };

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'labels-config.json');
  }

  async loadConfig(): Promise<LabelsConfiguration> {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.log('No custom labels config found, using defaults. Create labels-config.json to customize.');
      return this.defaultConfig;
    }
  }

  async saveConfig(config: LabelsConfiguration): Promise<void> {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  async createDefaultConfig(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      await this.saveConfig(this.defaultConfig);
      console.log(`Default labels config created at ${this.configPath}`);
    }
  }

  getAvailableLabels(config: LabelsConfiguration): string[] {
    return config.labels.map(label => label.name);
  }

  getLabelPrompts(config: LabelsConfiguration): Record<string, string> {
    const prompts: Record<string, string> = {};
    config.labels.forEach(label => {
      prompts[label.name] = label.prompt;
    });
    return prompts;
  }

  addLabel(config: LabelsConfiguration, label: LabelConfig): LabelsConfiguration {
    return {
      ...config,
      labels: [...config.labels, label]
    };
  }

  removeLabel(config: LabelsConfiguration, labelName: string): LabelsConfiguration {
    return {
      ...config,
      labels: config.labels.filter(label => label.name !== labelName)
    };
  }

  updateLabel(config: LabelsConfiguration, labelName: string, updatedLabel: LabelConfig): LabelsConfiguration {
    return {
      ...config,
      labels: config.labels.map(label => 
        label.name === labelName ? updatedLabel : label
      )
    };
  }
}
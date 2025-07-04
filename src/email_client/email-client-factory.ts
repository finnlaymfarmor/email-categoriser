import { EmailClientInterface, EmailProvider } from './email-client-interface';
import { GmailClientAdapter } from './gmail-client-adapter';
import { OutlookClientAdapter } from './outlook-client-adapter';

export class EmailClientFactory {
  static create(provider: EmailProvider): EmailClientInterface {
    switch (provider) {
      case 'gmail':
        return new GmailClientAdapter();
      case 'outlook':
        return new OutlookClientAdapter();
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }
}
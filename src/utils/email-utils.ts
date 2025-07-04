import { EmailMessage } from '../gmail_client/gmail-client';
import { CategorizedEmail, EmailCategory } from '../categorization/email-categorizer';

export class EmailUtils {
  static extractEmailAddress(fullEmail: string): string {
    const match = fullEmail.match(/<([^>]+)>/);
    return match ? match[1] : fullEmail;
  }

  static extractName(fullEmail: string): string {
    const match = fullEmail.match(/^([^<]+)</);
    return match ? match[1].trim().replace(/"/g, '') : fullEmail;
  }

  static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  static truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  static groupEmailsByCategory(categorizedEmails: CategorizedEmail[]): Record<EmailCategory, CategorizedEmail[]> {
    const grouped: Record<EmailCategory, CategorizedEmail[]> = {
      [EmailCategory.WORK]: [],
      [EmailCategory.PERSONAL]: [],
      [EmailCategory.FINANCE]: [],
      [EmailCategory.SHOPPING]: [],
      [EmailCategory.SOCIAL]: [],
      [EmailCategory.PROMOTIONS]: [],
      [EmailCategory.SPAM]: [],
      [EmailCategory.NEWSLETTER]: [],
      [EmailCategory.OTHER]: [],
    };

    for (const categorizedEmail of categorizedEmails) {
      grouped[categorizedEmail.category].push(categorizedEmail);
    }

    return grouped;
  }

  static getSummaryStats(categorizedEmails: CategorizedEmail[]): Record<EmailCategory, number> {
    const stats: Record<EmailCategory, number> = {
      [EmailCategory.WORK]: 0,
      [EmailCategory.PERSONAL]: 0,
      [EmailCategory.FINANCE]: 0,
      [EmailCategory.SHOPPING]: 0,
      [EmailCategory.SOCIAL]: 0,
      [EmailCategory.PROMOTIONS]: 0,
      [EmailCategory.SPAM]: 0,
      [EmailCategory.NEWSLETTER]: 0,
      [EmailCategory.OTHER]: 0,
    };

    for (const categorizedEmail of categorizedEmails) {
      stats[categorizedEmail.category]++;
    }

    return stats;
  }

  static sortEmailsByDate(emails: EmailMessage[]): EmailMessage[] {
    return emails.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }

  static filterEmailsByConfidence(categorizedEmails: CategorizedEmail[], minConfidence: number = 0.5): CategorizedEmail[] {
    return categorizedEmails.filter(email => email.confidence >= minConfidence);
  }
}
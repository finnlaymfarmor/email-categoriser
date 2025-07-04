import { EmailMessage } from '../gmail_client/gmail-client';

export enum EmailCategory {
  WORK = 'work',
  PERSONAL = 'personal',
  FINANCE = 'finance',
  SHOPPING = 'shopping',
  SOCIAL = 'social',
  PROMOTIONS = 'promotions',
  SPAM = 'spam',
  NEWSLETTER = 'newsletter',
  OTHER = 'other',
}

export interface CategorizedEmail {
  email: EmailMessage;
  category: EmailCategory;
  confidence: number;
  keywords: string[];
}

export class EmailCategorizer {
  private workKeywords = ['meeting', 'project', 'deadline', 'report', 'presentation', 'client', 'proposal', 'budget', 'invoice', 'contract'];
  private financeKeywords = ['bank', 'payment', 'transaction', 'credit', 'debit', 'account', 'statement', 'loan', 'mortgage', 'insurance'];
  private shoppingKeywords = ['order', 'purchase', 'receipt', 'shipping', 'delivery', 'product', 'cart', 'checkout', 'discount', 'sale'];
  private socialKeywords = ['facebook', 'twitter', 'linkedin', 'instagram', 'notification', 'friend', 'follow', 'like', 'comment', 'share'];
  private promotionKeywords = ['offer', 'deal', 'discount', 'sale', 'promotion', 'limited time', 'special', 'coupon', 'save', 'free'];
  private newsletterKeywords = ['newsletter', 'subscription', 'unsubscribe', 'weekly', 'monthly', 'digest', 'update', 'news'];

  categorizeEmail(email: EmailMessage): CategorizedEmail {
    const text = `${email.subject} ${email.snippet} ${email.from}`.toLowerCase();
    
    const categories = [
      { category: EmailCategory.WORK, keywords: this.workKeywords },
      { category: EmailCategory.FINANCE, keywords: this.financeKeywords },
      { category: EmailCategory.SHOPPING, keywords: this.shoppingKeywords },
      { category: EmailCategory.SOCIAL, keywords: this.socialKeywords },
      { category: EmailCategory.PROMOTIONS, keywords: this.promotionKeywords },
      { category: EmailCategory.NEWSLETTER, keywords: this.newsletterKeywords },
    ];

    let bestMatch = { category: EmailCategory.OTHER, confidence: 0, keywords: [] as string[] };

    for (const categoryData of categories) {
      const matchedKeywords = categoryData.keywords.filter(keyword => 
        text.includes(keyword)
      );
      
      if (matchedKeywords.length > 0) {
        const confidence = matchedKeywords.length / categoryData.keywords.length;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            category: categoryData.category,
            confidence,
            keywords: matchedKeywords,
          };
        }
      }
    }

    if (this.isSpam(email)) {
      bestMatch = {
        category: EmailCategory.SPAM,
        confidence: 0.9,
        keywords: ['spam'],
      };
    }

    return {
      email,
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      keywords: bestMatch.keywords,
    };
  }

  categorizeEmails(emails: EmailMessage[]): CategorizedEmail[] {
    return emails.map(email => this.categorizeEmail(email));
  }

  private isSpam(email: EmailMessage): boolean {
    const spamIndicators = [
      'urgent',
      'act now',
      'limited time',
      'click here',
      'free money',
      'winner',
      'congratulations',
      'lottery',
      'prince',
      'inheritance',
    ];

    const text = `${email.subject} ${email.snippet}`.toLowerCase();
    const spamCount = spamIndicators.filter(indicator => text.includes(indicator)).length;
    
    return spamCount >= 2;
  }
}
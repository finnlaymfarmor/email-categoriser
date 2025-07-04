import Anthropic from '@anthropic-ai/sdk';

export class LLMService {
  private anthropic: Anthropic;

  constructor(apiKey?: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async categorizeEmail(
    emailContent: string,
    availableLabels: string[],
    labelPrompts: Record<string, string>
  ): Promise<{ label: string; confidence: number; reasoning: string }> {
    const labelDescriptions = availableLabels
      .map(label => `- ${label}: ${labelPrompts[label] || 'No description provided'}`)
      .join('\n');

    const prompt = `You are an expert email categorization assistant that helps organize emails based on what action is needed. Your job is to categorize emails based on what the recipient should DO with them, not just their content topic.

Email Content:
${emailContent}

Available Categories:
${labelDescriptions}

IMPORTANT CATEGORIZATION GUIDELINES:
- Focus on ACTION REQUIRED rather than just topic
- "to_respond" = Someone is asking me something or needs my input
- "fyi" = Important to know but no response needed
- "comment" = Collaborative tool notifications (Google Docs, Slack, etc.)
- "notification" = System/app automated updates
- "meeting_update" = Anything calendar/meeting related
- "awaiting_reply" = I'm waiting for someone else's response
- "actioned" = Issue is resolved/completed
- "marketing" = Promotional/sales content

Please respond with a JSON object containing:
- "label": the most appropriate category from the list above
- "confidence": a number between 0 and 1 indicating your confidence
- "reasoning": a brief explanation focusing on what action is needed

Response format:
{
  "label": "selected_label",
  "confidence": 0.95,
  "reasoning": "Brief explanation here"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            label: result.label,
            confidence: result.confidence,
            reasoning: result.reasoning
          };
        }
      }
      
      return {
        label: availableLabels[0] || 'unknown',
        confidence: 0.1,
        reasoning: 'Failed to parse LLM response'
      };
    } catch (error) {
      console.error('Error calling LLM:', error);
      return {
        label: availableLabels[0] || 'unknown',
        confidence: 0.1,
        reasoning: 'LLM service error'
      };
    }
  }

  async batchCategorizeEmails(
    emails: Array<{ id: string; content: string }>,
    availableLabels: string[],
    labelPrompts: Record<string, string>
  ): Promise<Array<{ id: string; label: string; confidence: number; reasoning: string }>> {
    const results = [];
    
    for (const email of emails) {
      const result = await this.categorizeEmail(email.content, availableLabels, labelPrompts);
      results.push({
        id: email.id,
        ...result
      });
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}
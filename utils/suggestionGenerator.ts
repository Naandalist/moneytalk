import { Transaction } from '@/types/transaction';
import Constants from 'expo-constants';

const getOpenAIKey = (): string => {
  const appApiKey = Constants.expoConfig?.extra?.openaiApiKey;
  if (!appApiKey) {
    throw new Error('OpenAI API key not found');
  }
  return appApiKey;
};

export const generateSuggestion = async (
  thisWeekTransactions: Transaction[],
  lastMonthTransactions: Transaction[]
): Promise<string> => {
  try {
    const apiKey = getOpenAIKey();

    const prompt = `
      Analyze the user's spending habits based on the following data:
      - This week's transactions: ${JSON.stringify(thisWeekTransactions)}
      - Last month's transactions: ${JSON.stringify(lastMonthTransactions)}

      Compare the spending for this week against the last month.
      Provide a short, actionable suggestion for the user.
      For example, suggest areas where they can save money, mention categories with high spending, or give positive reinforcement if they are spending less.
      Keep the suggestion concise and easy to understand.
      The response should be a single string of advice.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful financial assistant providing personalized suggestions.'
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
    }

    const result = await response.json();
    const newSuggestion = result.choices[0]?.message?.content.trim() || "Could not generate a suggestion at this time.";
    return newSuggestion;
  } catch (error) {
    console.error('Error generating suggestion:', error);
    return "There was an error generating your suggestion. Please check your connection and API key.";
  }
};
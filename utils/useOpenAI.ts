import { useState } from 'react';
import Constants from 'expo-constants';
import { useCurrency } from '@/context/CurrencyContext';
// import { useDatabase } from '@/context/DatabaseContext';

interface UseOpenAIOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export const useOpenAI = (options: UseOpenAIOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
//   const { getApiKey } = useDatabase();
    const { selectedCurrency } = useCurrency();

  const getOpenAIKey = async (): Promise<string> => {
    // First try to get user's custom API key from database
    // const userApiKey = await getApiKey();
    // if (userApiKey) {
    //   return userApiKey;
    // }
    
    // Fallback to app's API key
    const appApiKey = Constants.expoConfig?.extra?.openaiApiKey;
    if (!appApiKey) {
      throw new Error('OpenAI API key not found');
    }
    
    return appApiKey;
  };

  const transcribeAudio = async (uri: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const apiKey = await getOpenAIKey();
      
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'audio/m4a',
        name: 'recording.m4a'
      } as any);
      formData.append('model', 'gpt-4o-mini-transcribe');
      formData.append('response_format', 'json');
      formData.append('language', selectedCurrency.language || 'en');

      console.log('Sending request to OpenAI API...');
      console.log('selectedCurrency:', selectedCurrency);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
      }

      const result = await response.json();
      console.log('Transcription result:', result);
      const text = result.text || 'No transcription available';
      
      options.onSuccess?.(text);
      return text;
    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to transcribe audio. Please try again.';
      options.onError?.(errorMessage);
      
      if (__DEV__) {
        return "I spent 24 dollars on lunch today";
      }
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeImage = async (imageUri: string): Promise<any> => {
    setIsProcessing(true);
    try {
      const apiKey = await getOpenAIKey();
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const base64Image = base64data.split(',')[1];

            const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: [{
                  role: 'user',
                  content: [{
                    type: 'text',
                    text: 'Analyze this receipt and extract transaction information. Return a JSON object with: amount (number), description (string), category (one of: Groceries, Dining, Housing, Transport, Healthcare, Personal, Education, Income, Salary, Bills, Shopping, Other), type ("expense" or "income"), and items (array of item names and prices if visible). Focus on the total amount and main purchase category.'
                  }, {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }]
                }],
                max_tokens: 500
              })
            });

            if (!visionResponse.ok) {
              throw new Error('Failed to analyze receipt');
            }

            const result = await visionResponse.json();
            const analysisText = result.choices[0].message.content;
            const sanitizedText = analysisText
              .replace(/```json\s*/g, '')
              .replace(/```\s*/g, '')
              .trim();

            let parsedResult;
            try {
              parsedResult = JSON.parse(sanitizedText);
            } catch (err) {
              parsedResult = {
                amount: 0,
                description: 'Receipt analysis error',
                category: 'other',
                type: 'expense',
                date: 'today',
              };
            }

            options.onSuccess?.(parsedResult);
            resolve(parsedResult);
          } catch (error) {
            options.onError?.('Failed to analyze receipt. Please try again.');
            reject(error);
          }
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error processing image:', error);
      options.onError?.('Failed to process image. Please try again.');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    transcribeAudio,
    analyzeImage,
    getOpenAIKey
  };
};
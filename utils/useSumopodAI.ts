import { useState } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import Constants from 'expo-constants';
import { AI_PROMPTS } from './aiPrompts';

interface UseSumopodAIOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for Sumopod AI API integration
 * Provides audio transcription and image analysis functionality using Sumopod AI services
 */
export const useSumopodAI = (options: UseSumopodAIOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { selectedCurrency } = useCurrency();

  /**
   * Get Sumopod AI API key from environment variables
   */
  const getSumopodAIKey = async (): Promise<string> => {
    const apiKey = Constants.expoConfig?.extra?.sumopodAiApiKey;
    if (!apiKey) {
      throw new Error('Sumopod AI API key not found');
    }
    return apiKey;
  };

  /**
   * Get Sumopod AI API endpoint URL
   */
  const getSumopodAIEndpoint = (endpoint: string): string => {
    const baseUrl = Constants.expoConfig?.extra?.sumopodAiBaseUrl || 'https://api.sumopod.ai';
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  };

  /**
   * Sumopod AI API endpoints
   */
  const SUMOPOD_ENDPOINTS = {
    CHAT_COMPLETIONS: '/v1/chat/completions',
    AUDIO_TRANSCRIPTIONS: '/v1/audio/transcriptions',
  } as const;

  /**
   * Transcribe audio using Sumopod AI
   * @param uri - Audio file URI
   * @returns Promise<string> - Transcribed text
   */
  const transcribeAudio = async (uri: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const apiKey = await getSumopodAIKey();
      
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'audio/m4a',
        name: 'recording.m4a'
      } as any);
      formData.append('model', 'gpt-4o-mini-transcribe');
      formData.append('response_format', 'json');
      formData.append('language', selectedCurrency.language || 'en');

      console.log('Sending request to Sumopod AI API...');
      console.log('selectedCurrency:', selectedCurrency);

      const response = await fetch(getSumopodAIEndpoint(SUMOPOD_ENDPOINTS.AUDIO_TRANSCRIPTIONS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Sumopod AI API error: ${errorData.error?.message || response.status}`);
      }

      const result = await response.json();
      console.log('Sumopod transcription result:', result);
      const text = result.text || 'No transcription available';
      
      options.onSuccess?.(text);
      return text;
    } catch (error) {
      console.error('Sumopod transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to transcribe audio with Sumopod. Please try again.';
      options.onError?.(errorMessage);
      
      if (__DEV__) {
        return "I spent 24 dollars on lunch today";
      }
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Analyze image using Sumopod AI
   * @param imageUri - Image URI to analyze
   * @returns Promise<any> - Analysis result
   */
  const analyzeImage = async (imageUri: string): Promise<any> => {
    setIsProcessing(true);
    try {
      const apiKey = await getSumopodAIKey();
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const base64Image = base64data.split(',')[1];

            const visionResponse = await fetch(getSumopodAIEndpoint(SUMOPOD_ENDPOINTS.CHAT_COMPLETIONS), {
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
                    text: AI_PROMPTS.RECEIPT_ANALYSIS
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
              throw new Error('Failed to analyze receipt with Sumopod AI');
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
            options.onError?.('Failed to analyze receipt with Sumopod AI. Please try again.');
            reject(error);
          }
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error processing image with Sumopod AI:', error);
      options.onError?.('Failed to process image with Sumopod AI. Please try again.');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    transcribeAudio,
    analyzeImage,
    getSumopodAIKey
  };
};
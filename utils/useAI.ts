import { useState } from 'react';
import { useOpenAI } from './useOpenAI';
import { useSumopodAI } from './useSumopodAI';

interface UseAIOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  onFallback?: (provider: 'sumopod' | 'openai') => void;
}

/**
 * AI wrapper hook that uses Sumopod AI by default with OpenAI as fallback
 * Provides unified interface for audio transcription and image analysis
 */
export const useAI = (options: UseAIOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<'sumopod' | 'openai' | null>(null);

  // Initialize both AI services
  const sumopodAI = useSumopodAI({
    onSuccess: options.onSuccess,
    onError: (error) => {
      console.log('Sumopod AI failed, will try OpenAI fallback');
      // Don't call options.onError here, let the wrapper handle fallback
    }
  });

  const openAI = useOpenAI({
    onSuccess: options.onSuccess,
    onError: options.onError
  });

  /**
   * Transcribe audio with Sumopod AI first, fallback to OpenAI if it fails
   * @param uri - Audio file URI
   * @returns Promise<string> - Transcribed text
   */
  const transcribeAudio = async (uri: string): Promise<string> => {
    setIsProcessing(true);
    
    try {
      // Try Sumopod AI first
      setCurrentProvider('sumopod');
      console.log('Attempting transcription with Sumopod AI...');
      const result = await sumopodAI.transcribeAudio(uri);
      console.log('Sumopod AI transcription successful');
      return result;
    } catch (sumopodError) {
      console.warn('Sumopod AI transcription failed:', sumopodError);
      
      try {
        // Fallback to OpenAI
        setCurrentProvider('openai');
        console.log('Falling back to OpenAI for transcription...');
        options.onFallback?.('openai');
        const result = await openAI.transcribeAudio(uri);
        console.log('OpenAI transcription successful');
        return result;
      } catch (openaiError) {
        console.error('Both Sumopod AI and OpenAI transcription failed');
        const errorMessage = 'Unable to transcribe audio. Both AI services are unavailable.';
        options.onError?.(errorMessage);
        throw new Error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
      setCurrentProvider(null);
    }
  };

  /**
   * Analyze image with Sumopod AI first, fallback to OpenAI if it fails
   * @param imageUri - Image URI to analyze
   * @returns Promise<any> - Analysis result
   */
  const analyzeImage = async (imageUri: string): Promise<any> => {
    setIsProcessing(true);
    
    try {
      // Try Sumopod AI first
      setCurrentProvider('sumopod');
      console.log('Attempting image analysis with Sumopod AI...');
      const result = await sumopodAI.analyzeImage(imageUri);
      console.log('Sumopod AI image analysis successful');
      return result;
    } catch (sumopodError) {
      console.warn('Sumopod AI image analysis failed:', sumopodError);
      
      try {
        // Fallback to OpenAI
        setCurrentProvider('openai');
        console.log('Falling back to OpenAI for image analysis...');
        options.onFallback?.('openai');
        const result = await openAI.analyzeImage(imageUri);
        console.log('OpenAI image analysis successful');
        return result;
      } catch (openaiError) {
        console.error('Both Sumopod AI and OpenAI image analysis failed');
        const errorMessage = 'Unable to analyze image. Both AI services are unavailable.';
        options.onError?.(errorMessage);
        throw new Error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
      setCurrentProvider(null);
    }
  };

  /**
   * Get the API key for the current provider
   * @param provider - The AI provider ('sumopod' or 'openai')
   * @returns Promise<string> - API key
   */
  const getApiKey = async (provider: 'sumopod' | 'openai' = 'sumopod'): Promise<string> => {
    if (provider === 'sumopod') {
      return await sumopodAI.getSumopodAIKey();
    } else {
      return await openAI.getOpenAIKey();
    }
  };

  /**
   * Check if either AI service is currently processing
   */
  const isAnyProcessing = isProcessing || sumopodAI.isProcessing || openAI.isProcessing;

  return {
    isProcessing: isAnyProcessing,
    currentProvider,
    transcribeAudio,
    analyzeImage,
    getApiKey,
    // Expose individual services for direct access if needed
    sumopodAI,
    openAI
  };
};
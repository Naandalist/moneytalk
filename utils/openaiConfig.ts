import Constants from 'expo-constants';

/**
 * Get the OpenAI base URL from environment variables with fallback
 * @returns The OpenAI base URL
 */
export const getOpenAIBaseUrl = (): string => {
  const baseUrl = Constants.expoConfig?.extra?.sumopodAiBaseUrl || Constants.expoConfig?.extra?.openaiBaseUrl || 'https://api.openai.com';
  if (!baseUrl) {
    throw new Error('OpenAI base URL not found');
  } else {
    console.log('Using AI base URL:', baseUrl);
  }
  return baseUrl;
};

/**
 * Get the OpenAI API key from environment variables
 * @returns Promise<string> The OpenAI API key
 * @throws Error if API key is not found
 */
export const getOpenAIKey = async (): Promise<string> => {
  // First try to get user's custom API key from database
  // const userApiKey = await getApiKey();
  // if (userApiKey) {
  //   return userApiKey;
  // }
  
  // Fallback to app's API key
  const appApiKey = Constants.expoConfig?.extra?.sumopodAiApiKey || Constants.expoConfig?.extra?.openaiApiKey;
  if (!appApiKey) {
    throw new Error('OpenAI API key not found');
  }
  
  return appApiKey;
};

/**
 * Create a complete OpenAI API endpoint URL
 * @param endpoint The API endpoint (e.g., '/v1/chat/completions')
 * @returns The complete URL
 */
export const getOpenAIEndpoint = (endpoint: string): string => {
  const baseUrl = getOpenAIBaseUrl();
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

/**
 * Common OpenAI API endpoints
 */
export const OPENAI_ENDPOINTS = {
  CHAT_COMPLETIONS: '/v1/chat/completions',
  AUDIO_TRANSCRIPTIONS: '/v1/audio/transcriptions',
} as const;
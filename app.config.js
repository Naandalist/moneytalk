export default ({ config }) => ({
  ...config,
  name: 'moneytalk',
  slug: 'moneytalk',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.luminawsoftware.moneytalk',
    adaptiveIcon: {
      foregroundImage: './assets/images/icon.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router', 'expo-font', 'expo-web-browser', 'expo-dev-client'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '7f8649b1-237c-42ba-8218-0408cfc19694',
    },
    // Add environment variables here
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  owner: 'randhipp',
});

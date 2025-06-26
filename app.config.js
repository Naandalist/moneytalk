export default ({ config }) => ({
  ...config,
  name: 'moneytalk',
  slug: 'moneytalk',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  splash: {
    image: './assets/images/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
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
    permissions: ['com.google.android.gms.permission.AD_ID'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-sqlite',
    'expo-router',
    'expo-font',
    'expo-web-browser',
    'expo-dev-client',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-3827890809706045~1872866125',
        iosAppId: 'ca-app-pub-3827890809706045~1872866125',
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'This identifier will be used to deliver personalized ads to you.',
      },
    ],
  ],
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

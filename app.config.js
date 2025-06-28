export default ({ config }) => ({
  ...config,
  name: 'moneytalk',
  slug: 'moneytalk',
  version: '1.0.10',
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
    bundleIdentifier: 'com.luminawsoftware.moneytalk',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'This app uses the microphone to record your voice for transaction input.',
      NSPhotoLibraryUsageDescription:
        'This app needs access to your photo library to allow you to select images for transactions.',
      NSDocumentPickerUsageDescription:
        'This app needs access to documents to allow you to select files.',
      NSFileProviderDomainUsageDescription:
        'This app needs access to files to save and share transaction data.',
      NSUserTrackingUsageDescription:
        'This app uses tracking data to deliver personalized ads to you.',
      NSHapticsUsageDescription:
        'This app uses haptic feedback to enhance your experience when recording transactions.',
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    package: 'com.luminawsoftware.moneytalk',
    adaptiveIcon: {
      foregroundImage: './assets/images/icon.png',
      backgroundColor: '#ffffff',
    },
    permissions: [
      'com.google.android.gms.permission.AD_ID',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.RECORD_AUDIO',
      'android.permission.VIBRATE',
    ],
    blockedPermissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.CAMERA',
    ],
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
    [
      'expo-document-picker',
      {
        photosPermission:
          'Allow moneytalk to access photos to input transaction',
        microphonePermission:
          'Allow moneytalk to access microphone to record transaction',
      },
    ],
    [
      'expo-av',
      {
        photosPermission:
          'Allow moneytalk to access photos to input transaction',
        microphonePermission:
          'Allow moneytalk to access microphone to record transaction',
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

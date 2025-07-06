import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { ThemeProvider } from '@/context/ThemeContext';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { AuthProvider } from '@/context/AuthContext';

import * as SplashScreen from 'expo-splash-screen';
import mobileAds from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { appOpenAdManager } from '@/utils/appOpenAd';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [appState, setAppState] = useState(AppState.currentState);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [hasShownInitialAd, setHasShownInitialAd] = useState(false);

  useEffect(() => {
    // Show welcome ad on first app launch
    if (isFirstLaunch && !hasShownInitialAd) {
      const timer = setTimeout(() => {
        appOpenAdManager.showAdIfAvailable();
        setIsFirstLaunch(false);
        setHasShownInitialAd(true);
      }, 4000); // Small delay to ensure app is fully loaded

      return () => clearTimeout(timer);
    }
  }, [isFirstLaunch, hasShownInitialAd]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Only show ad when app comes from background to foreground
      // and not during tab navigation (which also triggers inactive->active)
      if (appState === 'background' && nextAppState === 'active' && !hasShownInitialAd) {
        // App came from background to foreground, show ad if available
        appOpenAdManager.showAdIfAvailable();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, hasShownInitialAd]);


  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });

  // Initialize Google Mobile Ads SDK
  useEffect(() => {
    (async () => {
      // Google AdMob will show any messages here that you just set up on the AdMob Privacy & Messaging page
      const { status: trackingStatus } = await requestTrackingPermissionsAsync();
      if (trackingStatus !== 'granted') {
        // Do something here such as turn off Sentry tracking, store in context/redux to allow for personalized ads, etc.
      }

      // Initialize the ads
      await mobileAds().initialize();
    })();
  }, [])

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after fonts have loaded (or if there was an error)
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render anything until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DatabaseProvider>
              <CurrencyProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="transaction-detail" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
                </Stack>
                <StatusBar style="auto" />
              </CurrencyProvider>
            </DatabaseProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
import { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import React from 'react';

// AdMob configuration
const ADMOB_INTERSTITIAL_UNIT_ID = 'ca-app-pub-3827890809706045/7212736994';
const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : ADMOB_INTERSTITIAL_UNIT_ID;

const DEFAULT_KEYWORDS = ['finance', 'app', 'kids', 'family', 'cooking', 'travel', 'food', 'car', 'fruit'];

export class AdMobManager {
  private interstitial: InterstitialAd;
  private loaded: boolean = false;
  private onAdClosed?: () => void;

  constructor(keywords: string[] = DEFAULT_KEYWORDS) {
    this.interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
      keywords,
      requestNonPersonalizedAdsOnly: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Event listener for when the ad is loaded
    this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
      this.loaded = true;
    });

    // Event listener for when the ad is closed
    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      this.loaded = false;
      
      // Execute custom callback or default navigation
      if (this.onAdClosed) {
        this.onAdClosed();
      } else {
        router.replace('/');
      }
      
      // Load a new ad for next time
      this.loadAd();
    });

    // Event listener for ad failed to load
    this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('AdMob error:', error);
      this.loaded = false;
    });
  }

  public loadAd() {
    try {
      this.interstitial.load();
    } catch (error) {
      console.log('Failed to load ad:', error);
    }
  }

  public showAd(onAdClosed?: () => void): Promise<boolean> {
    return new Promise((resolve) => {
      this.onAdClosed = onAdClosed;
      
      try {
        if (this.loaded) {
          this.interstitial.show();
          resolve(true);
        } else {
          console.log('Ad not loaded yet');
          resolve(false);
        }
      } catch (error) {
        console.log('Failed to show ad:', error);
        resolve(false);
      }
    });
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  public destroy() {
    // Clean up event listeners if needed
    this.onAdClosed = undefined;
  }
}

// Hook for using AdMob in React components
export const useAdMob = (keywords?: string[]) => {
  const [adManager] = React.useState(() => new AdMobManager(keywords));
  const [isAdLoaded, setIsAdLoaded] = React.useState(false);

  React.useEffect(() => {
    adManager.loadAd();
    
    // Check ad loaded status periodically
    const interval = setInterval(() => {
      setIsAdLoaded(adManager.isLoaded());
    }, 1000);

    return () => {
      clearInterval(interval);
      adManager.destroy();
    };
  }, [adManager]);

  const showAdWithDelay = async (delay: number = 2000, onAdClosed?: () => void) => {
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        const shown = await adManager.showAd(onAdClosed);
        if (!shown && onAdClosed) {
          // If ad failed to show, execute callback anyway
          onAdClosed();
        }
        resolve();
      }, delay);
    });
  };

  return {
    showAd: adManager.showAd.bind(adManager),
    showAdWithDelay,
    isAdLoaded,
    loadAd: adManager.loadAd.bind(adManager)
  };
};
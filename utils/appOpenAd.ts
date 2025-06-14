import { AppOpenAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

class AppOpenAdManager {
  private appOpenAd: AppOpenAd | null = null;
  private isAdLoaded = false;
  private isShowingAd = false;
  private loadTime = 0;
  private onAdLoadedCallbacks: (() => void)[] = [];
  
  // Use test ID for development, replace with your real ad unit ID for production
  private adUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-3827890809706045/4777289116';
  
  constructor() {
    this.loadAd();
  }
  
  private loadAd = () => {
    this.appOpenAd = AppOpenAd.createForAdRequest(this.adUnitId, {
        requestNonPersonalizedAdsOnly: false,
        keywords: ['finance', 'money', 'budget', 'expense','family', 'kids', 'cooking', 'travel', 'food', 'car', 'fruit'],
      });
    
    this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isAdLoaded = true;
        this.loadTime = Date.now();
        console.log('App Open Ad loaded');
        
        // Execute any pending callbacks
        this.onAdLoadedCallbacks.forEach(callback => callback());
        this.onAdLoadedCallbacks = [];
    });
    
    this.appOpenAd.addAdEventListener(AdEventType.OPENED, () => {
      this.isShowingAd = true;
      console.log('App Open Ad opened');
    });
    
    this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      this.isShowingAd = false;
      this.isAdLoaded = false;
      // Preload the next ad
      this.loadAd();
      console.log('App Open Ad closed');
    });
    
    this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
      this.isAdLoaded = false;
      console.log('App Open Ad error:', error);
      // Retry loading after a delay
      setTimeout(() => this.loadAd(), 5000);
    });
    
    this.appOpenAd.load();
  };
  
  public showAdIfAvailable = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!this.isAdLoaded || this.isShowingAd) {
        console.log('App Open Ad not ready');
        resolve(false);
        return;
      }
      
      // Don't show ad if it's older than 4 hours
      if (Date.now() - this.loadTime > 4 * 60 * 60 * 1000) {
        console.log('App Open Ad expired');
        this.loadAd();
        resolve(false);
        return;
      }
      
      console.log('Showing App Open Ad');
      this.appOpenAd?.show();
      resolve(true);
    });
  };
  
  public showAdWhenReady = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (this.isAdLoaded && !this.isShowingAd) {
        // Ad is ready, show immediately
        this.showAdIfAvailable().then(resolve);
      } else {
        // Ad not ready, wait for it to load
        this.onAdLoadedCallbacks.push(() => {
          this.showAdIfAvailable().then(resolve);
        });
      }
    });
  };
  
  public isAdAvailable = (): boolean => {
    return this.isAdLoaded && !this.isShowingAd;
  };
}

export const appOpenAdManager = new AppOpenAdManager();
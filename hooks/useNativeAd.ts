import { useState, useEffect } from 'react';
import { NativeAd, TestIds } from 'react-native-google-mobile-ads';
// import { useDatabase } from '@/context/DatabaseContext';

export const useNativeAd = (adUnitId?: string) => {
  const [nativeAd, setNativeAd] = useState<NativeAd>();
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const loadAd = async () => {
      try {
        // // Check if user has custom API key (disable ads if they do)
        // const userApiKey = await getApiKey();
        // if (userApiKey) {
        //   setIsLoading(false);
        //   return;
        // }

        const finalAdUnitId = adUnitId || (__DEV__ ? TestIds.NATIVE : 'ca-app-pub-3827890809706045/2435262461');
        const ad = await NativeAd.createForAdRequest(finalAdUnitId);
        setNativeAd(ad);
      } catch (error) {
        console.error('Failed to load native ad:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAd();
  }, [adUnitId]);

  return { nativeAd, isLoading };
};
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } from 'react-native-google-mobile-ads';
import { useNativeAd } from '@/hooks/useNativeAd';
import { useTheme } from '@/context/ThemeContext';

interface NativeAdComponentProps {
    adUnitId?: string;
    style?: any;
}

export const NativeAdComponent: React.FC<NativeAdComponentProps> = ({ adUnitId, style }) => {
    const { nativeAd, isLoading } = useNativeAd(adUnitId);
    const { colors } = useTheme();

    if (isLoading || !nativeAd) {
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            <NativeAdView nativeAd={nativeAd} style={styles.adView}>
                {/* {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )} */}
                <View style={styles.contentContainer}>
                    <NativeAsset assetType={NativeAssetType.HEADLINE}>
                        <Text style={[styles.headline, { color: colors.text }]} numberOfLines={2}>
                            {nativeAd.headline}
                        </Text>
                    </NativeAsset>
                    <Text style={[styles.sponsored, { color: colors.textSecondary }]}>Sponsored</Text>
                    <View style={styles.mediaContainer}>
                        <NativeMediaView style={styles.media} />
                    </View>
                </View>
            </NativeAdView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        overflow: 'hidden',
    },
    adView: {
        width: '100%',
        overflow: 'hidden',
    },
    contentContainer: {
        width: '100%',
        overflow: 'hidden',
    },
    icon: {
        width: 24,
        height: 24,
    },
    headline: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sponsored: {
        fontSize: 12,
        marginTop: 4,
    },
    mediaContainer: {
        width: 120,
        height: 120,
        marginTop: 8,
        overflow: 'hidden',
    },
    media: {
        width: 120,
        height: 120,
    },
});
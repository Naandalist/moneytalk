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
            <NativeAdView nativeAd={nativeAd}>
                {/* {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )} */}
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                    <Text style={[styles.headline, { color: colors.text }]}>
                        {nativeAd.headline}
                    </Text>
                </NativeAsset>
                <Text style={[styles.sponsored, { color: colors.textSecondary }]}>Sponsored</Text>
                <NativeMediaView style={styles.media} />
            </NativeAdView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
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
    media: {
        height: 100,
        marginTop: 8,
    },
});
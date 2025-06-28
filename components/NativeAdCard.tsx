import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } from 'react-native-google-mobile-ads';
import { useNativeAd } from '@/hooks/useNativeAd';
import { useTheme } from '@/context/ThemeContext';

interface NativeAdComponentProps {
    adUnitId?: string;
    style?: any;
}

export const NativeAdCard: React.FC<NativeAdComponentProps> = ({ adUnitId, style }) => {
    const { nativeAd, isLoading } = useNativeAd(adUnitId);
    const { colors } = useTheme();

    if (isLoading || !nativeAd) {
        return null;
    }

    return (
        <NativeAdView
            nativeAd={nativeAd}
            style={[styles.container, { backgroundColor: colors.card }, style]}>
            <View style={styles.content}>
                <View style={styles.mediaContainer}>
                    <NativeMediaView style={[styles.media, { backgroundColor: colors.cardAlt }]} />
                </View>
                <View style={styles.textContainer}>
                    <NativeAsset assetType={NativeAssetType.HEADLINE}>
                        <Text style={[styles.headline, { color: colors.text }]} numberOfLines={1} />
                    </NativeAsset>
                    <Text style={[styles.sponsored, { color: colors.textSecondary }]}>Sponsored</Text>
                </View>
            </View>
        </NativeAdView>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    adView: {
        padding: 16,
        overflow: 'hidden', // Ensure content doesn't overflow
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden', // Ensure content doesn't overflow
    },
    mediaContainer: {
        width: 120,
        height: 120,
        borderRadius: 8,
        overflow: 'hidden', // Ensure media doesn't overflow
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
        overflow: 'hidden', // Ensure text doesn't overflow
    },
    headline: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        marginBottom: 4,
    },
    sponsored: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
    },
    media: {
        width: 120,
        height: 120,
    },
});
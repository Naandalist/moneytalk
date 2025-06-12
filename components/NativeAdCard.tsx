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
        <View style={[styles.container, { backgroundColor: colors.card }, style]}>
            <NativeAdView nativeAd={nativeAd} style={styles.adView}>
                <View style={styles.content}>
                    <NativeMediaView style={[styles.media, { backgroundColor: colors.cardAlt }]} />
                    <View style={styles.textContainer}>
                        <NativeAsset assetType={NativeAssetType.HEADLINE}>
                            <Text style={[styles.headline, { color: colors.text }]}>
                                {nativeAd.headline}
                            </Text>
                        </NativeAsset>
                        <Text style={[styles.sponsored, { color: colors.textSecondary }]}>Sponsored</Text>
                    </View>
                </View>
            </NativeAdView>
        </View>
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
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
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
        width: 80,
        height: 60,
        borderRadius: 8,
    },
});
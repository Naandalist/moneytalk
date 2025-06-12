import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Transaction } from '@/types/transaction';
import TransactionConfirmation from '@/components/TransactionConfirmation';
import CustomNotification from '@/components/CustomNotification';
import { NativeAdComponent } from '@/components/NativeAdComponent';
import { useNotification } from '@/hooks/useNotification';
import { useOpenAI } from '@/utils/useOpenAI';
import { useTransactionProcessor } from '@/hooks/useTransactionProcessor';
import * as Haptics from 'expo-haptics';
import { useAdMob } from '@/utils/admob';

export default function PhotoCaptureScreen() {
    const { showAdWithDelay } = useAdMob(['food', 'car', 'fruit', 'finance', 'app', 'kids', 'family', 'cooking', 'travel']);
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { notification, hideNotification, showError, showSuccess } = useNotification();

    // Custom hooks
    const { analyzeImage, isProcessing } = useOpenAI({
        onError: (error) => showError('Error', error)
    });
    const {
        parsedTransaction,
        setParsedTransaction,
        saveTransaction,
        cancelTransaction
    } = useTransactionProcessor();

    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera roll permissions to upload receipts.');
            return false;
        }
        return true;
    };

    const takePhoto = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const pickImage = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const analyzeReceipt = async () => {
        if (!selectedImage) return;

        try {
            const parsedResult = await analyzeImage(selectedImage);
            console.log({ parsedResult });
            const transaction: Transaction = {
                id: 0,
                amount: Math.abs(parsedResult.amount || 0),
                category: parsedResult.category || 'other',
                type: parsedResult.type || 'expense',
                description: parsedResult.description || 'Receipt transaction',
                date: new Date().toISOString(),
            };

            setParsedTransaction(transaction);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error analyzing receipt:', error);
            showError('Error', 'Failed to analyze receipt. Please try again.');
        }
    };

    const handleSaveTransaction = async (transaction: Transaction) => {
        const success = await saveTransaction(transaction);
        if (success) {
            showSuccess('Success', 'Transaction saved successfully!', 2000)
        }
        else {
            showError('Error', 'Failed to save transaction');
        }
        showAdWithDelay(3000, () => {
            router.replace('/');
        });
    };

    const handleCancel = () => {
        setSelectedImage(null);
        cancelTransaction();
    };

    const goBack = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <ArrowLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Capture Receipt</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                {parsedTransaction ? (
                    <TransactionConfirmation
                        transaction={parsedTransaction}
                        onSave={handleSaveTransaction}
                        onCancel={handleCancel}
                    />
                ) : selectedImage ? (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                        <View style={styles.imageActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.cardAlt }]}
                                onPress={() => setSelectedImage(null)}
                                disabled={isProcessing}
                            >
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                onPress={analyzeReceipt}
                                disabled={isProcessing}
                            >
                                <Text style={[styles.actionButtonText, { color: colors.white }]}>
                                    {isProcessing ? 'Analyzing...' : 'Analyze Receipt'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.captureOptions}>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Take a photo of your receipt or select from gallery
                            </Text>

                            <TouchableOpacity
                                style={[styles.captureButton, { backgroundColor: colors.primary }]}
                                onPress={takePhoto}
                            >
                                <Camera color={colors.white} size={32} />
                                <Text style={[styles.captureButtonText, { color: colors.white }]}>Take Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.captureButton, { backgroundColor: colors.cardAlt }]}
                                onPress={pickImage}
                            >
                                <ImageIcon color={colors.text} size={32} />
                                <Text style={[styles.captureButtonText, { color: colors.text }]}>Choose from Gallery</Text>
                            </TouchableOpacity>
                        </View>
                        <NativeAdComponent style={styles.nativeAdContainer} />
                    </>
                )}
            </View>

            <CustomNotification notification={notification} onClose={hideNotification} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        textAlign: 'center',
        marginBottom: 40,
    },
    captureOptions: {
        flex: 1,
        justifyContent: 'center',
        gap: 20,
    },
    captureButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 12,
        gap: 12,
    },
    captureButtonText: {
        fontSize: 18,
        fontFamily: 'Inter-Medium',
    },
    imageContainer: {
        flex: 1,
    },
    previewImage: {
        flex: 1,
        borderRadius: 12,
        marginBottom: 20,
    },
    imageActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
    },
    nativeAdContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
});
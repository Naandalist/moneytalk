import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ImageIcon, ArrowLeft } from 'lucide-react-native';
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
    const [isProcessing, setIsProcessing] = useState(false);

    // Custom hooks
    const { analyzeImage } = useOpenAI({
        onError: (error) => showError('Error', error)
    });
    const {
        parsedTransaction,
        setParsedTransaction,
        saveTransaction,
        cancelTransaction
    } = useTransactionProcessor();

    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const pickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    const analyzeReceipt = async () => {
        if (!selectedImage) return;

        try {
            setIsProcessing(true)
            const parsedResult = await analyzeImage(selectedImage);
            console.log({ parsedResult });
            const transaction: Transaction = {
                id: 0,
                amount: Math.abs(parsedResult.amount || 0),
                category: parsedResult.category || 'other',
                type: parsedResult.type || 'expense',
                description: parsedResult.description || 'Receipt transaction',
                date: new Date().toISOString(), // Already in UTC, correct for database storage
            };

            setParsedTransaction(transaction);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsProcessing(false)
        } catch (error) {
            console.error('Error analyzing receipt:', error);
            showError('Error', 'Failed to analyze receipt. Please try again.');
            setIsProcessing(false);
        }
    };

    const handleSaveTransaction = async (transaction: Transaction) => {
        const success = await saveTransaction(transaction);
        if (success) {
            showSuccess('Success', 'Transaction saved successfully!', 2000)
            showAdWithDelay(3000, () => {
                router.replace('/');
            });
        }
        else {
            showError('Error', 'Failed to save transaction');
        }
        setSelectedImage(null);
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
                        <NativeAdComponent style={styles.nativeAdContainerMiddle} />
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
                            <NativeAdComponent style={styles.nativeAdContainerMiddle} />
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Select receipt from gallery
                            </Text>

                            <TouchableOpacity
                                style={[styles.captureButton, { backgroundColor: colors.cardAlt }]}
                                onPress={pickImage}
                            >
                                <ImageIcon color={colors.text} size={32} />
                                <Text style={[styles.captureButtonText, { color: colors.text }]}>Choose from Gallery</Text>
                            </TouchableOpacity>
                        </View>
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
        marginBottom: 10,
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
        marginBottom: 10,
    },
    nativeAdContainerMiddle: {
        alignItems: 'center',
        marginBottom: 0,
        marginTop: 0,
    }
});
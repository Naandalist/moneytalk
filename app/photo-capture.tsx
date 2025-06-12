import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useDatabase } from '@/context/DatabaseContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, X, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Transaction } from '@/types/transaction';
import TransactionConfirmation from '@/components/TransactionConfirmation';
import CustomNotification from '@/components/CustomNotification';
import { useNotification } from '@/hooks/useNotification';
import * as Haptics from 'expo-haptics';
import { useAdMob } from '@/utils/admob';

export default function PhotoCaptureScreen() {
    const { colors } = useTheme();
    const { selectedCurrency } = useCurrency();
    const { addTransaction } = useDatabase();
    const insets = useSafeAreaInsets();
    const { notification, hideNotification, showSuccess, showError } = useNotification();

    // Use the AdMob hook with photo-specific keywords
    const { showAdWithDelay, isAdLoaded } = useAdMob(['food', 'car', 'fruit', 'finance', 'app', 'kids', 'family', 'cooking', 'travel']);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [parsedTransaction, setParsedTransaction] = useState<Transaction | null>(null);

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

        setIsAnalyzing(true);
        try {
            const openaiKey = Constants.expoConfig?.extra?.openaiApiKey;
            if (!openaiKey) {
                throw new Error('OpenAI API key not found');
            }

            // Convert image to base64
            const response = await fetch(selectedImage);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64data = reader.result as string;
                const base64Image = base64data.split(',')[1];

                try {
                    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${openaiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-4.1-mini',
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        {
                                            type: 'text',
                                            text: 'Analyze this receipt and extract transaction information. Return a JSON object with: amount (number), description (string), category (one of: food, transport, shopping, entertainment, bills, health, education, other), type ("expense" or "income"), and items (array of item names and prices if visible). Focus on the total amount and main purchase category.'
                                        },
                                        {
                                            type: 'image_url',
                                            image_url: {
                                                url: `data:image/jpeg;base64,${base64Image}`
                                            }
                                        }
                                    ]
                                }
                            ],
                            max_tokens: 500
                        })
                    });

                    if (!visionResponse.ok) {
                        throw new Error('Failed to analyze receipt');
                    }

                    const result = await visionResponse.json();
                    const analysisText = result.choices[0].message.content;

                    // Sanitize the analysis text
                    const sanitizedText = analysisText
                        .replace(/```json\s*/g, '') // Remove ```json markers
                        .replace(/```\s*/g, '')     // Remove ``` markers
                        .trim();

                    // Try to parse JSON from the response
                    let parsedResult;
                    try {
                        parsedResult = JSON.parse(sanitizedText);
                    } catch (err) {
                        // If JSON parsing fails, create a basic structure
                        parsedResult = {
                            amount: 0,
                            description: 'Receipt analysis error',
                            category: 'other',
                            type: 'expense',
                            date: 'today',
                        };
                    }

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
                } finally {
                    setIsAnalyzing(false);
                }
            };

            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error processing image:', error);
            showError('Error', 'Failed to process image. Please try again.');
            setIsAnalyzing(false);
        }
    };

    const handleSaveTransaction = async (transaction: Transaction) => {
        try {
            await addTransaction(transaction);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Reset state
            setSelectedImage(null);
            setParsedTransaction(null);

            showSuccess('Success', 'Transaction saved successfully!', 2000);

            // Show AdMob interstitial ad with delay, then navigate
            await showAdWithDelay(2000, () => {
                router.replace('/');
            });
        } catch (error) {
            console.error('Error saving transaction:', error);
            showError('Error', 'Failed to save transaction. Please try again.');
        }
    };

    const handleCancel = () => {
        setSelectedImage(null);
        setParsedTransaction(null);
    };

    const goBack = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* Header */}
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
                                disabled={isAnalyzing}
                            >
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                onPress={analyzeReceipt}
                                disabled={isAnalyzing}
                            >
                                <Text style={[styles.actionButtonText, { color: colors.white }]}>
                                    {isAnalyzing ? 'Analyzing...' : 'Analyze Receipt'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
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
});
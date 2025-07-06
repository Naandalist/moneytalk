import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Image,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useDatabase } from '@/context/DatabaseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotification } from '@/hooks/useNotification';
import { Transaction } from '@/types/transaction';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getCategoryIcon, categoryList } from '@/utils/categories';
import { ArrowLeft, Edit3, Trash2, Save, X } from 'lucide-react-native';
import CustomNotification from '@/components/CustomNotification';
import { NativeAdCard } from '@/components/NativeAdCard';
import { getSignedImageUrl } from '@/utils/imageUtils';

export default function TransactionDetailScreen() {
    const { colors } = useTheme();
    const { deleteTransaction, updateTransaction } = useDatabase();
    const { selectedCurrency } = useCurrency();
    const { notification, showWarning, showSuccess, showError, hideNotification } = useNotification();

    /**
     * Load signed URL for secure image access
     */
    const loadSignedImageUrl = async () => {
        if (!transaction?.imageUrl) {
            setSignedImageUrl(null);
            return;
        }

        setImageLoading(true);
        try {
            const result = await getSignedImageUrl(transaction.imageUrl, 3600); // 1 hour expiry
            if (result.success && result.signedUrl) {
                setSignedImageUrl(result.signedUrl);
            } else {
                console.error('Failed to load signed URL:', result.error);
                setSignedImageUrl(null);
            }
        } catch (error) {
            console.error('Error loading signed URL:', error);
            setSignedImageUrl(null);
        } finally {
            setImageLoading(false);
        }
    };
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Parse transaction data from params
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        amount: '',
        category: '',
        type: 'expense' as 'expense' | 'income',
        description: '',
        date: '',
    });

    useEffect(() => {
        if (params.transactionData) {
            try {
                const parsedTransaction = JSON.parse(params.transactionData as string) as Transaction;
                setTransaction(parsedTransaction);
                setEditForm({
                    amount: Math.abs(parsedTransaction.amount).toString(),
                    category: parsedTransaction.category,
                    type: parsedTransaction.type,
                    description: parsedTransaction.description || '',
                    date: parsedTransaction.date,
                });
            } catch (error) {
                console.error('Error parsing transaction data:', error);
                router.back();
            }
        }
    }, [params.transactionData]);

    // Load signed image URL when transaction changes
    useEffect(() => {
        loadSignedImageUrl();
    }, [transaction?.imageUrl]);

    const handleDelete = () => {
        showWarning(
            'Delete Transaction',
            `Are you sure you want to delete this ${transaction?.type} of ${formatCurrency(Math.abs(transaction?.amount || 0), selectedCurrency.code)}?`,
            undefined,
            [
                {
                    label: 'Cancel',
                    onPress: hideNotification,
                },
                {
                    label: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        hideNotification();
                        try {
                            if (transaction) {
                                await deleteTransaction(transaction.id);
                                showSuccess('Success', 'Transaction deleted successfully');
                                setTimeout(() => router.back(), 1500);
                            }
                        } catch (error) {
                            showError('Error', 'Failed to delete transaction');
                        }
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        try {
            if (!transaction || !transaction.id) {
                throw new Error('Transaction ID is missing');
            }

            // Create updated transaction object
            const updatedTransaction: Transaction = {
                ...transaction,
                amount: editForm.type === 'expense' ? -Math.abs(parseFloat(editForm.amount)) : Math.abs(parseFloat(editForm.amount)),
                category: editForm.category,
                type: editForm.type,
                description: editForm.description, // This is the edited description from the form
                date: editForm.date
            };

            // Log the transaction before update for debugging
            console.log('Updating transaction with description:', updatedTransaction.description);

            const success = await updateTransaction(updatedTransaction);

            if (success) {
                showSuccess('Success', 'Transaction updated successfully', 2000);
                setTransaction(updatedTransaction); // Update local state
                setIsEditing(false);
            } else {
                showError('Error', 'Failed to update transaction');
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            showError('Error', 'Failed to update transaction');
        }
    };

    const handleCategorySelect = (category: string) => {
        setEditForm({ ...editForm, category });
        setShowCategoryModal(false);
    };

    if (!transaction) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                    Transaction not found
                </Text>
            </View>
        );
    }

    const CategoryIcon = getCategoryIcon(transaction.category);
    const isExpense = transaction.type === 'expense';
    const amountColor = isExpense ? colors.error : colors.success;
    const amountPrefix = isExpense ? '-' : '+';

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Transaction Details</Text>
                <View style={styles.headerActions}>
                    {isEditing ? (
                        <>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.actionButton}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
                                <Save size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.actionButton}>
                                <Edit3 size={20} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                                <Trash2 size={20} color={colors.error} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Amount Section */}
                <View style={[styles.amountSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
                    {isEditing ? (
                        <View style={styles.amountEditContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    { backgroundColor: editForm.type === 'expense' ? colors.error : colors.cardAlt }
                                ]}
                                onPress={() => setEditForm({ ...editForm, type: 'expense' })}
                            >
                                <Text style={[styles.typeButtonText, { color: editForm.type === 'expense' ? colors.white : colors.text }]}>
                                    Expense
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    { backgroundColor: editForm.type === 'income' ? colors.success : colors.cardAlt }
                                ]}
                                onPress={() => setEditForm({ ...editForm, type: 'income' })}
                            >
                                <Text style={[styles.typeButtonText, { color: editForm.type === 'income' ? colors.white : colors.text }]}>
                                    Income
                                </Text>
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.amountInput, { color: colors.text, borderColor: colors.border }]}
                                value={editForm.amount}
                                onChangeText={(text) => setEditForm({ ...editForm, amount: text })}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                    ) : (
                        <>
                            <Text style={[styles.amount, { color: amountColor }]}>
                                {amountPrefix}{formatCurrency(Math.abs(transaction.amount), selectedCurrency.code)}
                            </Text>
                            <Text style={[styles.typeButtonText, { color: editForm.type === 'income' ? colors.white : colors.text }]}>
                                Income
                            </Text>
                        </>
                    )}
                </View>

                <NativeAdCard />

                {/* Category Section */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
                    {isEditing ? (
                        <TouchableOpacity
                            style={[styles.categorySelector, { borderColor: colors.border }]}
                            onPress={() => setShowCategoryModal(true)}
                        >
                            <View style={styles.categoryContent}>
                                <View style={[styles.categoryIcon, { backgroundColor: colors.cardAlt }]}>
                                    <CategoryIcon size={20} color={colors.primary} />
                                </View>
                                <Text style={[styles.categoryText, { color: colors.text }]}>{editForm.category}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.categoryContent}>
                            <View style={[styles.categoryIcon, { backgroundColor: colors.cardAlt }]}>
                                <CategoryIcon size={24} color={colors.primary} />
                            </View>
                            <Text style={[styles.categoryText, { color: colors.text }]}>{transaction.category}</Text>
                        </View>
                    )}
                </View>

                {/* Description Section */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
                    {isEditing ? (
                        <TextInput
                            style={[styles.descriptionInput, { color: colors.text, borderColor: colors.border }]}
                            value={editForm.description}
                            onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                            placeholder="Add description..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />
                    ) : (
                        <Text style={[styles.descriptionText, { color: colors.text }]}>
                            {transaction.description || 'No description'}
                        </Text>
                    )}
                </View>

                {/* Receipt Image Section */}
                {transaction.imageUrl && (
                    <View style={[styles.section, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Receipt Image</Text>
                        <TouchableOpacity
                            style={styles.imageContainer}
                            onPress={() => signedImageUrl && setShowImageModal(true)}
                            disabled={imageLoading || !signedImageUrl}
                        >
                            {imageLoading ? (
                                <View style={[styles.receiptImage, { borderColor: colors.border, backgroundColor: colors.cardAlt, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={[{ color: colors.textSecondary }]}>Loading...</Text>
                                </View>
                            ) : signedImageUrl ? (
                                <Image
                                    source={{ uri: signedImageUrl }}
                                    style={[styles.receiptImage, { borderColor: colors.border }]}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={[styles.receiptImage, { borderColor: colors.border, backgroundColor: colors.cardAlt, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={[{ color: colors.textSecondary }]}>Failed to load image</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Date Section */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Date</Text>
                    <Text style={[styles.dateText, { color: colors.text }]}>
                        {formatDate(transaction.date)}
                    </Text>
                </View>
            </ScrollView>

            {/* Category Selection Modal */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Category</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.categoryList}>
                            {categoryList.map((category) => {
                                const Icon = getCategoryIcon(category);
                                return (
                                    <TouchableOpacity
                                        key={category}
                                        style={[styles.categoryItem, { borderBottomColor: colors.border }]}
                                        onPress={() => handleCategorySelect(category)}
                                    >
                                        <View style={[styles.categoryIcon, { backgroundColor: colors.cardAlt }]}>
                                            <Icon size={20} color={colors.primary} />
                                        </View>
                                        <Text style={[styles.categoryText, { color: colors.text }]}>{category}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Full Screen Image Modal */}
            <Modal
                visible={showImageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}
            >
                <View style={styles.imageModalOverlay}>
                    <TouchableOpacity
                        style={styles.imageModalCloseArea}
                        onPress={() => setShowImageModal(false)}
                        activeOpacity={1}
                    >
                        <View style={styles.imageModalContent}>
                            <TouchableOpacity
                                style={styles.imageModalCloseButton}
                                onPress={() => setShowImageModal(false)}
                            >
                                <X size={24} color={colors.white} />
                            </TouchableOpacity>
                            {signedImageUrl && (
                                <Image
                                    source={{ uri: signedImageUrl }}
                                    style={styles.fullScreenImage}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Add CustomNotification component */}
            {notification && (
                <CustomNotification
                    notification={notification}
                    onClose={hideNotification}
                />
            )}
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    amountSection: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    amountLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        marginBottom: 8,
    },
    amount: {
        fontSize: 32,
        fontFamily: 'Inter-Bold',
    },
    amountEditContainer: {
        alignItems: 'center',
        width: '100%',
    },
    typeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginHorizontal: 4,
        marginBottom: 12,
    },
    typeButtonText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
    },
    amountInput: {
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        width: '80%',
    },
    section: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        marginBottom: 8,
    },
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryText: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
    },
    categorySelector: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
    },
    descriptionInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        textAlignVertical: 'top',
    },
    descriptionText: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        lineHeight: 24,
    },
    dateText: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        textAlign: 'center',
        marginTop: 50,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
    },
    categoryList: {
        maxHeight: 400,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    imageContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    receiptImage: {
        width: Dimensions.get('window').width - 64, // Full width minus padding
        height: 200,
        borderRadius: 12,
        borderWidth: 1,
    },
    imageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageModalCloseArea: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageModalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageModalCloseButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
    },
    fullScreenImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
});
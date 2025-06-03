import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/types/transaction';
import { Check, X, Save, Calendar, Clock } from 'lucide-react-native';
import { categoryList, getCategoryIcon } from '@/utils/categories';
import { formatCurrency } from 'react-native-format-currency';

type TransactionConfirmationProps = {
  transaction: Transaction;
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
};

export default function TransactionConfirmation({
  transaction,
  onSave,
  onCancel
}: TransactionConfirmationProps) {
  const { colors } = useTheme();
  const { selectedCurrency } = useCurrency();
  const [editedTransaction, setEditedTransaction] = useState<Transaction>({ ...transaction });
  const [displayValue, setDisplayValue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    // Initialize display value with formatted currency
    const amount = Math.abs(editedTransaction.amount);
    if (amount > 0) {
      const [formattedWithoutSymbol] = formatCurrency({ amount, code: selectedCurrency.code });
      setDisplayValue(formattedWithoutSymbol.replace(/[^\d.,]/g, ''));
    } else {
      setDisplayValue('');
    }
  }, [editedTransaction.amount, selectedCurrency.code]);

  const updateAmount = (text: string) => {
    // Remove all non-numeric characters except decimal point
    const cleanText = text.replace(/[^\d.]/g, '');
    const numericValue = parseFloat(cleanText) || 0;

    // Update the actual transaction amount
    setEditedTransaction({
      ...editedTransaction,
      amount: numericValue,
    });

    // Format and update display value
    if (numericValue > 0) {
      const [, valueFormattedWithoutSymbol] = formatCurrency({
        amount: numericValue,
        code: selectedCurrency.code
      });
      setDisplayValue(valueFormattedWithoutSymbol);
    } else {
      setDisplayValue(text);
    }
  };

  const updateDescription = (text: string) => {
    setEditedTransaction({
      ...editedTransaction,
      description: text,
    });
  };

  const toggleTransactionType = () => {
    const newType = editedTransaction.type === 'expense' ? 'income' : 'expense';
    setEditedTransaction({
      ...editedTransaction,
      type: newType,
    });
  };

  const selectCategory = (category: string) => {
    setEditedTransaction({
      ...editedTransaction,
      category,
    });
  };

  const handleSave = () => {
    // Ensure amount is positive for income and negative for expense
    const finalAmount = editedTransaction.type === 'expense'
      ? -Math.abs(editedTransaction.amount)
      : Math.abs(editedTransaction.amount);

    onSave({
      ...editedTransaction,
      amount: finalAmount,
    });
  };

  const updateDate = (text: string) => {
    setEditedTransaction({
      ...editedTransaction,
      date: text,
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        // Preserve existing time when changing date
        const currentDateTime = editedTransaction.date ? new Date(editedTransaction.date) : new Date();
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(currentDateTime.getHours());
        newDateTime.setMinutes(currentDateTime.getMinutes());

        setEditedTransaction({
          ...editedTransaction,
          date: newDateTime.toISOString(),
        });
      }
    } else {
      // iOS handling
      if (selectedDate) {
        const currentDateTime = editedTransaction.date ? new Date(editedTransaction.date) : new Date();
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(currentDateTime.getHours());
        newDateTime.setMinutes(currentDateTime.getMinutes());

        setEditedTransaction({
          ...editedTransaction,
          date: newDateTime.toISOString(),
        });
      }
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        // Preserve existing date when changing time
        const currentDateTime = editedTransaction.date ? new Date(editedTransaction.date) : new Date();
        const newDateTime = new Date(currentDateTime);
        newDateTime.setHours(selectedTime.getHours());
        newDateTime.setMinutes(selectedTime.getMinutes());

        setEditedTransaction({
          ...editedTransaction,
          date: newDateTime.toISOString(),
        });
      }
    } else {
      // iOS handling
      if (selectedTime) {
        const currentDateTime = editedTransaction.date ? new Date(editedTransaction.date) : new Date();
        const newDateTime = new Date(currentDateTime);
        newDateTime.setHours(selectedTime.getHours());
        newDateTime.setMinutes(selectedTime.getMinutes());

        setEditedTransaction({
          ...editedTransaction,
          date: newDateTime.toISOString(),
        });
      }
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setShowTimePicker(true);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Select Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeForDisplay = (dateString: string) => {
    if (!dateString) return 'Select Time';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const SelectedCategoryIcon = getCategoryIcon(editedTransaction.category);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Text style={[styles.title, { color: colors.text }]}>Confirm Transaction</Text>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Transaction Type Toggle */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                editedTransaction.type === 'expense' && { backgroundColor: colors.error },
              ]}
              onPress={() => setEditedTransaction({ ...editedTransaction, type: 'expense' })}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: editedTransaction.type === 'expense' ? colors.white : colors.textSecondary }
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                editedTransaction.type === 'income' && { backgroundColor: colors.success },
              ]}
              onPress={() => setEditedTransaction({ ...editedTransaction, type: 'income' })}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: editedTransaction.type === 'income' ? colors.white : colors.textSecondary }
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>{selectedCurrency.symbol}</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: colors.text, borderBottomColor: colors.border }
                ]}
                value={displayValue}
                onChangeText={updateAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[
                styles.descriptionInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardAlt }
              ]}
              value={editedTransaction.description || ''}
              onChangeText={updateDescription}
              placeholder="Add a note about this transaction..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Date and Time Input */}
          <View style={styles.dateTimeContainer}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Date & Time</Text>

            <View style={styles.dateTimeRow}>
              {/* Date Picker */}
              <TouchableOpacity style={[styles.dateTimeInputContainer, { flex: 1, marginRight: 8 }]} onPress={openDatePicker}>
                <Calendar size={20} color={colors.primary} style={styles.dateIcon} />
                <View style={[
                  styles.dateTimeInput,
                  { borderColor: colors.border, backgroundColor: colors.cardAlt }
                ]}>
                  <Text style={[
                    styles.dateTimeText,
                    { color: editedTransaction.date ? colors.text : colors.textSecondary }
                  ]}>
                    {formatDateForDisplay(editedTransaction.date)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Time Picker */}
              <TouchableOpacity style={[styles.dateTimeInputContainer, { flex: 1, marginLeft: 8 }]} onPress={openTimePicker}>
                <Clock size={20} color={colors.primary} style={styles.dateIcon} />
                <View style={[
                  styles.dateTimeInput,
                  { borderColor: colors.border, backgroundColor: colors.cardAlt }
                ]}>
                  <Text style={[
                    styles.dateTimeText,
                    { color: editedTransaction.date ? colors.text : colors.textSecondary }
                  ]}>
                    {formatTimeForDisplay(editedTransaction.date)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Category</Text>

            <View style={styles.selectedCategory}>
              <View style={[styles.categoryIcon, { backgroundColor: colors.cardAlt }]}>
                <SelectedCategoryIcon size={20} color={colors.primary} />
              </View>
              <Text style={[styles.selectedCategoryText, { color: colors.text }]}>
                {editedTransaction.category}
              </Text>
            </View>

            <View style={styles.categoriesGrid}>
              {categoryList.map((category) => {
                const CategoryIcon = getCategoryIcon(category);
                const isSelected = editedTransaction.category === category;

                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryItem,
                      { backgroundColor: isSelected ? colors.primary : colors.cardAlt },
                    ]}
                    onPress={() => selectCategory(category)}
                  >
                    <CategoryIcon
                      size={20}
                      color={isSelected ? colors.white : colors.primary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={editedTransaction.date ? new Date(editedTransaction.date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={editedTransaction.date ? new Date(editedTransaction.date) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          is24Hour={false}
        />
      )}

      {/* Action Buttons - Fixed at bottom, above keyboard */}
      <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <X size={20} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Save size={20} color={colors.white} />
          <Text style={[styles.buttonText, { color: colors.white }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginBottom: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  typeButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  amountContainer: {
    marginBottom: 20,
  },
  amountLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  descriptionInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 60,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedCategoryText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for safe area on iOS
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  buttonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginLeft: 8,
    flexShrink: 1,
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  datePreview: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  dateTimeContainer: {
    marginBottom: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginLeft: 8,
  },
  dateTimeText: {
    fontSize: 16,
  },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/types/transaction';
import { Check, X, Save } from 'lucide-react-native';
import { categoryList, getCategoryIcon } from '@/utils/categories';

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
  const [editedTransaction, setEditedTransaction] = useState<Transaction>({...transaction});
  
  const updateAmount = (text: string) => {
    const numericValue = parseFloat(text.replace(/[^0-9.]/g, ''));
    setEditedTransaction({
      ...editedTransaction,
      amount: isNaN(numericValue) ? 0 : numericValue,
    });
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
  
  const SelectedCategoryIcon = getCategoryIcon(editedTransaction.category);
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Confirm Transaction</Text>
      
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Transaction Type Toggle */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              editedTransaction.type === 'expense' && { backgroundColor: colors.error },
            ]}
            onPress={() => setEditedTransaction({...editedTransaction, type: 'expense'})}
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
            onPress={() => setEditedTransaction({...editedTransaction, type: 'income'})}
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
              value={String(Math.abs(editedTransaction.amount))}
              onChangeText={updateAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
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
            numberOfLines={3}
            textAlignVertical="top"
          />
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
      
      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
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
    </View>
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
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 80,
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
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  buttonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginLeft: 8,
  },
});
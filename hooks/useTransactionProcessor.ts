import { useState } from 'react';
import { Transaction } from '@/types/transaction';
import { useDatabase } from '@/context/DatabaseContext';
import { analyzeTransaction } from '@/utils/transactionAnalyzer';
import * as Haptics from 'expo-haptics';

export const useTransactionProcessor = () => {
  const [parsedTransaction, setParsedTransaction] = useState<Transaction | null>(null);
  const { addTransaction } = useDatabase();

  const processTranscription = async (transcription: string) => {
    try {
      const parsedResult = await analyzeTransaction(transcription);
      
      if (parsedResult && typeof parsedResult.amount === 'number' && parsedResult.category) {
        setParsedTransaction(parsedResult);
      } else {
        console.error('Invalid transaction result:', parsedResult);
      }
    } catch (error) {
      console.error('Error analyzing transaction:', error);
    }
  };

  const saveTransaction = async (transaction: Transaction, originalText?: string) => {
    try {
      // Only use originalText if the description hasn't been edited
      // If transaction.description is different from parsedTransaction.description,
      // it means the user has edited it, so we should keep their edit
      const useOriginalText = parsedTransaction && 
                             transaction.description === parsedTransaction.description && 
                             originalText;
      
      const transactionWithText = {
        ...transaction,
        description: useOriginalText || transaction.description || ''
      };

      console.log('Saving transaction with description:', transactionWithText.description);
      await addTransaction(transactionWithText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setParsedTransaction(null);
      return true
    } catch (error) {
      console.log('Error saving transaction:', error);
      return false;
    }
  };

  const cancelTransaction = () => {
    setParsedTransaction(null);
  };

  return {
    parsedTransaction,
    setParsedTransaction,
    processTranscription,
    saveTransaction,
    cancelTransaction
  };
};
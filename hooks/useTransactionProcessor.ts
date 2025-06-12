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
      const transactionWithText = {
        ...transaction,
        description: originalText || transaction.description || ''
      };

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
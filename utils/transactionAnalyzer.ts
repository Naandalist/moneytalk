import { Transaction } from '@/types/transaction';
import { categoryList } from './categories';

// In a real app, this would connect to an AI service like OpenAI
// This is a simplified mock implementation
export async function analyzeTransaction(transcription: string): Promise<Transaction> {
  // Default transaction
  const transaction: Transaction = {
    id: 0, // Will be assigned by DB
    amount: 0,
    category: 'Other',
    type: 'expense',
    description: transcription,
    date: new Date().toISOString()
  };
  
  // Simple word matching for demo purposes
  const text = transcription.toLowerCase();
  
  // Check for expense vs income keywords
  if (text.includes('received') || 
      text.includes('earned') || 
      text.includes('salary') || 
      text.includes('income') ||
      text.includes('got paid')) {
    transaction.type = 'income';
  } else {
    transaction.type = 'expense';
  }
  
  // Extract amount - look for numbers
  const amountMatch = text.match(/\$?\s?(\d+(\.\d+)?)/);
  if (amountMatch) {
    transaction.amount = parseFloat(amountMatch[1]);
    
    // Make amount negative for expenses
    if (transaction.type === 'expense') {
      transaction.amount = -transaction.amount;
    }
  }
  
  // Categorize based on keywords
  if (text.includes('groceries') || text.includes('supermarket') || text.includes('food shopping')) {
    transaction.category = 'Groceries';
  } else if (text.includes('restaurant') || text.includes('lunch') || text.includes('dinner') || text.includes('coffee')) {
    transaction.category = 'Dining';
  } else if (text.includes('rent') || text.includes('mortgage') || text.includes('housing')) {
    transaction.category = 'Housing';
  } else if (text.includes('uber') || text.includes('lyft') || text.includes('taxi') || text.includes('bus') || text.includes('train')) {
    transaction.category = 'Transport';
  } else if (text.includes('doctor') || text.includes('hospital') || text.includes('medicine') || text.includes('healthcare')) {
    transaction.category = 'Healthcare';
  } else if (text.includes('clothes') || text.includes('shoes') || text.includes('shopping')) {
    transaction.category = 'Shopping';
  } else if (text.includes('school') || text.includes('tuition') || text.includes('books') || text.includes('education')) {
    transaction.category = 'Education';
  } else if (text.includes('salary') || text.includes('paycheck')) {
    transaction.category = 'Salary';
  } else if (text.includes('bill') || text.includes('utility') || text.includes('electricity') || text.includes('water') || text.includes('internet')) {
    transaction.category = 'Bills';
  } else if (transaction.type === 'income') {
    transaction.category = 'Income';
  }
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return transaction;
}
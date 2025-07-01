import { Transaction } from '../types/transaction';
import { categoryList } from './categories';
import { convertToUTC, getUserTimezone, getCurrentDateInTimezone } from './timezoneUtils';
import Constants from 'expo-constants';

// OpenAI API integration for transaction analysis
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

  try {
    // Use OpenAI to analyze transaction type and category
    const analysis = await analyzeWithOpenAI(transcription);
    
    // Apply OpenAI analysis results
    transaction.type = analysis.type;
    transaction.category = analysis.category;
    transaction.amount = analysis.amount;
    
    // Properly handle timezone conversion for the date
    if (analysis.date) {
      // Convert the date from user's timezone to UTC for database storage
      transaction.date = convertToUTC(analysis.date);
    } else {
      transaction.date = new Date().toISOString();
    }
    
    // Make amount negative for expenses
    if (transaction.type === 'expense' && transaction.amount > 0) {
      transaction.amount = -transaction.amount;
    }
    
  } catch (error) {
    console.error('OpenAI analysis failed, falling back to keyword matching:', error);
    
    // Fallback to enhanced keyword matching
    const fallbackAnalysis = analyzeWithKeywords(transcription);
    transaction.type = fallbackAnalysis.type;
    transaction.category = fallbackAnalysis.category;
    transaction.amount = fallbackAnalysis.amount;
    
    // Make amount negative for expenses
    if (transaction.type === 'expense' && transaction.amount > 0) {
      transaction.amount = -transaction.amount;
    }
  }

  return transaction;
}

// OpenAI API integration
async function analyzeWithOpenAI(transcription: string): Promise<{
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
}> {

  const openaiKey = Constants.expoConfig?.extra?.openaiApiKey || null;
  if (!openaiKey) {
    throw new Error('OpenAI API key not found');
  }

  const availableCategories = categoryList.join(', ');

  const timezone = getUserTimezone();
  const currentDatetime = getCurrentDateInTimezone(timezone); // Get current datetime in user's timezone
  const currentDatetimeUTC = new Date().toISOString(); // UTC reference for OpenAI

  console.log({timezone, currentDatetime, currentDatetimeUTC})
  
  const prompt = `User timezone: ${timezone}
Current datetime in user timezone: ${currentDatetime}
Current UTC datetime: ${currentDatetimeUTC}

Analyze this financial transaction description and extract:
1. Transaction type: "income" or "expense"
2. Category: Choose one from this list → ${availableCategories}
3. Amount: Numeric only (no currency symbols or words)
4. Time Reference: Detect and convert any natural language time references (in English or Indonesian) to datetime format in the user's timezone.

Time parsing examples (all relative to current datetime in user timezone):
- "yesterday" / "kemarin" → current date - 1 day
- "2 days ago" / "2 hari yang lalu" → current date - 2 days
- "last week" / "minggu lalu" → current date - 7 days
- "this morning" / "pagi ini" → today at 09:00
- "last night" / "tadi malam" → yesterday at 21:00

If no time reference is found, use the current datetime in user timezone.

Transaction description: "${transcription}"

Respond ONLY in this JSON format:
{
  "type": "income" or "expense",
  "category": "category from the list",
  "amount": number,
  "date": "YYYY-MM-DDTHH:mm:ss",
  "timezone": "${timezone}"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-nano-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a financial transaction analyzer. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 150
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const analysis = JSON.parse(content);
    
    // Validate the response
    if (!analysis.type || !analysis.category || typeof analysis.amount !== 'number') {
      throw new Error('Invalid OpenAI response format');
    }
    
    // Ensure category is in our list
    if (!categoryList.includes(analysis.category)) {
      analysis.category = 'Other';
    }
    
    console.log('OpenAI analysis:', analysis);
    return analysis;
  } catch (parseError) {
    throw new Error('Failed to parse OpenAI response');
  }
}

// Enhanced fallback keyword matching with Indonesian support
function analyzeWithKeywords(transcription: string): {
  type: 'income' | 'expense';
  category: string;
  amount: number;
} {
  const text = transcription.toLowerCase();
  
  // Enhanced patterns for income/expense detection (English + Indonesian)
  const incomePatterns = /\b(received|earned|salary|income|got paid|gaji|terima|pendapatan|bonus|komisi|upah)\b/i;
  const expensePatterns = /\b(spent|paid|bought|purchase|beli|bayar|buat|untuk|keluar|pengeluaran)\b/i;
  
  let type: 'income' | 'expense' = 'expense';
  
  if (incomePatterns.test(text)) {
    type = 'income';
  } else if (expensePatterns.test(text)) {
    type = 'expense';
  }
  
  // Extract amount
  let amount = 0;
  const amountMatch = text.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
  }
  
  // Enhanced categorization with Indonesian terms
  let category = 'Other';
  
  if (/\b(groceries|supermarket|food shopping|belanja|makanan|sembako|pasar)\b/i.test(text)) {
    category = 'Groceries';
  } else if (/\b(restaurant|lunch|dinner|coffee|makan|restoran|kafe|warung)\b/i.test(text)) {
    category = 'Dining';
  } else if (/\b(rent|mortgage|housing|sewa|rumah|kos|kontrakan)\b/i.test(text)) {
    category = 'Housing';
  } else if (/\b(uber|lyft|taxi|bus|train|ojek|angkot|transportasi|bensin)\b/i.test(text)) {
    category = 'Transport';
  } else if (/\b(doctor|hospital|medicine|healthcare|dokter|rumah sakit|obat|kesehatan)\b/i.test(text)) {
    category = 'Healthcare';
  } else if (/\b(clothes|shoes|shopping|baju|sepatu|belanja|fashion)\b/i.test(text)) {
    category = 'Shopping';
  } else if (/\b(school|tuition|books|education|sekolah|kuliah|buku|pendidikan)\b/i.test(text)) {
    category = 'Education';
  } else if (/\b(salary|paycheck|gaji|upah)\b/i.test(text)) {
    category = 'Salary';
  } else if (/\b(bill|utility|electricity|water|internet|tagihan|listrik|air|wifi)\b/i.test(text)) {
    category = 'Bills';
  } else if (type === 'income') {
    category = 'Income';
  }

  console.log('Analyzed transaction:', { type, category, amount });
  
  return { type, category, amount };
}
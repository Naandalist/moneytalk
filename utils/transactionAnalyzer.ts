import { Transaction } from '../types/transaction';
import { categoryList } from './categories';
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
}> {

  const openaiKey = Constants.expoConfig?.extra?.openaiApiKey || null;
  if (!openaiKey) {
    throw new Error('OpenAI API key not found');
  }

  const availableCategories = categoryList.join(', ');
  
  const prompt = `Analyze this financial transaction description and extract:
1. Transaction type (income or expense)
2. Category from this list: ${availableCategories}
3. Amount (number only, no currency symbols)

Transaction description: "${transcription}"

Support multiple currencies and languages. Recognize these currency symbols and their associated languages:
- $ (USD) - English
- € (EUR) - English, German, French, Spanish, Italian
- £ (GBP) - English
- ¥ (JPY) - English, Japanese
- Rp (IDR) - Indonesian, English
- S$ (SGD) - English, Chinese, Malay
- RM (MYR) - English, Malay, Chinese

Language examples:
English:
- "I spent $50 for groceries" → expense, Groceries, 50
- "Received salary £2000" → income, Salary, 2000
- "Gas bill €45.50" → expense, Utilities, 45.50

Indonesian:
- "Saya beli makanan Rp25000" → expense, Groceries, 25000
- "Terima gaji Rp3000000" → income, Salary, 3000000
- "Bayar listrik Rp150000" → expense, Utilities, 150000

German:
- "Ich habe €30 für Lebensmittel ausgegeben" → expense, Groceries, 30
- "Gehalt erhalten €2500" → income, Salary, 2500

French:
- "J'ai dépensé €25 pour l'épicerie" → expense, Groceries, 25
- "Salaire reçu €2200" → income, Salary, 2200

Spanish:
- "Gasté €40 en comestibles" → expense, Groceries, 40
- "Recibí salario €1800" → income, Salary, 1800

Japanese:
- "食料品に¥1200使った" → expense, Groceries, 1200
- "給料¥250000もらった" → income, Salary, 250000

Malay:
- "Saya belanja RM150 untuk makanan" → expense, Groceries, 150
- "Terima gaji S$3000" → income, Salary, 3000

Chinese (Simplified):
- "我花了S$80买食物" → expense, Groceries, 80
- "收到工资RM2500" → income, Salary, 2500

Extract only the numeric value without currency symbols. Handle decimal amounts correctly.

Respond in JSON format only:
{
  "type": "income" or "expense",
  "category": "category from the list",
  "amount": number
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
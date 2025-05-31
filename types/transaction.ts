export interface Transaction {
  id: number;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  description?: string;
  date: string;
}
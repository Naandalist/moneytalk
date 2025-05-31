import { ShoppingCart, Utensils, Chrome as Home, Car, Brain as Train, Briefcase, HeartPulse, Scissors, GraduationCap, Wallet, Receipt, CreditCard, Banknote } from 'lucide-react-native';

// Category definitions
export const categoryList = [
  'Groceries',
  'Dining',
  'Housing',
  'Transport',
  'Healthcare',
  'Personal',
  'Education',
  'Income',
  'Salary',
  'Bills',
  'Shopping',
  'Other'
];

// Category colors for charts
export const categoryColors: {[key: string]: string} = {
  'Groceries': '#4CAF50', // Green
  'Dining': '#FFA726', // Orange
  'Housing': '#42A5F5', // Blue
  'Transport': '#EF5350', // Red
  'Healthcare': '#AB47BC', // Purple
  'Personal': '#EC407A', // Pink
  'Education': '#7E57C2', // Deep Purple
  'Income': '#66BB6A', // Light Green
  'Salary': '#26A69A', // Teal
  'Bills': '#FF7043', // Deep Orange
  'Shopping': '#29B6F6', // Light Blue
  'Other': '#78909C' // Blue Grey
};

// Get icon component for a category
export const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Groceries':
      return ShoppingCart;
    case 'Dining':
      return Utensils;
    case 'Housing':
      return Home;
    case 'Transport':
      return Car;
    case 'Travel':
      return Train;
    case 'Healthcare':
      return HeartPulse;
    case 'Personal':
      return Scissors;
    case 'Education':
      return GraduationCap;
    case 'Income':
      return Wallet;
    case 'Salary':
      return Banknote;
    case 'Bills':
      return Receipt;
    case 'Shopping':
      return CreditCard;
    default:
      return Wallet;
  }
};
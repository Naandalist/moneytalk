export interface AppColors {
  primary: string;
  primaryLight: string;
  accent: string;
  success: string;
  error: string;
  warning: string;
  background: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  white: string;
}

export const lightColors: AppColors = {
  primary: '#6A5ACD', // Purple
  primaryLight: '#8B7CE2',
  accent: '#FF9800', // Orange
  success: '#4CAF50', // Green
  error: '#F44336', // Red
  warning: '#FFC107', // Amber
  background: '#F8F9FA',
  card: '#FFFFFF',
  cardAlt: '#F0F0F8',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  white: '#FFFFFF',
};

export const darkColors: AppColors = {
  primary: '#7B68EE', // Lighter purple for dark theme
  primaryLight: '#9D91F2',
  accent: '#FFB74D', // Lighter orange for dark theme
  success: '#66BB6A', // Lighter green for dark theme
  error: '#EF5350', // Lighter red for dark theme
  warning: '#FFCA28', // Lighter amber for dark theme
  background: '#121212',
  card: '#1E1E1E',
  cardAlt: '#2D2D2D',
  text: '#EEEEEE',
  textSecondary: '#B0B0B0',
  border: '#333333',
  white: '#FFFFFF',
};
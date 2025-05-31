export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(string: string): string {
  const date = new Date(string);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && 
                  date.getMonth() === now.getMonth() && 
                  date.getFullYear() === now.getFullYear();
  
  // Format time (hour and minute)
  const timeString = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  if (isToday) {
    return `Today ${timeString}`;
  }
  
  const isYesterday = date.getDate() === now.getDate() - 1 && 
                      date.getMonth() === now.getMonth() && 
                      date.getFullYear() === now.getFullYear();
  
  if (isYesterday) {
    return `Yesterday ${timeString}`;
  }
  
  // If it's within the current year, show just the month and day with time
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  if (isThisYear) {
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dateString} ${timeString}`;
  }
  
  // Otherwise show the full date with time
  const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dateString} ${timeString}`;
}
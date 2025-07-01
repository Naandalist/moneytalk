// export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency: currencyCode,
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   }).format(amount);
// }

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  // Handle special formatting for certain currencies
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  // For currencies like IDR, JPY that typically don't use decimal places
  if (['IDR', 'JPY', 'KRW'].includes(currencyCode)) {
    formatOptions.minimumFractionDigits = 0;
    formatOptions.maximumFractionDigits = 0;
  }

  return new Intl.NumberFormat('en-US', formatOptions).format(amount);
}

/**
 * Formats a date string (stored as UTC in database) to display in device's local timezone
 * Uses consistent timezone handling with proper UTC to local conversion
 * @param string - ISO date string from database (UTC)
 * @returns Formatted date string in device's local timezone
 */
export function formatDate(string: string): string {
  // Create date object from UTC ISO string - JavaScript automatically converts to local timezone
  const date = new Date(string);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string provided to formatDate:', string);
    return 'Invalid date';
  }
  
  // Get current date in local timezone for comparison
  const now = new Date();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Compare dates in local timezone (same day check)
  const isToday = date.toDateString() === now.toDateString();
  
  // Format time in local timezone with explicit timezone
  const timeString = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone
  });
  
  if (isToday) {
    return `Today ${timeString}`;
  }
  
  // Check for yesterday in local timezone
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return `Yesterday ${timeString}`;
  }
  
  // If it's within the current year, show just the month and day with time
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  if (isThisYear) {
    const dateString = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: userTimezone
    });
    return `${dateString} ${timeString}`;
  }
  
  // Otherwise show the full date with time
  const dateString = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    timeZone: userTimezone
  });
  return `${dateString} ${timeString}`;
}
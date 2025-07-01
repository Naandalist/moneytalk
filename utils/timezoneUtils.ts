/**
 * Timezone utility functions for consistent date handling across the app
 * Ensures proper conversion between UTC (database storage) and local timezone (display)
 */

/**
 * Converts a date string from user's timezone to UTC for database storage
 * @param dateString - Date string that may or may not include timezone info
 * @param userTimezone - Optional timezone, defaults to device timezone
 * @returns UTC ISO string for database storage
 */
export function convertToUTC(dateString: string, userTimezone?: string): string {
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // If date already has timezone info (Z, +, or -), use it directly
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-')) {
    return new Date(dateString).toISOString();
  }
  
  // If no timezone info, assume it's in user's timezone
  // Create a date assuming the string represents local time
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string provided:', dateString);
    return new Date().toISOString(); // Fallback to current time
  }
  
  return date.toISOString();
}

/**
 * Converts UTC date to user's timezone for display
 * @param utcDateString - UTC date string from database
 * @param userTimezone - Optional timezone, defaults to device timezone
 * @returns Date object in user's timezone
 */
export function convertFromUTC(utcDateString: string, userTimezone?: string): Date {
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = new Date(utcDateString);
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid UTC date string provided:', utcDateString);
    return new Date(); // Fallback to current time
  }
  
  return date; // JavaScript automatically handles timezone conversion for display
}

/**
 * Gets the current date/time in user's timezone as ISO string
 * @param userTimezone - Optional timezone, defaults to device timezone
 * @returns Current date/time in user's timezone
 */
export function getCurrentDateInTimezone(userTimezone?: string): string {
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  
  // Format the current time in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const formatted = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
  
  return formatted;
}

/**
 * Validates if a date string is in proper ISO format
 * @param dateString - Date string to validate
 * @returns boolean indicating if the date is valid
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes('T');
}

/**
 * Gets the user's timezone offset in hours
 * @returns Timezone offset in hours (e.g., +7 for Asia/Jakarta)
 */
export function getTimezoneOffset(): number {
  const now = new Date();
  return -now.getTimezoneOffset() / 60; // Convert minutes to hours and flip sign
}

/**
 * Gets the user's timezone name
 * @returns Timezone name (e.g., 'Asia/Jakarta')
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
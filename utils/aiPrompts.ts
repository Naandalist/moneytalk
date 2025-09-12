/**
 * Shared AI prompts and constants
 * This file contains reusable prompts for AI services to maintain consistency
 */

export const AI_PROMPTS = {
  RECEIPT_ANALYSIS: 'Analyze this receipt and extract transaction information. Return a JSON object with: amount (number), description (string), category (one of: Groceries, Dining, Housing, Transport, Healthcare, Personal, Education, Income, Salary, Bills, Shopping, Other), type ("expense" or "income"), and items (array of item names and prices if visible). Focus on the total amount and main purchase category.'
} as const;
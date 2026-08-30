/**
 * Input sanitization — prevents stored XSS from user-supplied strings.
 * Strip HTML tags, trim whitespace, enforce max length.
 */

const HTML_TAG = /<[^>]*>/g;
const SCRIPT_TAG = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
const MAX_LENGTH = 5000;

export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(SCRIPT_TAG, '')
    .replace(EVENT_HANDLER, '')
    .replace(HTML_TAG, '')
    .trim()
    .slice(0, MAX_LENGTH);
}

export function sanitizeObject<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
  const result: Record<string, any> = {};
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      result[key] = typeof obj[key] === 'string' ? sanitizeString(obj[key]) : obj[key];
    }
  }
  return result as Partial<T>;
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
}
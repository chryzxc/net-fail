/**
 * Utility functions for UI components
 * @module lib/utils
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RequestHeaders } from '@/types';

/**
 * Merges class names with Tailwind CSS conflict resolution
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Gets the referrer URL from request headers
 * @param headers - Request headers array
 * @returns Referrer URL or null
 */
export function getReferrerFromHeaders(
  headers: RequestHeaders | undefined
): string | null {
  if (!headers || !Array.isArray(headers) || headers.length === 0) {
    return null;
  }

  const refHeader = headers.find(
    (h) =>
      h.name?.toLowerCase() === 'referer' ||
      h.name?.toLowerCase() === 'referrer'
  );

  return refHeader?.value ?? null;
}

/**
 * Formats a relative time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Truncates a URL for display
 * @param url - URL to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated URL or original if within length
 */
export function truncateUrl(url: string, maxLength = 60): string {
  if (!url || url.length <= maxLength) {
    return url;
  }
  return url.slice(0, maxLength - 3) + '...';
}

/**
 * Safely parses JSON
 * @param json - JSON string to parse
 * @returns Parsed object or null on error
 */
export function safeParseJSON<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Creates a debounced version of a function
 * @param fn - Function to debounce
 * @param ms - Debounce delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Generates a unique ID
 * @returns Unique string ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

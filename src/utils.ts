/**
 * Utility functions for Net Fail
 * @module utils
 */

import {
  CLIENT_ERROR_MIN,
  CLIENT_ERROR_MAX,
  SERVER_ERROR_MIN,
  SERVER_ERROR_MAX,
  HTTP_ERROR_MESSAGES,
  NETWORK_ERROR_PATTERNS,
  MAX_URL_DISPLAY_LENGTH,
  SAFE_URL_SCHEMES,
} from './constants';
import type {
  StatusPredicate,
  FailedRequest,
  RequestHeaders,
  HttpMethod
} from './types';

// ============================================================================
// Status Code Predicates
// ============================================================================

/**
 * Creates a predicate function that checks if a status code falls within a range
 * @param min - Minimum status code (inclusive)
 * @param max - Maximum status code (exclusive)
 * @returns Predicate function
 */
export const createRangePredicate = (
  min: number,
  max: number
): StatusPredicate => {
  return (status) =>
    typeof status === 'number' && status >= min && status < max;
};

/**
 * Predicate for network failures (no HTTP status)
 */
export const matchesNetworkFailure: StatusPredicate = (status) =>
  status === null || status === undefined;

/**
 * Predicate for client errors (4xx)
 */
export const matchesClientError: StatusPredicate = createRangePredicate(
  CLIENT_ERROR_MIN,
  CLIENT_ERROR_MAX
);

/**
 * Predicate for server errors (5xx)
 */
export const matchesServerError: StatusPredicate = createRangePredicate(
  SERVER_ERROR_MIN,
  SERVER_ERROR_MAX
);

/**
 * Predicate for non-standard or other status codes
 */
export const matchesOtherStatuses: StatusPredicate = (status) =>
  typeof status === 'number' && (status < 400 || status >= 600);

// ============================================================================
// Chrome Runtime Utilities
// ============================================================================

/**
 * Checks if chrome.runtime API is available
 * @returns True if running in an extension context
 */
export function isChromeRuntimeAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    chrome.runtime !== undefined &&
    typeof chrome.runtime.sendMessage === 'function'
  );
}

/**
 * Checks if chrome.storage API is available
 * @returns True if storage API is accessible
 */
export function isChromeStorageAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    chrome.storage !== undefined &&
    chrome.storage.local !== undefined
  );
}

/**
 * Safely sends a message to the background script
 * @param message - Message to send
 * @returns Promise with the response
 */
export async function sendMessage<T>(
  message: { action: string; payload?: unknown }
): Promise<T | null> {
  if (!isChromeRuntimeAvailable()) {
    console.warn('Chrome runtime not available');
    return null;
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      resolve(null);
    }
  });
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Safely parses a URL string
 * @param urlString - URL to parse
 * @returns Parsed URL or null if invalid
 */
export function safeParseUrl(urlString: string): URL | null {
  try {
    const url = new URL(urlString);
    if (!SAFE_URL_SCHEMES.includes(url.protocol as 'http:' | 'https:')) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Truncates a URL for display
 * @param url - URL to truncate
 * @param maxLength - Maximum length
 * @returns Truncated URL string
 */
export function truncateUrl(
  url: string,
  maxLength: number = MAX_URL_DISPLAY_LENGTH
): string {
  if (!url || url.length <= maxLength) {
    return url;
  }

  const parsed = safeParseUrl(url);
  if (!parsed) {
    return url.slice(0, maxLength - 3) + '...';
  }

  const host = parsed.host;
  const path = parsed.pathname + parsed.search;

  if (host.length + 3 >= maxLength) {
    return host.slice(0, maxLength - 3) + '...';
  }

  const remainingLength = maxLength - host.length - 3;
  return host + path.slice(0, remainingLength) + '...';
}

/**
 * Extracts the domain from a URL
 * @param url - URL to extract domain from
 * @returns Domain string or null
 */
export function extractDomain(url: string): string | null {
  const parsed = safeParseUrl(url);
  return parsed?.hostname ?? null;
}

/**
 * Extracts the path from a URL (without query string)
 * @param url - URL to extract path from
 * @returns Path string or null
 */
export function extractPath(url: string): string | null {
  const parsed = safeParseUrl(url);
  return parsed?.pathname ?? null;
}

// ============================================================================
// Header Utilities
// ============================================================================

/**
 * Gets the referrer from request headers
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
 * Gets the content type from headers
 * @param headers - Response headers array
 * @returns Content type or null
 */
export function getContentTypeFromHeaders(
  headers: Array<{ name?: string; value?: string }> | undefined
): string | null {
  if (!headers || !Array.isArray(headers)) {
    return null;
  }

  const ctHeader = headers.find(
    (h) => h.name?.toLowerCase() === 'content-type'
  );

  return ctHeader?.value ?? null;
}

/**
 * Searches headers for a specific value
 * @param headers - Headers array
 * @param search - Search term
 * @returns True if found
 */
export function searchInHeaders(
  headers: ReadonlyArray<{ name?: string; value?: string }> | undefined,
  search: string
): boolean {
  if (!headers || !search) {
    return false;
  }

  const lowerSearch = search.toLowerCase();
  return headers.some(
    (h) =>
      h.name?.toLowerCase().includes(lowerSearch) ||
      h.value?.toLowerCase().includes(lowerSearch)
  );
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Gets a human-readable error message for a status code
 * @param statusCode - HTTP status code
 * @returns Human-readable message
 */
export function getErrorMessage(statusCode: number | null): string {
  if (statusCode === null) {
    return 'Network Error';
  }

  return HTTP_ERROR_MESSAGES[statusCode] ?? `HTTP ${statusCode}`;
}

/**
 * Gets a human-readable network error description
 * @param error - Chrome network error string
 * @returns Human-readable description
 */
export function getNetworkErrorDescription(error: string): string {
  return NETWORK_ERROR_PATTERNS[error] ?? error;
}

/**
 * Determines the error severity
 * @param statusCode - HTTP status code
 * @returns Severity level
 */
export function getErrorSeverity(
  statusCode: number | null
): 'error' | 'warning' | 'info' {
  if (statusCode === null) {
    return 'error';
  }
  if (statusCode >= 500) {
    return 'error';
  }
  if (statusCode >= 400) {
    return 'warning';
  }
  return 'info';
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Formats a timestamp to a relative time string
 * @param timestamp - Unix timestamp
 * @returns Relative time string (e.g., "2 min ago")
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
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Formats a timestamp to a full datetime string
 * @param timestamp - Unix timestamp
 * @returns Formatted datetime string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formats bytes to a human-readable size
 * @param bytes - Number of bytes
 * @returns Formatted size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// Request Utilities
// ============================================================================

/**
 * Groups requests by URL
 * @param requests - Array of failed requests
 * @returns Map of URL to request array
 */
export function groupRequestsByUrl(
  requests: readonly FailedRequest[]
): Map<string, FailedRequest[]> {
  const groups = new Map<string, FailedRequest[]>();

  for (const request of requests) {
    const existing = groups.get(request.url) ?? [];
    existing.push(request);
    groups.set(request.url, existing);
  }

  return groups;
}

/**
 * Filters requests based on search term
 * @param requests - Array of failed requests
 * @param search - Search term
 * @returns Filtered requests
 */
export function filterRequests(
  requests: readonly FailedRequest[],
  search: string
): FailedRequest[] {
  if (!search.trim()) {
    return [...requests];
  }

  const lowerSearch = search.toLowerCase();

  return requests.filter((request) => {
    // Search in URL
    if (request.url.toLowerCase().includes(lowerSearch)) {
      return true;
    }

    // Search in method
    if (request.method?.toLowerCase().includes(lowerSearch)) {
      return true;
    }

    // Search in error message
    if (request.error?.toLowerCase().includes(lowerSearch)) {
      return true;
    }

    // Search in headers
    if (searchInHeaders(request.requestHeaders, search)) {
      return true;
    }

    return false;
  });
}

/**
 * Sorts requests by field
 * @param requests - Array of failed requests
 * @param field - Field to sort by
 * @param direction - Sort direction
 * @returns Sorted requests
 */
export function sortRequests(
  requests: readonly FailedRequest[],
  field: 'timestamp' | 'url' | 'method' | 'statusCode',
  direction: 'asc' | 'desc' = 'desc'
): FailedRequest[] {
  const sorted = [...requests].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'timestamp':
        comparison = a.timestamp - b.timestamp;
        break;
      case 'url':
        comparison = a.url.localeCompare(b.url);
        break;
      case 'method':
        comparison = (a.method ?? '').localeCompare(b.method ?? '');
        break;
      case 'statusCode':
        comparison = (a.statusCode ?? 0) - (b.statusCode ?? 0);
        break;
    }

    return direction === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Sanitizes a string for safe HTML display
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates if a method is a valid HTTP method
 * @param method - Method to validate
 * @returns True if valid
 */
export function isValidHttpMethod(method: string): method is HttpMethod {
  const validMethods: HttpMethod[] = [
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'
  ];
  return validMethods.includes(method.toUpperCase() as HttpMethod);
}

/**
 * Creates a debounced function
 * @param func - Function to debounce
 * @param wait - Wait time in ms
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a throttled function
 * @param func - Function to throttle
 * @param limit - Time limit in ms
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Converts requests to CSV format
 * @param requests - Array of failed requests
 * @returns CSV string
 */
export function requestsToCSV(requests: readonly FailedRequest[]): string {
  const headers = ['ID', 'URL', 'Method', 'Status Code', 'Error', 'Timestamp', 'Type'];
  const rows = requests.map((r) => [
    r.id,
    `"${r.url.replace(/"/g, '""')}"`,
    r.method ?? '',
    r.statusCode?.toString() ?? '',
    `"${(r.error ?? '').replace(/"/g, '""')}"`,
    new Date(r.timestamp).toISOString(),
    r.type ?? '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Copies text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}


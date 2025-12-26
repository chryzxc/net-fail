/**
 * Background Service Worker for Net Fail
 * Captures and stores failed network requests
 * @module background
 */

import {
  MAX_STORED_REQUESTS,
  PENDING_FLUSH_DELAY,
  STORAGE_KEY_REQUESTS,
  STORAGE_KEY_PENDING_HEADERS,
} from './constants';
import type { RequestHeaders, ResponseHeaders } from './types';

// ============================================================================
// Types
// ============================================================================

interface StoredFailedRequest {
  readonly id: string;
  readonly url: string;
  readonly method: string;
  readonly statusCode: number | null;
  readonly error: string;
  readonly timestamp: number;
  readonly type?: string;
  readonly requestHeaders?: RequestHeaders;
  readonly responseHeaders?: ResponseHeaders;
  readonly initiator?: string;
  readonly tabId?: number;
}

interface HeaderCacheEntry {
  requestHeaders?: RequestHeaders;
  responseHeaders?: ResponseHeaders;
}

type PendingHeadersMap = Record<string, HeaderCacheEntry>;

// ============================================================================
// State Management
// ============================================================================

/** In-memory cache for pending request headers */
const headerCache = new Map<string, HeaderCacheEntry>();

/** In-memory map of pending headers to be flushed to storage */
let pendingMap: PendingHeadersMap = {};

/** Timer for debounced flush */
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Flushes pending headers to storage
 */
async function flushPendingHeaders(): Promise<void> {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEY_PENDING_HEADERS]: pendingMap });
  } catch (error) {
    console.error('Net Fail: Failed to flush pending headers:', error);
  }
}

/**
 * Schedules a debounced flush of pending headers
 */
function scheduleFlush(): void {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
  }
  pendingFlushTimer = setTimeout(flushPendingHeaders, PENDING_FLUSH_DELAY);
}

/**
 * Reads pending headers from storage
 */
async function readPendingHeaders(): Promise<PendingHeadersMap> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY_PENDING_HEADERS);
    return (data[STORAGE_KEY_PENDING_HEADERS] as PendingHeadersMap) ?? {};
  } catch {
    return {};
  }
}

/**
 * Writes pending headers to storage
 */
async function writePendingHeaders(pending: PendingHeadersMap): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_PENDING_HEADERS]: pending });
  } catch (error) {
    console.error('Net Fail: Failed to write pending headers:', error);
  }
}

/**
 * Updates pending headers for a request
 */
function updatePendingHeaders(
  requestId: string,
  patch: HeaderCacheEntry
): HeaderCacheEntry {
  const existing = { ...(pendingMap[requestId] ?? {}), ...patch };
  pendingMap[requestId] = existing;
  headerCache.set(requestId, existing);
  scheduleFlush();
  return existing;
}

/**
 * Consumes and removes pending headers for a request
 */
async function consumePendingHeaders(requestId: string): Promise<HeaderCacheEntry> {
  // Flush any pending changes
  await flushPendingHeaders();

  const pending = await readPendingHeaders();
  const stored = pending[requestId];

  if (stored) {
    delete pending[requestId];
    await writePendingHeaders(pending);
  }

  const cached = headerCache.get(requestId);

  // Clean up
  delete pendingMap[requestId];
  headerCache.delete(requestId);

  return { ...(stored ?? {}), ...(cached ?? {}) };
}

// ============================================================================
// Request Storage
// ============================================================================

/**
 * Stores a failed request in local storage
 */
async function storeFailedRequest(requestData: StoredFailedRequest): Promise<void> {
  try {
    // Validate URL before storing
    if (!requestData.url || typeof requestData.url !== 'string') {
      return;
    }

    // Skip chrome-extension:// and other internal URLs
    if (
      requestData.url.startsWith('chrome-extension://') ||
      requestData.url.startsWith('chrome://') ||
      requestData.url.startsWith('about:') ||
      requestData.url.startsWith('moz-extension://')
    ) {
      return;
    }

    const result = await chrome.storage.local.get(STORAGE_KEY_REQUESTS);
    const failedRequests: StoredFailedRequest[] = result[STORAGE_KEY_REQUESTS] ?? [];

    // Add new request at the beginning
    failedRequests.unshift(requestData);

    // Enforce max limit
    if (failedRequests.length > MAX_STORED_REQUESTS) {
      failedRequests.length = MAX_STORED_REQUESTS;
    }

    await chrome.storage.local.set({ [STORAGE_KEY_REQUESTS]: failedRequests });
    await updateBadgeCount(failedRequests.length);
  } catch (error) {
    console.error('Net Fail: Failed to store request:', error);
  }
}

// ============================================================================
// Badge Management
// ============================================================================

/**
 * Updates the extension badge with the current count
 */
async function updateBadgeCount(count: number): Promise<void> {
  try {
    const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({
      color: count > 0 ? '#e74c3c' : '#888888'
    });
  } catch (error) {
    console.error('Net Fail: Failed to update badge:', error);
  }
}

/**
 * Initializes the badge on startup
 */
async function initializeBadge(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_REQUESTS);
    const failedRequests = result[STORAGE_KEY_REQUESTS] ?? [];
    await updateBadgeCount(failedRequests.length);
  } catch (error) {
    console.error('Net Fail: Failed to initialize badge:', error);
  }
}

// ============================================================================
// Request Header Listeners
// ============================================================================

/**
 * Captures request headers before sending
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    try {
      updatePendingHeaders(details.requestId, {
        requestHeaders: (details.requestHeaders ?? []) as RequestHeaders,
      });
    } catch (error) {
      console.error('Net Fail: Error in onBeforeSendHeaders:', error);
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders']
);

/**
 * Fallback capture for request headers
 */
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    try {
      // Only update if we don't already have headers for this request
      const existing = headerCache.get(details.requestId);
      if (!existing?.requestHeaders?.length) {
        updatePendingHeaders(details.requestId, {
          requestHeaders: (details.requestHeaders ?? []) as RequestHeaders,
        });
      }
    } catch (error) {
      console.error('Net Fail: Error in onSendHeaders:', error);
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders']
);

/**
 * Captures response headers
 */
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    try {
      updatePendingHeaders(details.requestId, {
        responseHeaders: (details.responseHeaders ?? []) as ResponseHeaders,
      });
    } catch (error) {
      console.error('Net Fail: Error in onHeadersReceived:', error);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders']
);

// ============================================================================
// Failed Request Listeners
// ============================================================================

/**
 * Handles completed requests with error status codes
 */
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    try {
      // Only capture 4xx and 5xx status codes
      if (details.statusCode >= 400) {
        const cached = await consumePendingHeaders(details.requestId);

        await storeFailedRequest({
          id: `${details.requestId}-${Date.now()}`,
          url: details.url,
          method: details.method ?? 'GET',
          statusCode: details.statusCode,
          error: `HTTP ${details.statusCode}`,
          timestamp: Date.now(),
          type: details.type,
          requestHeaders: cached.requestHeaders,
          responseHeaders: cached.responseHeaders,
          initiator: details.initiator,
          tabId: details.tabId,
        });
      }
    } catch (error) {
      console.error('Net Fail: Error in onCompleted:', error);
    }
  },
  { urls: ['<all_urls>'] }
);

/**
 * Handles network errors
 */
chrome.webRequest.onErrorOccurred.addListener(
  async (details) => {
    try {
      const cached = await consumePendingHeaders(details.requestId);

      await storeFailedRequest({
        id: `${details.requestId}-${Date.now()}`,
        url: details.url,
        method: details.method ?? 'GET',
        statusCode: null,
        error: details.error ?? 'Unknown error',
        timestamp: Date.now(),
        type: details.type,
        requestHeaders: cached.requestHeaders,
        responseHeaders: cached.responseHeaders,
        initiator: details.initiator,
        tabId: details.tabId,
      });
    } catch (error) {
      console.error('Net Fail: Error in onErrorOccurred:', error);
    }
  },
  { urls: ['<all_urls>'] }
);

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Handles messages from the popup
 */
chrome.runtime.onMessage.addListener(
  (
    request: { action: string; payload?: unknown },
    _sender,
    sendResponse: (response: unknown) => void
  ) => {
    const handleMessage = async () => {
      try {
        switch (request.action) {
          case 'getFailedRequests': {
            const result = await chrome.storage.local.get(STORAGE_KEY_REQUESTS);
            return { failedRequests: result[STORAGE_KEY_REQUESTS] ?? [] };
          }

          case 'clearFailedRequests': {
            await chrome.storage.local.set({ [STORAGE_KEY_REQUESTS]: [] });
            await updateBadgeCount(0);
            return { success: true };
          }

          default:
            return { error: `Unknown action: ${request.action}` };
        }
      } catch (error) {
        console.error('Net Fail: Message handler error:', error);
        return { error: String(error) };
      }
    };

    handleMessage().then(sendResponse);
    return true; // Keep the message channel open for async response
  }
);

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the extension on startup
 */
(async function initialize() {
  try {
    // Restore pending headers from storage
    const stored = await readPendingHeaders();
    pendingMap = stored;

    for (const [key, value] of Object.entries(stored)) {
      headerCache.set(key, value);
    }

    // Initialize badge
    await initializeBadge();

    console.log('Net Fail: Background service worker initialized');
  } catch (error) {
    console.error('Net Fail: Initialization error:', error);
  }
})();

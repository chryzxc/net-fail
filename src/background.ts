// import { getUrl } from "@/lib/storage";

const MAX_STORED_REQUESTS = 500;

export type TRequestHeaders = Array<{ name: string; value: string }>;

type TStoredFailedRequest = {
  id: string;
  url: string;
  method?: string;
  statusCode?: number | null;
  error?: string;
  timestamp: number;
  type?: string;

  requestHeaders?: TRequestHeaders;
  responseHeaders?: any[];
};

type THeaderCacheEntry = {
  requestHeaders?: any[];
  responseHeaders?: any[];
};

const headerCache = new Map<string, THeaderCacheEntry>();
const PENDING_HEADERS_KEY = "pendingRequestHeaders";

// Keep a runtime in-memory copy of pending headers and flush to storage
// on a short debounce. This prevents a storage.get/set on every request
// header event which was causing reload lag.
let pendingMap: Record<string, THeaderCacheEntry> = {};
let pendingFlushTimer: any = null;
const PENDING_FLUSH_DELAY = 1000; // ms

async function flushPendingHeaders(): Promise<void> {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
  try {
    await chrome.storage.local.set({ [PENDING_HEADERS_KEY]: pendingMap });
  } catch (err) {
    console.error("Net Fail: Error flushing pending headers:", err);
  }
}

function scheduleFlush() {
  if (pendingFlushTimer) clearTimeout(pendingFlushTimer);
  pendingFlushTimer = setTimeout(
    () => flushPendingHeaders(),
    PENDING_FLUSH_DELAY
  );
}

// Seed in-memory pending map from storage on startup
(async function initPendingFromStorage() {
  try {
    const stored = await readPendingHeaders();
    pendingMap = stored || {};
    for (const k of Object.keys(pendingMap)) {
      headerCache.set(k, pendingMap[k]);
    }
  } catch (e) {
    // non-fatal
  }
})();

async function readPendingHeaders(): Promise<
  Record<string, THeaderCacheEntry>
> {
  const data = await chrome.storage.local.get(PENDING_HEADERS_KEY);
  return (data[PENDING_HEADERS_KEY] as Record<string, THeaderCacheEntry>) || {};
}

async function writePendingHeaders(pending: Record<string, THeaderCacheEntry>) {
  await chrome.storage.local.set({ [PENDING_HEADERS_KEY]: pending });
}

async function updatePendingHeaders(
  requestId: string,
  patch: THeaderCacheEntry
): Promise<THeaderCacheEntry> {
  // Update in-memory pending map and header cache, and schedule a flush.
  const existing = { ...(pendingMap[requestId] || {}), ...patch };
  pendingMap[requestId] = existing;
  headerCache.set(requestId, existing);
  scheduleFlush();
  return existing;
}

async function consumePendingHeaders(
  requestId: string
): Promise<THeaderCacheEntry> {
  // Ensure any in-memory changes are flushed so storage is up-to-date.
  await flushPendingHeaders();
  const pending = await readPendingHeaders();
  const stored = pending[requestId];
  if (stored) {
    delete pending[requestId];
    // write back trimmed pending map
    await writePendingHeaders(pending);
  }
  const cached = headerCache.get(requestId);
  // remove runtime entries
  delete pendingMap[requestId];
  headerCache.delete(requestId);
  return { ...(stored || {}), ...(cached || {}) };
}

// Capture outgoing request headers when available
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details: any) => {
    try {
      // Debug: log when headers are observed
      console.debug(
        "Net Fail: onBeforeSendHeaders",
        details.requestId,
        Array.isArray(details.requestHeaders)
          ? details.requestHeaders.length
          : details.requestHeaders
      );
    } catch (e) {}

    updatePendingHeaders(details.requestId, {
      requestHeaders: details.requestHeaders || [],
    }).catch((err) =>
      console.error("Net Fail: Error caching request headers:", err)
    );
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

// Some requests reliably include headers on `onSendHeaders` instead of
// `onBeforeSendHeaders` in certain Chrome versions or edge-cases. Capture
// them there as a fallback so we don't lose header data.
chrome.webRequest.onSendHeaders.addListener(
  (details: any) => {
    try {
      console.debug(
        "Net Fail: onSendHeaders",
        details.requestId,
        Array.isArray(details.requestHeaders)
          ? details.requestHeaders.length
          : details.requestHeaders
      );
    } catch (e) {}

    updatePendingHeaders(details.requestId, {
      requestHeaders: details.requestHeaders || [],
    }).catch((err) =>
      console.error("Net Fail: Error caching request headers (send):", err)
    );
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

// Capture response headers when available
chrome.webRequest.onHeadersReceived.addListener(
  (details: any) => {
    updatePendingHeaders(details.requestId, {
      responseHeaders: details.responseHeaders || [],
    }).catch((err) =>
      console.error("Net Fail: Error caching response headers:", err)
    );
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

// Store a failed request
async function storeFailedRequest(requestData: TStoredFailedRequest) {
  try {
    // try {
    //   const persisted = await getUrl();
    //   if (
    //     persisted &&
    //     !requestData.url?.toLowerCase().includes(persisted.toLowerCase())
    //   ) {
    //     return;
    //   }
    // } catch (e) {}

    const result = await chrome.storage.local.get("failedRequests");
    const failedRequests: TStoredFailedRequest[] = result.failedRequests || [];
    failedRequests.unshift(requestData);
    if (failedRequests.length > MAX_STORED_REQUESTS) {
      failedRequests.length = MAX_STORED_REQUESTS;
    }
    await chrome.storage.local.set({ failedRequests });
    updateBadgeCount(failedRequests.length);
  } catch (error) {
    console.error("Net Fail: Error storing failed request:", error);
  }
}

// Update the extension badge
async function updateBadgeCount(count: number) {
  const text = count > 0 ? (count > 99 ? "99+" : String(count)) : "";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
}

// Initialize badge on startup
async function initializeBadge() {
  try {
    const { failedRequests = [] } = await chrome.storage.local.get(
      "failedRequests"
    );
    console.log(
      "Net Fail: Initializing badge with count:",
      failedRequests.length
    );
    updateBadgeCount(failedRequests.length);
  } catch (error) {
    console.error("Net Fail: Error initializing badge:", error);
  }
}

// Listen for completed requests (HTTP 4xx/5xx)
chrome.webRequest.onCompleted.addListener(
  async (details: any) => {
    if (details.statusCode >= 400) {
      const cached = await consumePendingHeaders(details.requestId);
      await storeFailedRequest({
        id: `${details.requestId}-${Date.now()}`,
        url: details.url,
        method: details.method || "GET",
        statusCode: details.statusCode,
        error: `HTTP ${details.statusCode}`,
        timestamp: Date.now(),
        type: details.type,
        requestHeaders: cached.requestHeaders,
        responseHeaders: cached.responseHeaders,
      });
    }
  },
  { urls: ["<all_urls>"] }
  // ["responseHeaders", "requestHeaders", "extraHeaders"]
);

// Listen for network errors
chrome.webRequest.onErrorOccurred.addListener(
  async (details: any) => {
    const cached = await consumePendingHeaders(details.requestId);
    await storeFailedRequest({
      id: `${details.requestId}-${Date.now()}`,
      url: details.url,
      method: details.method || "GET",
      statusCode: null,
      error: details.error,
      timestamp: Date.now(),
      type: details.type,
      requestHeaders: cached.requestHeaders,
      responseHeaders: cached.responseHeaders,
    });
  },
  { urls: ["<all_urls>"] }
);

// Message handler for popup
chrome.runtime.onMessage.addListener((request: any, _sender, sendResponse) => {
  if (request.action === "getFailedRequests") {
    chrome.storage.local
      .get("failedRequests")
      .then(({ failedRequests = [] }) => {
        sendResponse({ failedRequests });
      });
    return true;
  }
  if (request.action === "clearFailedRequests") {
    chrome.storage.local.set({ failedRequests: [] }).then(() => {
      updateBadgeCount(0);
      sendResponse({ success: true });
    });
    return true;
  }
});

initializeBadge();

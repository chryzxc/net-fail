// Net Fail - Background Service Worker (TypeScript)
// Captures failed network requests (HTTP 4xx/5xx and browser-level errors)

const MAX_STORED_REQUESTS = 500;

type TStoredFailedRequest = {
  id: string;
  url: string;
  method?: string;
  statusCode?: number | null;
  error?: string;
  timestamp: number;
  type?: string;
  // requestHeaders captured from onBeforeSendHeaders
  requestHeaders?: any[];
  // responseHeaders captured from onHeadersReceived
  responseHeaders?: any[];
};

type HeaderCacheEntry = {
  requestHeaders?: any[];
  responseHeaders?: any[];
};

const headerCache = new Map<string, HeaderCacheEntry>();
const PENDING_HEADERS_KEY = "pendingRequestHeaders";

async function readPendingHeaders(): Promise<Record<string, HeaderCacheEntry>> {
  const data = await chrome.storage.local.get(PENDING_HEADERS_KEY);
  return (data[PENDING_HEADERS_KEY] as Record<string, HeaderCacheEntry>) || {};
}

async function writePendingHeaders(pending: Record<string, HeaderCacheEntry>) {
  await chrome.storage.local.set({ [PENDING_HEADERS_KEY]: pending });
}

async function updatePendingHeaders(
  requestId: string,
  patch: HeaderCacheEntry
): Promise<HeaderCacheEntry> {
  const pending = await readPendingHeaders();
  const existing = { ...(pending[requestId] || {}), ...patch };
  pending[requestId] = existing;
  headerCache.set(requestId, existing);
  await writePendingHeaders(pending);
  return existing;
}

async function consumePendingHeaders(
  requestId: string
): Promise<HeaderCacheEntry> {
  const pending = await readPendingHeaders();
  const stored = pending[requestId];
  if (stored) {
    delete pending[requestId];
    await writePendingHeaders(pending);
  }
  const cached = headerCache.get(requestId);
  headerCache.delete(requestId);
  return { ...(stored || {}), ...(cached || {}) };
}

// Capture outgoing request headers when available
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details: any) => {
    updatePendingHeaders(details.requestId, {
      requestHeaders: details.requestHeaders || [],
    }).catch((err) =>
      console.error("Net Fail: Error caching request headers:", err)
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

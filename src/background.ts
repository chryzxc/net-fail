// Net Fail - Background Service Worker (TypeScript)
// Captures failed network requests (HTTP 4xx/5xx and browser-level errors)

const MAX_STORED_REQUESTS = 500;

type StoredFailedRequest = {
  id: string;
  url: string;
  method?: string;
  statusCode?: number | null;
  error?: string;
  timestamp: number;
  type?: string;
};

// Store a failed request
async function storeFailedRequest(requestData: StoredFailedRequest) {
  try {
    const result = await chrome.storage.local.get("failedRequests");
    const failedRequests: StoredFailedRequest[] = result.failedRequests || [];
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
      await storeFailedRequest({
        id: `${details.requestId}-${Date.now()}`,
        url: details.url,
        method: details.method || "GET",
        statusCode: details.statusCode,
        error: `HTTP ${details.statusCode}`,
        timestamp: Date.now(),
        type: details.type,
      });
    }
  },
  { urls: ["<all_urls>"] }
);

// Listen for network errors
chrome.webRequest.onErrorOccurred.addListener(
  async (details: any) => {
    await storeFailedRequest({
      id: `${details.requestId}-${Date.now()}`,
      url: details.url,
      method: details.method || "GET",
      statusCode: null,
      error: details.error,
      timestamp: Date.now(),
      type: details.type,
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

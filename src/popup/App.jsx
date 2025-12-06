import React, { useEffect, useState } from "react";

function isChromeRuntimeAvailable() {
  return (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.sendMessage
  );
}

export default function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch failed requests from the background service worker
  const fetchFailedRequests = () => {
    if (!isChromeRuntimeAvailable()) {
      console.warn(
        "chrome.runtime not available (are you running inside the extension?)"
      );
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    chrome.runtime.sendMessage({ action: "getFailedRequests" }, (response) => {
      const filteredRequests = (response?.failedRequests || []).filter(
        (req) => req && req.url && req.url.includes("iboardliving.com")
      );
      console.log("Fetched failed requests:", filteredRequests);
      setRequests(filteredRequests);
      setLoading(false);
    });
  };

  // Clear all failed requests
  const clearAll = async () => {
    if (!isChromeRuntimeAvailable()) return;
    if (!confirm("Clear all captured failed requests?")) return;
    chrome.runtime.sendMessage({ action: "clearFailedRequests" }, (res) => {
      if (res?.success) setRequests([]);
    });
  };

  useEffect(() => {
    fetchFailedRequests();

    // Listen for storage changes so UI updates live when background stores new items
    function onStorageChanged(changes, area) {
      if (area === "local" && changes.failedRequests) {
        setRequests(changes.failedRequests.newValue || []);
      }
    }

    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.onChanged
    ) {
      chrome.storage.onChanged.addListener(onStorageChanged);
    }

    return () => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.onChanged
      ) {
        chrome.storage.onChanged.removeListener(onStorageChanged);
      }
    };
  }, []);

  return (
    <div className="w-[420px] min-h-[320px] bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-purple-600">🔍 Net Fail</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFailedRequests}
            className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-100"
          >
            Refresh
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="mt-2 text-gray-600 text-sm">
        Shows failed HTTP/network requests captured by the background worker.
      </p>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="text-sm text-gray-500">
            No failed requests captured
          </div>
        ) : (
          <ul className="space-y-2 max-h-[420px] overflow-auto">
            {requests.map((r) => (
              <li key={r.id} className="p-2 bg-white border rounded">
                <div className="flex items-start gap-2">
                  <div className="text-xs font-mono text-gray-700 break-all">
                    {r.url}
                  </div>
                  <div className="ml-auto text-right text-xs text-gray-500">
                    <div>
                      {r.method} {r.statusCode ? `· ${r.statusCode}` : ""}
                    </div>
                    <div className="text-[11px]">
                      {new Date(r.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                {r.error && (
                  <div className="mt-1 text-xs text-red-600">{r.error}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

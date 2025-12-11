import { TRequestHeaders } from "@/background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistedUrl } from "@/lib/usePersistedUrl";
import { cn, getReferrerFromHeaders } from "@/lib/utils";
import { STATUS_GROUPS } from "@/constants";
import { useCallback, useEffect, useMemo, useState } from "react";

interface IFailedRequest {
  id: string;
  url: string;
  method?: string;
  statusCode?: number | null;
  error?: string;
  timestamp: number;
  type?: string;
  requestHeaders?: TRequestHeaders;
  responseHeaders?: Array<{ name?: string; value?: string }>;
  response?: any;
}

type TStatusGroupMetric = {
  id: string;
  label: string;
  description: string;
  color: string;
  count: number;
};

function isChromeRuntimeAvailable() {
  return (
    typeof chrome !== "undefined" &&
    (chrome as any).runtime &&
    (chrome as any).runtime.sendMessage
  );
}

export default function App(): JSX.Element {
  const { url, setUrl, clear } = usePersistedUrl("");
  const [requests, setRequests] = useState<IFailedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<IFailedRequest | null>(
    null
  );

  const insights = useMemo(() => {
    const bucketMs = 15 * 60 * 1000;
    const bucketMap = new Map<number, Map<string, number>>();
    const urlTotals = new Map<string, number>();

    requests.forEach((req) => {
      if (!req.url) return;
      const bucket = Math.floor(req.timestamp / bucketMs) * bucketMs;
      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, new Map());
      }
      const bucketCounts = bucketMap.get(bucket)!;
      bucketCounts.set(req.url, (bucketCounts.get(req.url) || 0) + 1);
      urlTotals.set(req.url, (urlTotals.get(req.url) || 0) + 1);
    });

    const topUrls = Array.from(urlTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const sortedBuckets = Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-8);
    const timeSeries = sortedBuckets.map(([bucket, counts]) => ({
      bucket,
      total: topUrls.reduce(
        (sum, [urlKey]) => sum + (counts.get(urlKey) || 0),
        0
      ),
      breakdown: topUrls.map(([urlKey]) => counts.get(urlKey) || 0),
    }));

    const maxBucketTotal = Math.max(
      4,
      ...timeSeries.map((point) => point.total)
    );

    return {
      topUrls,
      timeSeries,
      totalRequests: requests.length,
      maxBucketTotal,
    };
  }, [requests]);

  const statusInsights = useMemo(() => {
    const summary: TStatusGroupMetric[] = STATUS_GROUPS.map(
      ({ id, label, description, color }) => ({
        id,
        label,
        description,
        color,
        count: 0,
      })
    );

    requests.forEach((request) => {
      STATUS_GROUPS.forEach((group, index) => {
        if (group.predicate(request.statusCode)) {
          summary[index].count += 1;
        }
      });
    });

    const maxCount = Math.max(1, ...summary.map((group) => group.count));

    return {
      groups: summary,
      maxCount,
      total: requests.length,
    };
  }, [requests]);

  const similarityGroups = useMemo(() => {
    const map = new Map<
      string,
      { url: string; referrer: string; count: number; timestamp: number }
    >();
    requests.forEach((req) => {
      const referrer =
        getReferrerFromHeaders(req.requestHeaders) || "<no referrer>";
      const key = `${req.url}|${referrer}`;
      console.log("Processing request for similarity:", {
        key: req.url,
        req,
        referrer,
      });
      const existing = map.get(key) ?? {
        url: req.url,
        referrer,
        count: 0,
        timestamp: req.timestamp,
      };
      existing.count += 1;
      existing.timestamp = Math.max(existing.timestamp, req.timestamp);
      map.set(key, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [requests]);

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
    (chrome as any).runtime.sendMessage(
      { action: "getFailedRequests" },
      (response: { failedRequests?: IFailedRequest[] }) => {
        const filteredRequests = (response?.failedRequests || [])
          .filter((req: IFailedRequest) => req && req.url)
          .filter((req: IFailedRequest) => {
            console.log("Filtering request:", {
              ref: getReferrerFromHeaders(req.requestHeaders)?.toLowerCase(),
              url,
            });
            return url
              ? req.url.toLowerCase().includes(url.toLowerCase()) ||
                  getReferrerFromHeaders(req.requestHeaders)
                    ?.toLowerCase()
                    .includes(url.toLowerCase())
              : false;
          });
        console.log("Fetched failed requests:", filteredRequests);
        setRequests(filteredRequests);
        setLoading(false);
      }
    );
  };

  // Clear all failed requests
  const clearAll = async () => {
    if (!isChromeRuntimeAvailable()) return;
    if (!confirm("Clear all captured failed requests?")) return;
    (chrome as any).runtime.sendMessage(
      { action: "clearFailedRequests" },
      (res: { success?: boolean }) => {
        if (res?.success) setRequests([]);
      }
    );
  };

  const getSimilarRequests = useCallback(
    (request: IFailedRequest) => {
      console.log("r.url", { request, requests });
      return requests.filter(
        (r) => r.url === request.url && r.id !== request.id
        // &&
        // r.url.includes(getReferrerFromHeaders(r.requestHeaders) || "")
      );
    },
    [requests]
  );

  const downloadCaptures = useCallback(() => {
    if (requests.length === 0) {
      console.warn("Net Fail: no captures to download");
      return;
    }

    if (typeof document === "undefined") return;

    const payload = JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        requests,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "net-fail-captures.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [requests]);

  const renderHeaderList = (
    headers?: Array<{ name?: string; value?: string }> | TRequestHeaders
  ) => {
    if (!headers || headers.length === 0) {
      return (
        <p className="text-[11px] text-gray-400">Headers not captured yet.</p>
      );
    }

    return (
      <ul className="space-y-1 text-[11px] text-gray-600">
        {headers.map((header, index) => (
          <li
            key={`${header?.name ?? "header"}-${index}`}
            className="flex justify-between gap-4"
          >
            <span className="font-medium text-gray-700">
              {header?.name || "Unnamed"}
            </span>
            <span className="text-right text-gray-500">
              {header?.value || "—"}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  useEffect(() => {
    fetchFailedRequests();

    // Listen for storage changes so UI updates live when background stores new items
    function onStorageChanged(changes: any, area: string) {
      if (area === "local" && changes.failedRequests) {
        setRequests(changes.failedRequests.newValue || []);
      }
    }

    if (
      typeof chrome !== "undefined" &&
      (chrome as any).storage &&
      (chrome as any).storage.onChanged
    ) {
      (chrome as any).storage.onChanged.addListener(onStorageChanged);
    }

    return () => {
      if (
        typeof chrome !== "undefined" &&
        (chrome as any).storage &&
        (chrome as any).storage.onChanged
      ) {
        (chrome as any).storage.onChanged.removeListener(onStorageChanged);
      }
    };
  }, []);

  useEffect(() => {
    fetchFailedRequests();
  }, [url]);

  return (
    <div className="w-[500px] min-h-[400px] bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-purple-600">Net Fail</h1>
        <div className="flex items-center gap-2">
          {/* <Button onClick={fetchFailedRequests} variant="outline">
            Refresh
          </Button> */}
          <Button onClick={downloadCaptures} variant="outline">
            Export JSON
          </Button>
          <Button onClick={clearAll} variant="destructive">
            Clear
          </Button>
        </div>
      </div>

      <p className="mt-2 text-gray-600 text-sm">
        Shows failed HTTP/network requests captured by the background worker.
      </p>

      <div className="relative mt-4">
        <Input
          value={url}
          onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
          placeholder="Target URL"
          aria-label="Target URL"
          className="w-full pr-10"
        />
        {url && (
          <button
            onClick={() => clear()}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
            aria-label="Clear URL"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <Tabs defaultValue="requests" className="mt-2 w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-lg border bg-white p-1">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="text-sm text-gray-500">
                No failed requests captured
              </div>
            ) : (
              <div>
                <div className="mt-3"></div>
                <ul className="space-y-2 max-h-[320px] overflow-auto pr-2 mt-4">
                  {requests.map((r) => (
                    <li
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "p-2 bg-white border rounded-lg shadow-sm transition",
                        selectedRequest?.id === r.id &&
                          "ring-2 ring-purple-400/70 border-purple-500/70"
                      )}
                      onClick={() => setSelectedRequest(r)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setSelectedRequest(r);
                          event.preventDefault();
                        }
                      }}
                    >
                      <div className="flex flex-row justify-between text-xs text-gray-500 mb-2">
                        <div>{r.method}</div>
                        <div className="text-[11px]">
                          {new Date(r.timestamp).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-xs font-mono text-gray-700 break-all">
                        {r.url}
                      </div>
                      {r.error && (
                        <p className="text-xs mt-2 text-red-600">{r.error}</p>
                      )}
                      <p className="text-orange-500">
                        Similar requests: {getSimilarRequests(r).length}
                      </p>
                    </li>
                  ))}
                </ul>
                {selectedRequest && (
                  <div className="mt-4 rounded-2xl border bg-white/90 p-4 shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Request detail</p>
                        <p className="text-xs text-gray-500 truncate max-w-[320px]">
                          {selectedRequest.url}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRequest(null)}
                      >
                        Close
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">
                          Request headers
                        </p>
                        <div className="mt-2 rounded-lg bg-gray-50 p-3">
                          {renderHeaderList(selectedRequest.requestHeaders)}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">
                          Response headers
                        </p>
                        <div className="mt-2 rounded-lg bg-gray-50 p-3">
                          {renderHeaderList(selectedRequest.responseHeaders)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1 text-[11px] text-gray-600">
                      <p>
                        <span className="font-semibold text-gray-800">
                          Status:
                        </span>{" "}
                        {selectedRequest.statusCode ?? "network/error"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">
                          Method:
                        </span>{" "}
                        {selectedRequest.method || "UNKNOWN"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">
                          Captured:
                        </span>{" "}
                        {new Date(selectedRequest.timestamp).toLocaleString()}
                      </p>
                      {selectedRequest.error && (
                        <p className="text-xs text-red-600">
                          {selectedRequest.error}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="insights">
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border bg-white/80 p-4 shadow-lg backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Top failed URLs</p>
                  <p className="text-xs text-gray-500">
                    {insights.totalRequests} captures · grouped by URL
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {insights.topUrls.map(([label, count]) => {
                  const maxCount = insights.topUrls[0]?.[1] || 1;
                  return (
                    <div>
                      <div
                        key={label}
                        className="flex justify-between mb-1 gap-12"
                      >
                        <span className="text-xs font-medium text-gray-600 truncate">
                          {label}
                        </span>

                        <span className="text-xs font-semibold text-gray-700">
                          {count}
                        </span>
                      </div>
                      <div className="relative flex-1 h-2 rounded-full bg-gray-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-purple-500"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-white/90 p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Status code groups</p>
                  <p className="text-xs text-gray-500">
                    {statusInsights.total} captures · grouped by status family
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  Max {statusInsights.maxCount}
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {statusInsights.groups.map((group) => {
                  const width = (group.count / statusInsights.maxCount) * 100;
                  const percent = statusInsights.total
                    ? Math.round((group.count / statusInsights.total) * 100)
                    : 0;
                  return (
                    <div key={group.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="font-medium text-gray-700">
                            {group.label}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-700">
                          {group.count}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${width}%`,
                            backgroundColor: group.color,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] uppercase text-gray-400">
                        <span>{group.description}</span>
                        <span>{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-white/90 p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Time distribution (last 8 buckets)
                </p>
                <span className="text-xs text-gray-400">
                  {insights.timeSeries.length} buckets
                </span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {insights.timeSeries.map((point) => (
                  <div
                    key={point.bucket}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="relative h-24 w-full overflow-hidden rounded-xl bg-gray-100">
                      <div
                        className="absolute inset-x-2 bottom-0 rounded-xl bg-indigo-500"
                        style={{
                          height: `${
                            (point.total / insights.maxBucketTotal) * 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] uppercase text-gray-500">
                      {new Date(point.bucket).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      {point.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white/90 p-4 shadow-lg">
              <p className="text-sm font-semibold">Similarity clusters</p>
              <p className="text-xs text-gray-500">Grouped by URL + referrer</p>
              <div className="mt-3 space-y-3">
                {similarityGroups.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No similar captures yet.
                  </p>
                ) : (
                  similarityGroups.map((group) => (
                    <div
                      key={`${group.url}-${group.referrer}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 text-[11px]">
                        <p className="truncate font-medium text-gray-700">
                          {group.url}
                        </p>
                        <p className="truncate text-gray-400">
                          Referrer: {group.referrer}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">
                        {group.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

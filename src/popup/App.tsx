import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistedUrl } from "@/lib/usePersistedUrl";
import { getReferrerFromHeaders } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RequestList } from "./components/RequestList";
import { RequestDetails } from "./components/RequestDetails";
import { FilterBar } from "./components/FilterBar";
import { InsightsPanel } from "./components/InsightsPanel";
import { FailedRequest, StatusGroupDefinition } from "@/types";
import {
  createRangePredicate,
  isChromeRuntimeAvailable,
  matchesNetworkFailure,
  matchesOtherStatuses,
} from "@/utils";

type TStatusGroupMetric = {
  id: string;
  label: string;
  description: string;
  color: string;
  count: number;
};

export const STATUS_GROUPS: readonly StatusGroupDefinition[] = [
  {
    id: "client-errors",
    label: "Client errors (4xx)",
    description: "Requests blocked by the client or the destination",
    color: "hsl(var(--chart-1))",
    predicate: createRangePredicate(400, 500),
  },
  {
    id: "server-errors",
    label: "Server errors (5xx)",
    description: "The server itself returned an error",
    color: "hsl(var(--chart-2))",
    predicate: createRangePredicate(500, 600),
  },
  {
    id: "network-errors",
    label: "Network failures",
    description: "No HTTP status (network / CORS / blocked)",
    color: "hsl(var(--chart-3))",
    predicate: matchesNetworkFailure,
  },
  {
    id: "other-errors",
    label: "Other statuses",
    description: "Non-standard codes or redirects",
    color: "hsl(var(--chart-4))",
    predicate: matchesOtherStatuses,
  },
];

export default function App(): JSX.Element {
  const { url, setUrl, clear } = usePersistedUrl("");
  const [requests, setRequests] = useState<FailedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FailedRequest | null>(
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
      (response: { failedRequests?: FailedRequest[] }) => {
        const filteredRequests = (response?.failedRequests || [])
          .filter((req: FailedRequest) => req && req.url)
          .filter((req: FailedRequest) => {
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
    (request: FailedRequest) => {
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
      <FilterBar url={url} setUrl={setUrl} clear={clear} />
      <Tabs defaultValue="requests" className="mt-2 w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-lg border bg-white p-1">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : (
              <div>
                <RequestList
                  requests={requests}
                  selectedRequest={selectedRequest}
                  onSelect={setSelectedRequest}
                  getSimilarRequests={getSimilarRequests}
                />
                {selectedRequest && (
                  <RequestDetails
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                  />
                )}
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="insights">
          <InsightsPanel
            insights={insights}
            statusInsights={statusInsights}
            similarityGroups={similarityGroups}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

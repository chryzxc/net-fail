import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import {
  SIMILARITY_GROUPS_COUNT,
  TIME_BUCKET_SIZE,
  TIME_SERIES_BUCKETS,
  TOP_URLS_COUNT,
} from "@/constants";
import { usePersistedUrl } from "@/lib/usePersistedUrl";
import { useTheme } from "@/lib/useTheme";
import { cn, getReferrerFromHeaders } from "@/lib/utils";
import type {
  ExportFormat,
  FailedRequest,
  InsightsData,
  SimilarityGroup,
  StatusGroupDefinition,
  StatusGroupMetric,
  StatusInsightsData,
} from "@/types";
import {
  createRangePredicate,
  isChromeRuntimeAvailable,
  matchesNetworkFailure,
  matchesOtherStatuses,
  requestsToCSV,
} from "@/utils";
import {
  Download,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterBar } from "./components/FilterBar";
import { InsightsPanel } from "./components/InsightsPanel";
import { RequestDetails } from "./components/RequestDetails";
import { RequestList } from "./components/RequestList";

const STATUS_GROUPS: readonly StatusGroupDefinition[] = [
  {
    id: "client-errors",
    label: "Client errors (4xx)",
    description: "Requests blocked by the client or the destination",
    color: "hsl(38, 92%, 50%)",
    predicate: createRangePredicate(400, 500),
  },
  {
    id: "server-errors",
    label: "Server errors (5xx)",
    description: "The server itself returned an error",
    color: "hsl(0, 84%, 60%)",
    predicate: createRangePredicate(500, 600),
  },
  {
    id: "network-errors",
    label: "Network failures",
    description: "No HTTP status (network / CORS / blocked)",
    color: "hsl(346, 77%, 50%)",
    predicate: matchesNetworkFailure,
  },
  {
    id: "other-errors",
    label: "Other statuses",
    description: "Non-standard codes or redirects",
    color: "hsl(215, 16%, 47%)",
    predicate: matchesOtherStatuses,
  },
] as const;

export default function App(): JSX.Element {
  // Persisted URL filter
  const { url, setUrl, clear } = usePersistedUrl("");

  // Theme management
  const { resolvedTheme, toggleTheme, isDark } = useTheme();

  // State
  const [requests, setRequests] = useState<FailedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FailedRequest | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const insights = useMemo<InsightsData>(() => {
    const bucketMs = TIME_BUCKET_SIZE;
    const bucketMap = new Map<number, Map<string, number>>();
    const urlTotals = new Map<string, number>();

    requests.forEach((req) => {
      if (!req.url) return;
      const bucket = Math.floor(req.timestamp / bucketMs) * bucketMs;
      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, new Map());
      }
      const bucketCounts = bucketMap.get(bucket)!;
      bucketCounts.set(req.url, (bucketCounts.get(req.url) ?? 0) + 1);
      urlTotals.set(req.url, (urlTotals.get(req.url) ?? 0) + 1);
    });

    const topUrls = Array.from(urlTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_URLS_COUNT);

    const sortedBuckets = Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-TIME_SERIES_BUCKETS);

    const timeSeries = sortedBuckets.map(([bucket, counts]) => ({
      bucket,
      total: topUrls.reduce(
        (sum, [urlKey]) => sum + (counts.get(urlKey) ?? 0),
        0
      ),
      breakdown: topUrls.map(([urlKey]) => counts.get(urlKey) ?? 0),
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

  const statusInsights = useMemo<StatusInsightsData>(() => {
    const summary: StatusGroupMetric[] = STATUS_GROUPS.map(
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
          summary[index] = {
            ...summary[index],
            count: summary[index].count + 1,
          };
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

  const similarityGroups = useMemo<SimilarityGroup[]>(() => {
    const map = new Map<string, SimilarityGroup>();

    requests.forEach((req) => {
      const referrer =
        getReferrerFromHeaders(req.requestHeaders) ?? "<no referrer>";
      const key = `${req.url}|${referrer}`;
      const existing = map.get(key);

      if (existing) {
        map.set(key, {
          ...existing,
          count: existing.count + 1,
          timestamp: Math.max(existing.timestamp, req.timestamp),
        });
      } else {
        map.set(key, {
          url: req.url,
          referrer,
          count: 1,
          timestamp: req.timestamp,
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.timestamp - a.timestamp)
      .slice(0, SIMILARITY_GROUPS_COUNT);
  }, [requests]);

  const fetchFailedRequests = useCallback(() => {
    if (!isChromeRuntimeAvailable()) {
      console.warn("Chrome runtime not available");
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    chrome.runtime.sendMessage(
      { action: "getFailedRequests" },
      (response: { failedRequests?: FailedRequest[] }) => {
        const allRequests = response?.failedRequests ?? [];

        // Filter by URL if specified
        const filteredRequests = allRequests
          .filter((req): req is FailedRequest => Boolean(req?.url))
          .filter((req) => {
            if (!url) return true;
            const lowerUrl = url.toLowerCase();
            const matchesUrl = req.url.toLowerCase().includes(lowerUrl);
            const matchesReferrer = getReferrerFromHeaders(req.requestHeaders)
              ?.toLowerCase()
              .includes(lowerUrl);
            return matchesUrl || matchesReferrer;
          });

        setRequests(filteredRequests);
        setLoading(false);
      }
    );
  }, [url]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFailedRequests();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [fetchFailedRequests]);

  const clearAll = useCallback(async () => {
    if (!isChromeRuntimeAvailable()) return;
    if (!confirm("Clear all captured failed requests? This cannot be undone."))
      return;

    chrome.runtime.sendMessage(
      { action: "clearFailedRequests" },
      (res: { success?: boolean }) => {
        if (res?.success) {
          setRequests([]);
          setSelectedRequest(null);
        }
      }
    );
  }, []);

  const getSimilarRequests = useCallback(
    (request: FailedRequest): FailedRequest[] => {
      return requests.filter(
        (r) => r.url === request.url && r.id !== request.id
      );
    },
    [requests]
  );

  const downloadCaptures = useCallback(
    (format: ExportFormat = "json") => {
      if (requests.length === 0) {
        console.warn("No captures to download");
        return;
      }

      let payload: string;
      let mimeType: string;
      let extension: string;

      if (format === "csv") {
        payload = requestsToCSV(requests);
        mimeType = "text/csv";
        extension = "csv";
      } else {
        payload = JSON.stringify(
          {
            version: "1.0.0",
            generatedAt: new Date().toISOString(),
            exportFormat: "json",
            totalRequests: requests.length,
            requests,
          },
          null,
          2
        );
        mimeType = "application/json";
        extension = "json";
      }

      const blob = new Blob([payload], { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `net-fail-export-${Date.now()}.${extension}`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
    },
    [requests]
  );

  useEffect(() => {
    fetchFailedRequests();

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === "local" && changes.failedRequests) {
        const newRequests = changes.failedRequests.newValue ?? [];
        setRequests(
          newRequests.filter((req: FailedRequest) => Boolean(req?.url))
        );
      }
    };

    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    return () => {
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, [fetchFailedRequests]);

  useEffect(() => {
    fetchFailedRequests();
  }, [url, fetchFailedRequests]);

  return (
    <div className="w-screen min-w-[600px] h-full bg-background p-4 flex flex-col overflow-hidden">
      <div className="flex flex-row gap-8 w-full h-full py-6 overflow-hidden">
        <div className="w-full">
          {/* Header */}
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                  {requests.length > 0 ? (
                    <WifiOff className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Wifi className="h-5 w-5 text-primary-foreground" />
                  )}
                </div>
                {requests.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center"
                  >
                    {requests.length > 99 ? "99+" : requests.length}
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Net Fail</h1>
                <p className="text-sm text-muted-foreground">
                  Failed request monitor
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Tooltip content={isRefreshing ? "Refreshing..." : "Refresh"}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={loading || isRefreshing}
                  className="h-8 w-8"
                  aria-label="Refresh requests"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                  />
                </Button>
              </Tooltip>

              <Tooltip content={isDark ? "Light mode" : "Dark mode"}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-8 w-8"
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </Tooltip>

              <div className="w-px h-5 bg-border mx-1" />

              <Tooltip content="Export as JSON">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadCaptures("json")}
                  disabled={requests.length === 0}
                  className="h-8 w-8"
                  aria-label="Export captures"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Clear all">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearAll}
                  disabled={requests.length === 0}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Clear all requests"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </header>

          {/* Filter bar */}
          <FilterBar
            url={url}
            setUrl={setUrl}
            clear={clear}
            isLoading={loading}
          />

          {/* Main content */}
          <Tabs defaultValue="requests" className="mt-4 flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="requests" className="gap-1.5">
                Requests
                {requests.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-2 py-0.5"
                  >
                    {requests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="flex-1 mt-0">
              <RequestList
                requests={requests}
                selectedRequest={selectedRequest}
                onSelect={setSelectedRequest}
                getSimilarRequests={getSimilarRequests}
                isLoading={loading}
              />
            </TabsContent>

            <TabsContent value="insights" className="flex-1 mt-0">
              <InsightsPanel
                insights={insights}
                statusInsights={statusInsights}
                similarityGroups={similarityGroups}
                isLoading={loading}
              />
            </TabsContent>
          </Tabs>
        </div>
        {selectedRequest && (
          <div className="flex h-full w-full justify-center ">
            <RequestDetails
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
            />
          </div>
        )}
      </div>
      {/* Footer */}
      <div className="mt-4 pt-3 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Capturing failed requests (4xx, 5xx, network errors)
        </p>
        <p className="text-[11px] text-muted-foreground mt-2">
          Created by Christian Rey Villablanca
        </p>
      </div>
    </div>
  );
}

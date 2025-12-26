import { memo } from "react";
import {
  TrendingUp,
  Clock,
  Layers,
  BarChart3,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InsightCardSkeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { cn, truncateUrl } from "@/lib/utils";
import type {
  InsightsData,
  StatusInsightsData,
  SimilarityGroup,
} from "@/types";

interface InsightsPanelProps {
  insights: InsightsData;
  statusInsights: StatusInsightsData;
  similarityGroups: readonly SimilarityGroup[];
  isLoading?: boolean;
}

/**
 * Progress bar component for visualizations
 */
const ProgressBar = memo(function ProgressBar({
  value,
  max,
  color,
  className,
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
    >
      <div
        className="h-full rounded-full progress-fill"
        style={{
          width: `${percentage}%`,
          backgroundColor: color ?? "hsl(var(--primary))",
        }}
      />
    </div>
  );
});

/**
 * Top URLs insight card
 */
const TopUrlsCard = memo(function TopUrlsCard({
  topUrls,
  totalRequests,
}: {
  topUrls: InsightsData["topUrls"];
  totalRequests: number;
}) {
  const maxCount = topUrls[0]?.[1] ?? 1;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Top Failed URLs</CardTitle>
            <CardDescription>{totalRequests} total captures</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {topUrls.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No data yet</p>
        ) : (
          <div className="space-y-3">
            {topUrls.map(([url, count], idx) => (
              <div key={url} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Tooltip content={url}>
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px] flex items-center gap-1">
                      <span className="text-muted-foreground text-[10px] w-4">
                        #{idx + 1}
                      </span>
                      {truncateUrl(url, 40)}
                    </span>
                  </Tooltip>
                  <Badge variant="secondary" className="text-[10px]">
                    {count}
                  </Badge>
                </div>
                <ProgressBar value={count} max={maxCount} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Status groups insight card
 */
const StatusGroupsCard = memo(function StatusGroupsCard({
  statusInsights,
}: {
  statusInsights: StatusInsightsData;
}) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-sm">Error Distribution</CardTitle>
            <CardDescription>Grouped by status code family</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statusInsights.groups.map((group) => {
            const percent =
              statusInsights.total > 0
                ? Math.round((group.count / statusInsights.total) * 100)
                : 0;

            return (
              <div key={group.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-xs font-medium text-foreground">
                      {group.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{group.count}</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {percent}%
                    </span>
                  </div>
                </div>
                <ProgressBar
                  value={group.count}
                  max={statusInsights.maxCount}
                  color={group.color}
                  className="h-1.5"
                />
                <p className="text-[10px] text-muted-foreground pl-4">
                  {group.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Time distribution card
 */
const TimeDistributionCard = memo(function TimeDistributionCard({
  timeSeries,
  maxBucketTotal,
}: {
  timeSeries: InsightsData["timeSeries"];
  maxBucketTotal: number;
}) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-sm">Timeline</CardTitle>
              <CardDescription>
                Last {timeSeries.length} intervals
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {timeSeries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No data yet</p>
        ) : (
          <div className="flex items-end justify-between gap-1.5 h-24">
            {timeSeries.map((point) => {
              const height =
                maxBucketTotal > 0 ? (point.total / maxBucketTotal) * 100 : 0;

              return (
                <Tooltip
                  key={point.bucket}
                  content={
                    <div className="text-center">
                      <p className="font-medium">{point.total} errors</p>
                      <p className="text-[10px] opacity-75">
                        {new Date(point.bucket).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  }
                >
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-20 flex items-end">
                      <div
                        className="w-full chart-bar bg-indigo-500 dark:bg-indigo-400 min-h-[4px]"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(point.bucket).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Similarity clusters card
 */
const SimilarityClustersCard = memo(function SimilarityClustersCard({
  similarityGroups,
}: {
  similarityGroups: readonly SimilarityGroup[];
}) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Layers className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-sm">Similar Patterns</CardTitle>
            <CardDescription>Grouped by URL + referrer</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {similarityGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No similar patterns detected
          </p>
        ) : (
          <div className="space-y-2.5">
            {similarityGroups.map((group) => (
              <div
                key={`${group.url}-${group.referrer}`}
                className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Tooltip content={group.url}>
                      <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        {truncateUrl(group.url, 35)}
                      </p>
                    </Tooltip>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      From:{" "}
                      {group.referrer === "<no referrer>"
                        ? "Direct"
                        : truncateUrl(group.referrer, 30)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-semibold flex-shrink-0",
                      group.count >= 10 &&
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}
                  >
                    ×{group.count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Insights panel component
 */
export function InsightsPanel({
  insights,
  statusInsights,
  similarityGroups,
  isLoading,
}: InsightsPanelProps) {
  if (isLoading) {
    return (
      <div className="mt-4 space-y-4">
        <InsightCardSkeleton />
        <InsightCardSkeleton />
        <InsightCardSkeleton />
      </div>
    );
  }

  return (
    <ScrollArea maxHeight={480} className="mt-4">
      <div className="space-y-4 pr-2">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-card border text-center">
            <p className="text-lg font-bold text-primary">
              {insights.totalRequests}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Total
            </p>
          </div>
          <div className="p-3 rounded-lg bg-card border text-center">
            <p className="text-lg font-bold text-amber-500">
              {statusInsights.groups.find((g) => g.id === "client-errors")
                ?.count ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              4xx
            </p>
          </div>
          <div className="p-3 rounded-lg bg-card border text-center">
            <p className="text-lg font-bold text-red-500">
              {statusInsights.groups.find((g) => g.id === "server-errors")
                ?.count ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              5xx
            </p>
          </div>
        </div>

        {/* Cards */}
        <TopUrlsCard
          topUrls={insights.topUrls}
          totalRequests={insights.totalRequests}
        />

        <StatusGroupsCard statusInsights={statusInsights} />

        <TimeDistributionCard
          timeSeries={insights.timeSeries}
          maxBucketTotal={insights.maxBucketTotal}
        />

        <SimilarityClustersCard similarityGroups={similarityGroups} />
      </div>
    </ScrollArea>
  );
}

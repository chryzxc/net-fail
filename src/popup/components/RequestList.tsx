import { memo, useCallback } from "react";
import {
  AlertCircle,
  Clock,
  ExternalLink,
  Layers,
  WifiOff,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { RequestItemSkeleton } from "@/components/ui/skeleton";
import {
  StatusIndicator,
  getStatusVariant,
} from "@/components/ui/status-indicator";
import { Tooltip } from "@/components/ui/tooltip";
import { HTTP_METHOD_COLORS, RESOURCE_TYPE_LABELS } from "@/constants";
import type { FailedRequest, RequestListProps } from "@/types";

interface RequestItemProps {
  request: FailedRequest;
  isSelected: boolean;
  similarCount: number;
  onSelect: (request: FailedRequest) => void;
}

const RequestItem = memo(function RequestItem({
  request,
  isSelected,
  similarCount,
  onSelect,
}: RequestItemProps) {
  const handleClick = useCallback(() => {
    onSelect(request);
  }, [request, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(request);
      }
    },
    [request, onSelect]
  );

  const methodColor =
    HTTP_METHOD_COLORS[request.method ?? "GET"] ?? HTTP_METHOD_COLORS.GET;
  const statusVariant = getStatusVariant(request.statusCode);
  const resourceType = request.type
    ? RESOURCE_TYPE_LABELS[request.type] ?? request.type
    : null;

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "request-item p-3 bg-card border rounded-lg cursor-pointer group m-2",
        "focus-ring",
        isSelected && "ring-2 ring-primary border-primary/50 bg-accent/30"
      )}
      aria-selected={isSelected}
      aria-label={`${request.method} request to ${request.url}, status ${
        request.statusCode ?? "network error"
      }`}
    >
      {/* Header row with method, status, and timestamp */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* HTTP Method Badge */}
          <span className={cn("method-badge", methodColor)}>
            {request.method ?? "GET"}
          </span>

          {/* Status Code Badge */}
          <StatusIndicator variant={statusVariant} size="sm">
            {request.statusCode ?? "ERR"}
          </StatusIndicator>

          {/* Resource Type */}
          {resourceType && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide hidden group-hover:inline">
              {resourceType}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <Tooltip content={new Date(request.timestamp).toLocaleString()}>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(request.timestamp)}
          </span>
        </Tooltip>
      </div>

      {/* URL */}
      <div className="flex items-start gap-2">
        <p className="text-xs font-mono text-foreground/90 break-all line-clamp-2 flex-1">
          {request.url}
        </p>
        <ExternalLink className="h-3 w-3 text-muted-foreground/50 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Error message */}
      {request.error && (
        <div className="mt-2 flex items-start gap-1.5">
          {request.statusCode === null ? (
            <WifiOff className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-xs text-red-600 dark:text-red-400 line-clamp-1">
            {request.error}
          </p>
        </div>
      )}

      {/* Similar requests indicator */}
      {similarCount > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed">
          <Badge variant="secondary" className="gap-1">
            <Layers className="h-3 w-3" />
            {similarCount} similar request{similarCount !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}
    </li>
  );
});

export function RequestList({
  requests,
  selectedRequest,
  onSelect,
  getSimilarRequests,
  isLoading,
  compactMode,
}: RequestListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        className="space-y-2 mt-4"
        aria-busy="true"
        aria-label="Loading requests"
      >
        {[1, 2, 3].map((i) => (
          <RequestItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<WifiOff className="h-12 w-12" />}
        title="No failed requests captured"
        description="Failed network requests (4xx, 5xx, or network errors) will appear here when detected."
        className="mt-8"
      />
    );
  }

  return (
    <ScrollArea
      maxHeight={compactMode ? 280 : 360}
      className="mt-4"
      aria-label={`${requests.length} failed request${
        requests.length !== 1 ? "s" : ""
      }`}
    >
      <ul className={cn("space-y-2 pr-2", compactMode && "space-y-1.5")}>
        {requests.map((request) => (
          <RequestItem
            key={request.id}
            request={request}
            isSelected={selectedRequest?.id === request.id}
            similarCount={getSimilarRequests(request).length}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </ScrollArea>
  );
}

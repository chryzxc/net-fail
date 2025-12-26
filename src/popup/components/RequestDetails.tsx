import { useCallback, useState } from "react";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Server,
  Globe,
  FileCode,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  StatusIndicator,
  getStatusVariant,
} from "@/components/ui/status-indicator";
import { Tooltip } from "@/components/ui/tooltip";
import { HeaderList } from "./HeaderList";
import { cn, formatRelativeTime } from "@/lib/utils";
import { copyToClipboard } from "@/utils";
import { HTTP_METHOD_COLORS, RESOURCE_TYPE_LABELS } from "@/constants";
import type { FailedRequest } from "@/types";

interface RequestDetailsProps {
  request: FailedRequest;
  onClose: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}

/**
 * Collapsible section component for organizing details
 */
function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  count,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border/50 first:border-t-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2.5 text-left group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs font-medium text-foreground">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {count}
            </Badge>
          )}
        </div>
      </button>
      {isOpen && <div className="pb-3 pl-5 animate-appear">{children}</div>}
    </div>
  );
}

/**
 * Request details panel component
 */
export function RequestDetails({ request, onClose }: RequestDetailsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = useCallback(async () => {
    const success = await copyToClipboard(request.url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [request.url]);

  const methodColor =
    HTTP_METHOD_COLORS[request.method ?? "GET"] ?? HTTP_METHOD_COLORS.GET;
  const statusVariant = getStatusVariant(request.statusCode);
  const resourceType = request.type
    ? RESOURCE_TYPE_LABELS[request.type] ?? request.type
    : null;

  // Parse URL for display
  let hostname = "";
  let pathname = "";
  try {
    const url = new URL(request.url);
    hostname = url.hostname;
    pathname = url.pathname + url.search;
  } catch {
    hostname = request.url;
  }

  return (
    <Card className="mt-4 animate-slide-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Request summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("method-badge", methodColor)}>
                {request.method ?? "GET"}
              </span>
              <StatusIndicator variant={statusVariant}>
                {request.statusCode ?? "Network Error"}
              </StatusIndicator>
              {resourceType && (
                <Badge variant="outline" className="text-[10px]">
                  {resourceType}
                </Badge>
              )}
            </div>

            {/* URL with copy button */}
            <div className="flex items-start gap-2 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {hostname}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {pathname}
                </p>
              </div>
              <Tooltip content={copied ? "Copied!" : "Copy URL"}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopyUrl}
                  aria-label="Copy URL"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 -mr-1"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error message */}
        {request.error && (
          <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
            <p className="text-xs text-red-700 dark:text-red-400">
              {request.error}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea maxHeight={300}>
          {/* Metadata section */}
          <div className="space-y-2 mb-4 text-xs">
            <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Captured
              </span>
              <span className="font-medium">
                {new Date(request.timestamp).toLocaleString()}
                <span className="text-muted-foreground ml-1.5">
                  ({formatRelativeTime(request.timestamp)})
                </span>
              </span>
            </div>

            {request.initiator && (
              <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  Initiator
                </span>
                <span className="font-medium truncate max-w-[200px]">
                  {request.initiator}
                </span>
              </div>
            )}
          </div>

          {/* Headers sections */}
          <div className="space-y-1">
            <CollapsibleSection
              title="Request Headers"
              icon={<FileCode className="h-3.5 w-3.5" />}
              count={request.requestHeaders?.length}
              defaultOpen
            >
              <div className="bg-muted/30 rounded-lg p-2.5">
                <HeaderList
                  headers={request.requestHeaders}
                  searchable
                  copyable
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Response Headers"
              icon={<Server className="h-3.5 w-3.5" />}
              count={request.responseHeaders?.length}
            >
              <div className="bg-muted/30 rounded-lg p-2.5">
                <HeaderList
                  headers={request.responseHeaders}
                  searchable
                  copyable
                />
              </div>
            </CollapsibleSection>
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="mt-4 pt-3 border-t flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="gap-1.5"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy URL"}
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={request.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open URL
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useMemo, useCallback } from "react";
import { Search, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils";
import type { HeaderListProps } from "@/types";

/**
 * Header list component with search and copy functionality
 */
export function HeaderList({
  headers,
  searchable = false,
  copyable = false,
}: HeaderListProps) {
  const [search, setSearch] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Filter headers based on search
  const filteredHeaders = useMemo(() => {
    if (!headers || headers.length === 0) return [];
    if (!search.trim()) return headers;

    const lowerSearch = search.toLowerCase();
    return headers.filter(
      (header) =>
        header.name?.toLowerCase().includes(lowerSearch) ||
        header.value?.toLowerCase().includes(lowerSearch)
    );
  }, [headers, search]);

  // Handle copying a header value
  const handleCopy = useCallback(async (value: string, index: number) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }, []);

  // Empty state
  if (!headers || headers.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        No headers captured
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search input */}
      {searchable && headers.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search headers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-[11px] bg-background"
          />
        </div>
      )}

      {/* Headers list */}
      <ul className="space-y-0.5 max-h-[200px] overflow-auto scrollbar-thin">
        {filteredHeaders.length === 0 ? (
          <li className="text-[11px] text-muted-foreground italic py-2">
            No matching headers
          </li>
        ) : (
          filteredHeaders.map((header, index) => (
            <li
              key={`${header.name ?? "header"}-${index}`}
              className={cn(
                "header-cell group",
                copiedIndex === index && "bg-green-50 dark:bg-green-900/20"
              )}
            >
              <span className="font-medium text-[11px] text-foreground break-all">
                {header.name ?? "Unnamed"}
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className="text-[11px] text-muted-foreground text-right truncate max-w-[180px]"
                  title={header.value}
                >
                  {header.value ?? "—"}
                </span>
                {copyable && header.value && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={() => handleCopy(header.value!, index)}
                    aria-label={`Copy ${header.name} value`}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-2.5 w-2.5 text-green-500" />
                    ) : (
                      <Copy className="h-2.5 w-2.5" />
                    )}
                  </Button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Header count */}
      {headers.length > 0 && (
        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          {filteredHeaders.length === headers.length
            ? `${headers.length} header${headers.length !== 1 ? "s" : ""}`
            : `${filteredHeaders.length} of ${headers.length} headers`}
        </p>
      )}
    </div>
  );
}

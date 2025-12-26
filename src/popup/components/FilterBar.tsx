import { useCallback, useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FilterBarProps as BaseFilterBarProps } from "@/types";

interface FilterBarProps extends BaseFilterBarProps {
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional callback for refresh action */
  onRefresh?: () => void;
  /** Whether data is currently loading */
  isLoading?: boolean;
}

export function FilterBar({
  url,
  setUrl,
  clear,
  placeholder = "Filter by URL or referrer...",
  isLoading,
}: FilterBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    clear();
  }, [clear]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Sanitize input - remove potentially harmful characters
      const value = e.target.value.replace(/[<>]/g, "");
      setUrl(value);
    },
    [setUrl]
  );

  return (
    <div className="relative mt-4">
      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-background transition-all duration-200",
          isFocused
            ? "border-primary ring-2 ring-primary/20"
            : "border-input hover:border-muted-foreground/30"
        )}
      >
        {/* Search icon */}
        <div className="absolute left-3 flex items-center pointer-events-none">
          <Search
            className={cn(
              "h-4 w-4 transition-colors",
              isFocused ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        {/* Input field */}
        <Input
          value={url}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          aria-label="Filter requests"
          className={cn(
            "border-0 pl-9 pr-20 h-10 bg-transparent",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-muted-foreground/60"
          )}
          disabled={isLoading}
        />

        {/* Clear button */}
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Clear filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter hint */}
      {url && (
        <p className="mt-1.5 text-[11px] text-muted-foreground animate-appear">
          <Filter className="inline h-3 w-3 mr-1" />
          Showing requests matching "{url}"
        </p>
      )}
    </div>
  );
}

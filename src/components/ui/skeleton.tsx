import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to animate the skeleton
   */
  animate?: boolean;
}

/**
 * Skeleton loading placeholder component
 */
export function Skeleton({
  className,
  animate = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        animate && "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton for request list items
 */
export function RequestItemSkeleton() {
  return (
    <div className="p-3 bg-card border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

/**
 * Pre-built skeleton for insights cards
 */
export function InsightCardSkeleton() {
  return (
    <div className="p-4 bg-card border rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-2 w-4/5 rounded-full" />
        <Skeleton className="h-2 w-3/5 rounded-full" />
      </div>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusIndicatorVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium",
  {
    variants: {
      variant: {
        success:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        neutral:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      },
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        md: "h-6 px-2 text-xs",
        lg: "h-7 px-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusIndicatorVariants> {
  pulse?: boolean;
}

/**
 * Status indicator badge component
 */
export function StatusIndicator({
  className,
  variant,
  size,
  pulse,
  children,
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(statusIndicatorVariants({ variant, size }), className)}
      {...props}
    >
      {pulse && (
        <span
          className={cn(
            "mr-1.5 h-2 w-2 rounded-full animate-pulse",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "error" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            variant === "neutral" && "bg-gray-500"
          )}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Gets the appropriate variant for an HTTP status code
 */
export function getStatusVariant(
  statusCode: number | null
): "success" | "warning" | "error" | "neutral" {
  if (statusCode === null) return "error";
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warning";
  if (statusCode >= 200 && statusCode < 300) return "success";
  return "neutral";
}

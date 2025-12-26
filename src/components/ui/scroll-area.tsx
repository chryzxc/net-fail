import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum height of the scroll area
   */
  maxHeight?: string | number;
}

/**
 * Custom scroll area component with styled scrollbar
 */
export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, maxHeight, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30",
          className
        )}
        style={{
          maxHeight:
            typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = "ScrollArea";

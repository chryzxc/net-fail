import React from "react";
import { cn } from "@/lib/utils";

export const IconButton = ({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
};

export default IconButton;

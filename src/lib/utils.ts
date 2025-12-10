import { TRequestHeaders } from "@/background";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getReferrerFromHeaders(
  headers: TRequestHeaders | undefined
): string | null {
  if (!headers || !headers.length) return null;
  const refHeader = headers.find(
    (h) =>
      h.name?.toLowerCase() === "referer" ||
      h.name?.toLowerCase() === "referrer"
  );
  return refHeader ? refHeader.value : null;
}

import { StatusPredicate } from "./types";

export const createRangePredicate = (
  min: number,
  max: number
): StatusPredicate => {
  return (status) =>
    typeof status === "number" && status >= min && status < max;
};

export const matchesNetworkFailure: StatusPredicate = (status) =>
  status === null || status === undefined;

export const matchesOtherStatuses: StatusPredicate = (status) =>
  typeof status === "number" && (status < 400 || status >= 600);

export function isChromeRuntimeAvailable() {
  return (
    typeof chrome !== "undefined" &&
    (chrome as any).runtime &&
    (chrome as any).runtime.sendMessage
  );
}

export type TStatusPredicate = (status?: number | null) => boolean;

export type TStatusGroupDefinition = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly predicate: TStatusPredicate;
};

const createRangePredicate = (min: number, max: number): TStatusPredicate => {
  return (status) =>
    typeof status === "number" && status >= min && status < max;
};

const matchesNetworkFailure: TStatusPredicate = (status) =>
  status === null || status === undefined;

const matchesOtherStatuses: TStatusPredicate = (status) =>
  typeof status === "number" && (status < 400 || status >= 600);

export const STATUS_GROUPS: readonly TStatusGroupDefinition[] = [
  {
    id: "client-errors",
    label: "Client errors (4xx)",
    description: "Requests blocked by the client or the destination",
    color: "hsl(var(--chart-1))",
    predicate: createRangePredicate(400, 500),
  },
  {
    id: "server-errors",
    label: "Server errors (5xx)",
    description: "The server itself returned an error",
    color: "hsl(var(--chart-2))",
    predicate: createRangePredicate(500, 600),
  },
  {
    id: "network-errors",
    label: "Network failures",
    description: "No HTTP status (network / CORS / blocked)",
    color: "hsl(var(--chart-3))",
    predicate: matchesNetworkFailure,
  },
  {
    id: "other-errors",
    label: "Other statuses",
    description: "Non-standard codes or redirects",
    color: "hsl(var(--chart-4))",
    predicate: matchesOtherStatuses,
  },
];

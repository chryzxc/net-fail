export interface FailedRequest {
  id: string;
  url: string;
  method?: string;
  statusCode?: number | null;
  error?: string;
  timestamp: number;
  type?: string;
  requestHeaders?: RequestHeaders;
  responseHeaders?: Array<{ name?: string; value?: string }>;
  response?: any;
}

export type RequestHeaders = Array<{ name: string; value: string }>;

export type StatusPredicate = (status?: number | null) => boolean;

export type StatusGroupDefinition = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly predicate: StatusPredicate;
};

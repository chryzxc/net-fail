/**
 * Type definitions for Net Fail - Failed Network Request Tracker
 * @module types
 */



/**
 * HTTP header key-value pair
 */
export interface HttpHeader {
  readonly name: string;
  readonly value: string;
}

/**
 * Request headers array type
 */
export type RequestHeaders = ReadonlyArray<HttpHeader>;

/**
 * Response headers can have optional name/value pairs
 */
export type ResponseHeaders = ReadonlyArray<{
  readonly name?: string;
  readonly value?: string;
}>;

/**
 * HTTP methods supported by the tracker
 */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE';

/**
 * Request type as defined by Chrome webRequest API
 */
export type ResourceType =
  | 'main_frame'
  | 'sub_frame'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'object'
  | 'xmlhttprequest'
  | 'ping'
  | 'csp_report'
  | 'media'
  | 'websocket'
  | 'webtransport'
  | 'webbundle'
  | 'other';

/**
 * Core failed request data structure
 */
export interface FailedRequest {
  /** Unique identifier for the request */
  readonly id: string;
  /** Full URL of the failed request */
  readonly url: string;
  /** HTTP method used */
  readonly method: HttpMethod | string;
  /** HTTP status code (null for network errors) */
  readonly statusCode: number | null;
  /** Error message or description */
  readonly error: string;
  /** Unix timestamp when the request was captured */
  readonly timestamp: number;
  /** Type of resource requested */
  readonly type?: ResourceType | string;
  /** Request headers captured */
  readonly requestHeaders?: RequestHeaders;
  /** Response headers captured */
  readonly responseHeaders?: ResponseHeaders;
  /** Response body (if captured) */
  readonly response?: unknown;
  /** Initiator URL (the page that made the request) */
  readonly initiator?: string;
  /** Whether the request was from an incognito/private window */
  readonly incognito?: boolean;
  /** Request ID from the browser */
  readonly requestId?: string;
  /** Tab ID where the request originated */
  readonly tabId?: number;
}


/**
 * Predicate function for matching status codes
 */
export type StatusPredicate = (status?: number | null) => boolean;

/**
 * Status group definition for categorizing errors
 */
export interface StatusGroupDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly predicate: StatusPredicate;
  readonly icon?: string;
}

/**
 * Status group with computed count
 */
export interface StatusGroupMetric extends Omit<StatusGroupDefinition, 'predicate'> {
  readonly count: number;
  readonly percentage?: number;
}


/**
 * Time series data point for charts
 */
export interface TimeSeriesPoint {
  readonly bucket: number;
  readonly total: number;
  readonly breakdown: readonly number[];
  readonly timestamp?: Date;
}

/**
 * URL failure statistics
 */
export interface UrlStats {
  readonly url: string;
  readonly count: number;
  readonly lastSeen: number;
  readonly methods: readonly string[];
  readonly statusCodes: readonly (number | null)[];
}

/**
 * Similarity group for clustered requests
 */
export interface SimilarityGroup {
  readonly url: string;
  readonly referrer: string;
  readonly count: number;
  readonly timestamp: number;
  readonly pattern?: string;
}

/**
 * Insights data structure
 */
export interface InsightsData {
  readonly topUrls: ReadonlyArray<readonly [string, number]>;
  readonly timeSeries: readonly TimeSeriesPoint[];
  readonly totalRequests: number;
  readonly maxBucketTotal: number;
  readonly averagePerBucket?: number;
}

/**
 * Status insights data structure
 */
export interface StatusInsightsData {
  readonly groups: readonly StatusGroupMetric[];
  readonly maxCount: number;
  readonly total: number;
}


/**
 * Filter options for requests
 */
export interface RequestFilters {
  readonly search?: string;
  readonly methods?: readonly HttpMethod[];
  readonly statusCodes?: readonly number[];
  readonly resourceTypes?: readonly ResourceType[];
  readonly dateRange?: {
    readonly start: number;
    readonly end: number;
  };
  readonly showOnlyErrors?: boolean;
}

/**
 * Sort options for request list
 */
export interface RequestSortOptions {
  readonly field: 'timestamp' | 'url' | 'method' | 'statusCode';
  readonly direction: 'asc' | 'desc';
}

/**
 * Theme options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * User settings
 */
export interface UserSettings {
  readonly theme: ThemeMode;
  readonly maxStoredRequests: number;
  readonly autoRefresh: boolean;
  readonly refreshInterval: number;
  readonly showNotifications: boolean;
  readonly compactMode: boolean;
  readonly persistFilters: boolean;
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'system',
  maxStoredRequests: 500,
  autoRefresh: true,
  refreshInterval: 5000,
  showNotifications: false,
  compactMode: false,
  persistFilters: true,
} as const;


/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'har';

/**
 * Exported data structure
 */
export interface ExportedData {
  readonly version: string;
  readonly generatedAt: string;
  readonly exportFormat: ExportFormat;
  readonly totalRequests: number;
  readonly requests: readonly FailedRequest[];
  readonly metadata?: {
    readonly filters?: RequestFilters;
    readonly userAgent?: string;
  };
}


/**
 * Message actions for background script communication
 */
export type MessageAction =
  | 'getFailedRequests'
  | 'clearFailedRequests'
  | 'getSettings'
  | 'updateSettings'
  | 'exportData'
  | 'getStats';

/**
 * Base message structure
 */
export interface ExtensionMessage {
  readonly action: MessageAction;
  readonly payload?: unknown;
}

/**
 * Message response structure
 */
export interface ExtensionMessageResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

/**
 * Request list component props
 */
export interface RequestListProps {
  readonly requests: readonly FailedRequest[];
  readonly selectedRequest: FailedRequest | null;
  readonly onSelect: (request: FailedRequest) => void;
  readonly getSimilarRequests: (request: FailedRequest) => readonly FailedRequest[];
  readonly isLoading?: boolean;
  readonly compactMode?: boolean;
}

/**
 * Request details component props
 */
export interface RequestDetailsProps {
  readonly request: FailedRequest;
  readonly onClose: () => void;
  readonly onCopyUrl?: () => void;
  readonly onRetry?: () => void;
}

/**
 * Filter bar component props
 */
export interface FilterBarProps {
  readonly url: string;
  readonly setUrl: (url: string) => void;
  readonly clear: () => void;
  readonly filters?: RequestFilters;
  readonly onFiltersChange?: (filters: RequestFilters) => void;
}

/**
 * Header list component props
 */
export interface HeaderListProps {
  readonly headers?: ResponseHeaders;
  readonly searchable?: boolean;
  readonly copyable?: boolean;
}

/**
 * Insights panel component props
 */
export interface InsightsPanelProps {
  readonly insights: InsightsData;
  readonly statusInsights: StatusInsightsData;
  readonly similarityGroups: readonly SimilarityGroup[];
  readonly isLoading?: boolean;
}


/**
 * Makes all properties of T mutable
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Non-nullable type utility
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

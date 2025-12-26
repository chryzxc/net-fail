/**
 * Application constants and configuration
 * @module constants
 */

// ============================================================================
// Storage Limits
// ============================================================================

/** Maximum number of requests to store in local storage */
export const MAX_STORED_REQUESTS = 500;

/** Maximum size of request/response headers to store (bytes) */
export const MAX_HEADER_SIZE = 10000;

/** Pending headers flush delay in milliseconds */
export const PENDING_FLUSH_DELAY = 1000;

// ============================================================================
// UI Configuration
// ============================================================================

/** Default popup width */
export const POPUP_WIDTH = 540;

/** Default popup minimum height */
export const POPUP_MIN_HEIGHT = 480;

/** Maximum height for request list */
export const REQUEST_LIST_MAX_HEIGHT = 360;

/** Number of top URLs to show in insights */
export const TOP_URLS_COUNT = 5;

/** Number of time series buckets to display */
export const TIME_SERIES_BUCKETS = 8;

/** Time bucket size in milliseconds (15 minutes) */
export const TIME_BUCKET_SIZE = 15 * 60 * 1000;

/** Number of similarity groups to show */
export const SIMILARITY_GROUPS_COUNT = 5;

// ============================================================================
// HTTP Status Codes
// ============================================================================

/** Client error status codes range */
export const CLIENT_ERROR_MIN = 400;
export const CLIENT_ERROR_MAX = 500;

/** Server error status codes range */
export const SERVER_ERROR_MIN = 500;
export const SERVER_ERROR_MAX = 600;

/** Common HTTP error messages */
export const HTTP_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
} as const;

// ============================================================================
// Network Error Types
// ============================================================================

/** Common network error patterns */
export const NETWORK_ERROR_PATTERNS: Readonly<Record<string, string>> = {
  'net::ERR_CONNECTION_REFUSED': 'Connection refused by server',
  'net::ERR_CONNECTION_RESET': 'Connection was reset',
  'net::ERR_CONNECTION_TIMED_OUT': 'Connection timed out',
  'net::ERR_NAME_NOT_RESOLVED': 'DNS lookup failed',
  'net::ERR_INTERNET_DISCONNECTED': 'No internet connection',
  'net::ERR_SSL_PROTOCOL_ERROR': 'SSL/TLS protocol error',
  'net::ERR_CERT_COMMON_NAME_INVALID': 'Invalid SSL certificate',
  'net::ERR_CERT_DATE_INVALID': 'Expired SSL certificate',
  'net::ERR_BLOCKED_BY_CLIENT': 'Blocked by browser extension',
  'net::ERR_BLOCKED_BY_RESPONSE': 'Blocked by CORS/CSP policy',
  'net::ERR_FAILED': 'Generic network failure',
  'net::ERR_ABORTED': 'Request was aborted',
  'net::ERR_EMPTY_RESPONSE': 'Empty response from server',
} as const;

// ============================================================================
// Resource Types
// ============================================================================

/** Resource type display labels */
export const RESOURCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  main_frame: 'Document',
  sub_frame: 'iFrame',
  stylesheet: 'Stylesheet',
  script: 'Script',
  image: 'Image',
  font: 'Font',
  object: 'Object',
  xmlhttprequest: 'XHR/Fetch',
  ping: 'Ping',
  csp_report: 'CSP Report',
  media: 'Media',
  websocket: 'WebSocket',
  webtransport: 'WebTransport',
  webbundle: 'WebBundle',
  other: 'Other',
} as const;

/** Resource type icons (Lucide icon names) */
export const RESOURCE_TYPE_ICONS: Readonly<Record<string, string>> = {
  main_frame: 'FileText',
  sub_frame: 'Frame',
  stylesheet: 'Palette',
  script: 'Code',
  image: 'Image',
  font: 'Type',
  object: 'Box',
  xmlhttprequest: 'ArrowLeftRight',
  ping: 'Radio',
  media: 'Play',
  websocket: 'Plug',
  other: 'HelpCircle',
} as const;

// ============================================================================
// HTTP Methods
// ============================================================================

/** HTTP method colors for badges */
export const HTTP_METHOD_COLORS: Readonly<Record<string, string>> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HEAD: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  OPTIONS: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
} as const;

// ============================================================================
// Status Badge Colors
// ============================================================================

/** Status code badge colors */
export const STATUS_BADGE_COLORS: Readonly<Record<string, string>> = {
  '4xx': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '5xx': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  network: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
} as const;

// ============================================================================
// Animation & Timing
// ============================================================================

/** Auto-refresh interval options in milliseconds */
export const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '1s', value: 1000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
] as const;

/** Default animation duration in milliseconds */
export const ANIMATION_DURATION = 200;

// ============================================================================
// Storage Keys
// ============================================================================

/** Storage key for failed requests */
export const STORAGE_KEY_REQUESTS = 'failedRequests';

/** Storage key for user settings */
export const STORAGE_KEY_SETTINGS = 'userSettings';

/** Storage key for persisted URL filter */
export const STORAGE_KEY_URL = 'persistedUrl';

/** Storage key for pending headers */
export const STORAGE_KEY_PENDING_HEADERS = 'pendingRequestHeaders';

// ============================================================================
// Validation
// ============================================================================

/** Maximum URL length to display */
export const MAX_URL_DISPLAY_LENGTH = 80;

/** URL validation regex pattern */
export const URL_PATTERN = /^https?:\/\/.+/i;

/** Safe URL schemes */
export const SAFE_URL_SCHEMES = ['http:', 'https:'] as const;


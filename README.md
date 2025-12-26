# Net Trace

A modern Chrome/Edge Manifest V3 browser extension that captures, analyzes, and displays failed network requests with detailed insights.

## Features

- 🔍 **Request Capture** — Automatically captures HTTP 4xx/5xx errors and network failures
- 📊 **Visual Insights** — Charts and analytics for error distribution, top failing URLs, and time-based patterns
- 🌙 **Dark Mode** — Full dark/light theme support with system preference detection
- 🔎 **Smart Filtering** — Filter by URL, referrer, or any request attribute
- 📋 **Header Inspection** — View request and response headers with search and copy functionality
- 💾 **Export Options** — Export captured data as JSON or CSV
- 🔗 **Similarity Detection** — Groups similar requests by URL and referrer patterns
- ⚡ **Real-time Updates** — Live badge count and automatic UI refresh

## Tech Stack

- **React 18** — UI components with hooks
- **TypeScript** — Type-safe development
- **Tailwind CSS** — Utility-first styling with dark mode
- **Vite** — Fast build tool with HMR
- **Radix UI** — Accessible component primitives
- **Lucide Icons** — Modern icon library

## Project Structure

```
net-trace/
├── public/
│   └── manifest.json        # Extension manifest (MV3)
├── src/
│   ├── background.ts        # Service worker for request capture
│   ├── constants.ts         # App configuration and constants
│   ├── utils.ts             # Utility functions
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   ├── lib/
│   │   ├── storage.ts       # Storage utilities
│   │   ├── usePersistedUrl.ts
│   │   ├── useTheme.ts      # Theme management hook
│   │   └── utils.ts         # UI utilities
│   ├── components/
│   │   └── ui/              # Reusable UI components
│   └── popup/
│       ├── App.tsx          # Main popup component
│       ├── index.html
│       ├── index.css
│       ├── main.tsx
│       └── components/      # Popup-specific components
├── package.json
├── vite.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Setup

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Type checking
npm run typecheck
```

## Load Extension

1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist` folder

## Development

```bash
# Development build with watch
npm run dev

# Production build
npm run build
```

## Security Features

- Content Security Policy (CSP) compliant
- Input sanitization for URL filters
- No eval or inline scripts
- Minimal permissions (webRequest, storage only)
- Safe URL scheme validation

## License

MIT

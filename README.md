# Net Fail

A Chrome/Edge Manifest V3 browser extension that captures and displays failed network requests.

## Tech Stack

- **React 18** — UI
- **Tailwind CSS** — Styling
- **Vite** — Build tool

## Setup

```bash
npm install
```

## Development

```bash
npm run build
```

Then load the `dist/` folder as an unpacked extension:

1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist` folder

## Project Structure

```
net-Fail/
├── public/
│   └── manifest.json      # Extension manifest
├── src/
│   ├── background.js      # Service worker
│   └── popup/
│       ├── index.html
│       ├── main.jsx
│       ├── App.jsx
│       └── index.css
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## License

MIT

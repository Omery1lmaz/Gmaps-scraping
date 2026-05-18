# GMaps Lead Scraper - Agent Guide

## Project Overview

**GMaps Lead Scraper** is a Chrome Extension (Manifest V3) for scraping Google Maps business listings. It extracts business information including name, phone, website, address, hours, and more.

## Architecture

```
src/
├── App.tsx                    # React popup UI (400x600px)
├── main.tsx                   # React entry point
├── index.css                  # Global styles
├── config.ts                  # Frontend API config
├── background/
│   └── main.ts               # Background service worker
├── content/
│   └── scraper.ts            # Content script (scraping logic)
├── logic/
│   └── StateMachine.ts       # State management
└── types/
    └── index.ts              # TypeScript types
```

## Key Components

### manifest.json
- **Manifest V3** extension
- Permissions: `storage`, `activeTab`, `tabs`
- Host permission: `https://www.google.com/maps/*`
- Content script injects `src/content/scraper.ts` on Maps pages
- Background service worker: `src/background/main.ts`

### src/App.tsx (React Popup UI)
- 400x600px popup window
- Uses TailwindCSS, shadcn/ui, lucide-react
- Displays: lead count, status, progress, detail log
- Controls: start/pause/stop scraping, download/clear leads, sync to backend

### src/background/main.ts (Service Worker)
- Message router for all Chrome extension communication
- Handles: `GET_STATUS`, `START_SCRAPING`, `STOP_SCRAPING`, `PAUSE/RESUME_SCRAPING`
- `SYNC_LOCAL_DATA`: syncs local leads to backend API at `localhost:3001`
- `LEADS_FOUND`: receives new leads, stores in `chrome.storage.local`
- `LEAD_ENRICHED`: updates lead details in storage
- Subscribes to StateMachine for status broadcasts

### src/content/scraper.ts (Content Script)
- **Two-phase scraping:**
  1. List view: extracts basic lead info (name, rating, reviews, category, phone, website, address)
  2. Detail view: optionally extracts hours, open_now, price_level, service_options
- Uses PointerEvent simulation for Google Maps React compatibility
- Implements retry logic for fragile operations
- Handles pause/resume via `isPaused` flag

### src/logic/StateMachine.ts
- Central state management for scraper status
- States: `idle`, `scraping`, `paused`, `completed`, `failed`
- Observers subscribe via `subscribe()` for UI updates

### src/types/index.ts
- `Lead`: business data (id, name, rating, reviews, category, address, phone, website, url, openingHours, isOpenNow, priceLevel, serviceOptions)
- `ScraperStatus`: current state (state, leadsCount, pageIndex, lastLeads, activity, error, detailProgress, currentDetail, detailLog)
- `DetailLogEntry`: log entry for each detail extraction attempt

## Data Flow

1. **User clicks "Start"** → Popup sends `START_SCRAPING` to background
2. **Background** → sends `START_SCRAPING_CMD` to content script
3. **Content script** → extracts leads, sends `LEADS_FOUND` to background
4. **Background** → stores in `chrome.storage.local`, syncs to backend
5. **Background** → broadcasts `STATUS_UPDATED` to popup
6. **Popup** → re-renders with new status

## Storage

- **`chrome.storage.local.leads`**: Array of `Lead` objects
- **`chrome.storage.local`** also stores StateMachine status

## API Configuration

- Backend: `http://localhost:3001`
- API Key: `AIzaSyAZ7I8BW1Lpli58sLnmCE05Bbvyv7OrJ0g`
- Endpoints:
  - `GET /api/leads/external-ids` - Get existing lead IDs for deduplication
  - `POST /api/leads` - Create leads (returns `{ saved, duplicates }`)

## Critical Patterns

### Message Types (must know for agents)
- `GET_STATUS` - Request current scraper status
- `START_SCRAPING` - Begin scraping with `{ scrapeDetails: boolean }`
- `STOP_SCRAPING` - Stop immediately
- `PAUSE_SCRAPING` / `RESUME_SCRAPING` - Pause/resume
- `SYNC_LOCAL_DATA` - Sync local leads to backend
- `STATUS_UPDATED` - Broadcast from background to popup

### Scraping Strategy
- **List view selectors**: `div[role="article"]`, `div.Nv2Ybe`, `.fontBodyMedium.Q7S7S`
- **Detail view selectors**: `h1.DUwDvf`, `button[data-item-id="phone"]`, `button[data-item-id="address"]`
- **Anti-detection**: Random delays (1000-2500ms) between clicks, PointerEvent simulation

### State Machine States
- `idle` - Ready to start
- `scraping` - Actively scraping
- `paused` - Temporarily stopped
- `completed` - Finished successfully
- `failed` - Error occurred

## Common Tasks

### Adding a new field to Lead
1. Update `src/types/index.ts` - add field to `Lead` interface
2. Update `src/content/scraper.ts` - add extraction logic in `scrapeDetailPanel()`
3. Update `src/App.tsx` - add display logic if needed

### Modifying UI
- All styles use TailwindCSS with custom design tokens
- Popup width: 400px, height: 600px (fixed in App.tsx)

### Debugging
- Content script logs to browser console (view via "Inspect popup")
- Background service worker logs visible in `chrome://extensions/`
- StateMachine logs all transitions

## Would an agent likely miss this without help?

| Aspect | Would Agent Miss It? | Reason |
|--------|---------------------|--------|
| **Manifest V3 architecture** | Yes | Requires understanding of Chrome Extension lifecycle |
| **Two-phase scraping (list → detail)** | Yes | Complex flow, not obvious from file structure |
| **PointerEvent simulation for Google Maps** | Yes | Google Maps uses React with PointerEvents, not standard click |
| **State machine pattern** | Yes | Central to status management, easy to bypass |
| **Message passing between parts** | Yes | Chrome Extension messaging is non-obvious |
| **API key in source code** | Yes | Security concern - should be moved to backend |
| **Turkish language UI** | No | Obvious from strings in code |
| **Retry logic with exponential backoff** | Yes | Important for reliability |
| **Deduplication via external-ids API** | Yes | Critical for avoiding duplicates |
| **Detail log (last 50 entries)** | Yes | Easy to break when modifying logging |
| **Chrome extension service worker lifecycle** | Yes | Service workers can be terminated anytime, need proper state persistence |
| **Content script isolation** | Yes | Cannot access chrome.runtime API directly, must use messaging |
| **Google Maps dynamic selectors** | Yes | Selectors change frequently, requires robust fallback strategies |
| **Anti-detection measures** | Yes | Random delays and human-like behavior essential to avoid blocking |
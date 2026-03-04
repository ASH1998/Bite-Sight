# Changelog

## v1.2.0 (2026-03-04)

### Added
- Image upload support on Snap tab — pick photos from gallery instead of only camera capture
- Optional text description input — tell the AI what you're eating for better accuracy
- Gemini API now receives user description alongside the image for improved food identification

### Changed
- Snap tab controls redesigned — text input and action buttons in a unified dark bar above bottom navigation
- Upload and capture buttons side by side for quick access

## v1.1.0 (2026-03-02)

### Added
- Date range selector on History page (1W, 2W, 1M, 3M, 6M, 1Y, All)
- Smart chart aggregation — daily bars for short ranges, weekly for 3M/6M, monthly for 1Y/All
- Per-macro mini bar tiles (Protein, Carbs, Fat) in a 3-column grid
- Green color theme across all charts, stats, donut, and macro tiles
- CLAUDE.md project context file

### Fixed
- Camera stream leak — camera now stops when navigating away from Snap tab
- Video srcObject explicitly nulled on unmount to release hardware indicator

### Changed
- App icon uses single `static/logo.png` instead of separate icon-192/icon-512
- "Weekly Average" → "Average / Day", computed over selected range
- Daily Log filtered to selected date range
- Donut and legend colors updated to green palette
- Service worker: added cleanupOutdatedCaches, skipWaiting, clientsClaim
- IndexedDB upgrade handler uses versioned migrations for safer future schema changes

## v1.0.0 (2026-03-01)

### Features
- **Camera capture** - Photograph food using device rear camera
- **AI-powered analysis** - Gemini 3 Flash identifies food, estimates calories, protein, carbs, fat, fiber, sugar, sodium, and serving size
- **Daily dashboard** - Circular progress ring showing calories consumed vs daily goal, with meal list
- **History with charts** - 7-day bar chart, weekly averages, macro split donut chart, and expandable daily logs
- **Customizable goal** - Set daily calorie target (1000-5000 kcal)
- **User-provided API key** - Gemini API key stored locally on device (never bundled or sent to any server)
- **PWA support** - Installable on Android home screen, offline-capable with service worker
- **Android APK** - Google Play package generated via PWABuilder/TWA

### Tech Stack
- React 19 + TypeScript
- Vite 7 with PWA plugin
- Tailwind CSS 4
- Google Gemini API (gemini-3-flash-preview)
- IndexedDB via idb
- Hosted on Netlify

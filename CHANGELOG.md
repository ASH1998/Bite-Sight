# Changelog

## v1.3.1 (2026-03-22)

### Added
- **Indian food awareness** — Gemini prompt now specializes in Indian cuisine (dal, roti, biryani, dosa, paratha, thali, etc.) with accurate calorie estimates for Indian cooking methods (ghee, oil, coconut) and portion sizes
- **Data export/import** — Export all meals, weight entries, and settings as a JSON backup file; import merges data without overwriting existing entries, enabling safe migration across app updates or devices
- **PWA manifest enhancements** — properly sized icons (192x192, 512x512), wide + narrow screenshots for install prompt, categories, language/direction, stable manifest ID, fullscreen display mode

### Fixed
- **Untracked days no longer show as zero** — daily bar charts skip days with no logged meals; weekly/monthly aggregations average only from tracked days so gaps don't drag down values
- **PWA icon size mismatch** — manifest previously declared 192x192 but served 2048x2048; now uses correctly resized icon files

### Changed
- PWA display mode changed from `standalone` to `fullscreen` with `standalone` fallback

## v1.3.0 (2026-03-16)

### Added
- **Body & BMI tab** — new ⚖️ tab for body composition tracking
- Weight logging with kg/lb toggle; logs one entry per day (re-logging today replaces the previous entry)
- BMI card with live calculation, color-coded category badge (Underweight / Normal / Overweight / Obese), and a gradient zone bar with correct boundary stops at 18.5 / 25 / 30
- Target BMI marker on the zone bar when a goal weight is set
- Weight goal progress bar showing % of the way from starting weight to target
- Weight history line chart with 1W / 1M / 3M / All range selector; uses ResizeObserver so it fills the container at any screen width
- Dashed goal-weight line on the history chart
- Recent weight entries list with per-entry delete
- Smart recommendations card — BMI-based tips, 7-day average calorie context, estimated weeks to goal, and recent weight trend
- **Daily Calorie Plan** in Settings — shows estimated TDEE, recommended kcal/day for Moderate (0.5 kg/wk) and Fast (1 kg/wk) paces with weeks-to-goal, plus a custom target-date picker that calculates the exact daily intake needed; warns if the pace is unsafe (>1 kg/wk deficit or <1 200 kcal/day)

### Changed
- Settings page now includes height, target weight, weight unit, goal date, and calorie plan alongside existing controls
- IndexedDB migrated to v2 — new `weightEntries` store added via versioned upgrade handler (existing meal data unaffected)
- `UserSettings` type extended with `height`, `targetWeight`, `weightUnit`, `goalDate`
- Navigation bar now has 5 tabs: Today · Snap · Body · History · Settings

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

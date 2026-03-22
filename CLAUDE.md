# BiteSight - Project Context

## What is BiteSight?

BiteSight is a Progressive Web App (PWA) calorie tracker that uses AI to analyze food photos and estimate nutritional information. Users can snap a photo of their meal, and Google Gemini AI provides instant calorie and macro estimates.

## Core Features

- **AI Food Analysis** - Uses Google Gemini API (gemini-3-flash-preview) to analyze food photos (camera or uploaded) with optional text descriptions; prompt tuned for Indian cuisine accuracy
- **Daily Tracking** - Circular progress ring showing calories consumed vs daily goal
- **Detailed Nutrition** - Tracks calories, protein, carbs, fat, fiber, sugar, sodium, and serving sizes
- **Meal History** - Browse past meals with expandable day view, daily summaries, and date range filtering
- **History Charts** - Calorie bar chart, macro donut, and per-macro mini bar tiles with smart aggregation across date ranges
- **Customizable Goals** - Users can set daily calorie targets (1000-5000 kcal)
- **Body & BMI Tracker** - Log daily weight (kg/lb), view BMI on a color-coded zone bar, track progress toward a goal weight with a line chart and recommendations
- **Daily Calorie Plan** - Set a target date; app calculates kcal/day needed with Moderate/Fast pace presets and safety warnings
- **PWA Support** - Installable on Android with offline support via service workers
- **Data Export/Import** - Backup all data (meals, weight, settings) as JSON; import merges without overwriting
- **Local Storage** - All meal data stored locally in IndexedDB for privacy and offline access

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7 with PWA plugin
- **Styling**: Tailwind CSS 4
- **AI API**: Google Gemini API
- **Database**: IndexedDB via `idb` library
- **PWA**: vite-plugin-pwa for service worker and manifest

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Camera.tsx       # Camera capture + image upload + text description
│   ├── MealCard.tsx     # Individual meal display
│   ├── DailyProgress.tsx # Circular calorie progress ring
│   ├── FoodResult.tsx   # AI analysis results display
│   ├── Header.tsx       # App header with branding
│   └── Navigation.tsx   # Bottom tab navigation
├── pages/              # App screens/routes
│   ├── HomePage.tsx     # Main dashboard
│   ├── CameraPage.tsx   # Food photo capture
│   ├── BodyPage.tsx     # Weight logging, BMI, goal progress, chart, recommendations
│   ├── HistoryPage.tsx  # Past meals view
│   └── SettingsPage.tsx # User preferences + calorie plan
├── services/
│   ├── gemini.ts       # Gemini API integration
│   └── database.ts     # IndexedDB operations
├── types/              # TypeScript interfaces
├── utils/              # Helper functions
├── App.tsx             # Main app with tab routing
└── main.tsx            # Entry point
```

## Key Files

- **src/services/gemini.ts** - Gemini API configuration and food analysis logic
- **src/services/database.ts** - IndexedDB schema (v2) and CRUD operations for meals + weight entries
- **src/pages/BodyPage.tsx** - Weight tracking, BMI bar, goal chart, recommendations
- **src/vite-env.d.ts** - Declares `__APP_VERSION__` global injected by vite.config.ts
- **vite.config.ts** - Build config with PWA manifest; injects `__APP_VERSION__` from package.json
- **public/logo.png** - App logo (pie with fruits and "BITE-SIGHT" text) — served at `/logo.png` in production
- **static/bite-sight.png** - Header image for README (git/docs only, not served by Vite)

## Development Workflow

- Use `npm run dev` to start development server (accessible on local network)
- Use `npm run build` to create production build
- Use `npm run preview` to test production build locally

## Environment Variables

- **VITE_GEMINI_KEY** - Required Google AI Studio API key for Gemini API access

## Design Decisions

- **No backend** - Everything runs client-side for simplicity and privacy
- **IndexedDB storage** - Persistent local storage without needing a server
- **PWA-first** - Designed for mobile installation and offline use
- **Minimalist UI** - Clean, simple interface focused on quick meal logging
- **Green color theme** - All charts, stats, and accents use a green palette (green-500 to green-700)
- **Pure SVG/HTML charts** - No charting library; all graphs are hand-drawn SVG or CSS for zero extra dependencies
- **Sized PWA icons** - `public/logo-192.png` and `public/logo-512.png` for manifest; original `logo.png` kept for favicon/apple-touch-icon
- **Responsive charts via ResizeObserver** - Weight history chart measures its container in JS and recalculates SVG coordinates; text stays fixed-size. BMI zone bar uses HTML/CSS divs (not SVG) so font size never scales with the container
- **TDEE approximation** - Body tab estimates maintenance calories as `weight_kg × 33` (light activity). No age/sex required

## History Page Architecture

The history page (`src/pages/HistoryPage.tsx`) is the most complex screen:

- **Date range selector** - Pill buttons: 1W, 2W, 1M, 3M, 6M, 1Y, All
- **Smart bar aggregation** - Daily bars for short ranges (≤1M), weekly buckets for 3M/6M, monthly buckets for 1Y/All; untracked days are excluded (not shown as zero)
- **Calorie bar chart** - Green bars with red for over-goal days, dashed goal line
- **Period averages** - Computed from days-with-data in selected range
- **Macro donut** - SVG donut chart with green-tone segments (protein/carbs/fat)
- **Macro tiles** - 3-column grid of mini bar charts per macro, each with its own green shade
- **Daily log** - Expandable day cards filtered to selected range

## Camera / Snap Tab

Camera stream (`src/components/Camera.tsx`) uses a `cancelled` flag pattern to prevent stream leaks:
- On mount: requests `getUserMedia`, stores stream in ref
- On unmount: sets `cancelled = true`, stops all tracks, nulls `srcObject`
- If `getUserMedia` resolves after unmount, the stream is immediately killed
- Navigating away from the Snap tab unmounts `CameraPage` → unmounts `Camera` → cleanup runs

Input methods on the Snap tab:
- **Camera capture** — live viewfinder with shutter button
- **Image upload** — file picker (`<input type="file" accept="image/*">`) for gallery photos
- **Text description** — optional text input sent alongside the image to Gemini for better accuracy
- `analyzeFood(apiKey, imageBase64, description?)` in `gemini.ts` appends description as a separate text part

## Important: Static Assets

Vite only serves files from `public/` to the production `dist/` build. The `static/` directory is for git/README assets only — it is NOT copied to dist.

- Put production assets (icons, logos) in `public/` → served at root (`/logo.png`)
- Put repo-only assets (README images) in `static/` → not in dist
- The workbox config has `maximumFileSizeToCacheInBytes: 10MB` to accommodate the ~8MB logo

## Body Page Architecture

`src/pages/BodyPage.tsx` — key patterns:

- **Weight entries** stored in `weightEntries` IndexedDB store (added in DB v2 migration); always saved in kg, converted for display
- **BMI zone bar** — HTML/CSS divs with hard-stop gradient at 14% (18.5), 40% (25), 60% (30) of the 15–40 range; current position shown as a CSS triangle below the bar; avoids SVG so text doesn't scale
- **Weight chart** — SVG with `width={chartWidth}` (no viewBox); `ResizeObserver` on the wrapper div updates `chartWidth` state, which re-triggers `useMemo` to recompute all coordinates in real pixels
- **Calorie plan** — lives in SettingsPage, not BodyPage; reads latest weight entry + settings to compute plan live as user edits inputs
- **Recommendations** — computed in `useMemo` from BMI category, goal weight diff, 7-day avg calories, and recent weight trend (slope of last 5 entries)

## Versioning & Git Workflow

- Use **patch bumps** (v1.1.1, v1.1.2) for fixes rather than deleting/moving tags
- Tags should be immutable once pushed — increment version instead of force-replacing
- CHANGELOG.md tracks all releases
- **Commit by feature** — one logical change per commit; do not bulk-stage unrelated files together
- Work on feature branches; push branch, open PR to merge into `main`
- `__APP_VERSION__` is read from `package.json` at build time via `vite.config.ts` and displayed in the Settings footer

## Recent Changes (v1.3.1)

- Gemini prompt tuned for Indian food — recognizes common dishes, accounts for ghee/oil/coconut and Indian portion sizes
- Data export/import in Settings — JSON backup with merge-on-import (no duplicate overwrites)
- Untracked days excluded from history charts; weekly/monthly bars average only tracked days
- PWA manifest: correctly sized icons (192/512), screenshots, categories, fullscreen display, stable `id`
- Version bumped to 1.3.1

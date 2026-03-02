# BiteSight - Project Context

## What is BiteSight?

BiteSight is a Progressive Web App (PWA) calorie tracker that uses AI to analyze food photos and estimate nutritional information. Users can snap a photo of their meal, and Google Gemini AI provides instant calorie and macro estimates.

## Core Features

- **AI Food Analysis** - Uses Google Gemini API (gemini-3-flash-preview) to analyze food photos and estimate nutrition
- **Daily Tracking** - Circular progress ring showing calories consumed vs daily goal
- **Detailed Nutrition** - Tracks calories, protein, carbs, fat, fiber, sugar, sodium, and serving sizes
- **Meal History** - Browse past meals with expandable day view, daily summaries, and date range filtering
- **History Charts** - Calorie bar chart, macro donut, and per-macro mini bar tiles with smart aggregation across date ranges
- **Customizable Goals** - Users can set daily calorie targets (1000-5000 kcal)
- **PWA Support** - Installable on Android with offline support via service workers
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
│   ├── Camera.tsx       # Camera interface for food photos
│   ├── MealCard.tsx     # Individual meal display
│   ├── DailyProgress.tsx # Circular calorie progress ring
│   ├── FoodResult.tsx   # AI analysis results display
│   ├── Header.tsx       # App header with branding
│   └── Navigation.tsx   # Bottom tab navigation
├── pages/              # App screens/routes
│   ├── HomePage.tsx     # Main dashboard
│   ├── CameraPage.tsx   # Food photo capture
│   ├── HistoryPage.tsx  # Past meals view
│   └── SettingsPage.tsx # User preferences
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
- **src/services/database.ts** - IndexedDB schema and CRUD operations for meals
- **vite.config.ts** - Build configuration with PWA manifest
- **static/logo.png** - App logo (pie with fruits and "BITE-SIGHT" text)
- **static/bite-sight.png** - Header image for README

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
- **Pure SVG charts** - No charting library; all graphs are hand-drawn SVG/CSS for zero extra dependencies
- **Single logo file** - `static/logo.png` used for all icon sizes (favicon, apple-touch-icon, PWA manifest)

## History Page Architecture

The history page (`src/pages/HistoryPage.tsx`) is the most complex screen:

- **Date range selector** - Pill buttons: 1W, 2W, 1M, 3M, 6M, 1Y, All
- **Smart bar aggregation** - Daily bars for short ranges (≤1M), weekly buckets for 3M/6M, monthly buckets for 1Y/All
- **Calorie bar chart** - Green bars with red for over-goal days, dashed goal line
- **Period averages** - Computed from days-with-data in selected range
- **Macro donut** - SVG donut chart with green-tone segments (protein/carbs/fat)
- **Macro tiles** - 3-column grid of mini bar charts per macro, each with its own green shade
- **Daily log** - Expandable day cards filtered to selected range

## Camera Lifecycle

Camera stream (`src/components/Camera.tsx`) uses a `cancelled` flag pattern to prevent stream leaks:
- On mount: requests `getUserMedia`, stores stream in ref
- On unmount: sets `cancelled = true`, stops all tracks, nulls `srcObject`
- If `getUserMedia` resolves after unmount, the stream is immediately killed
- Navigating away from the Snap tab unmounts `CameraPage` → unmounts `Camera` → cleanup runs

## Recent Changes

- Rebranded from "ShowCalorie" to "BiteSight"
- Replaced icon-192/icon-512 with single `static/logo.png` for all app icons
- Fixed camera stream leak — stream now properly stops when navigating away from Snap tab
- Added date range selector (1W/2W/1M/3M/6M/1Y/All) to History page with smart aggregation
- Green color theme applied to all charts (donut, bar chart, macro tiles, weekly averages)
- Added per-macro mini bar tile charts (Protein, Carbs, Fat) in a 3-column grid
- Added user API key management in settings
- Set up Netlify deployment and PWA support

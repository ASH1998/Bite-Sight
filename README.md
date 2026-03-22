<div align="center">
  <img src="static/bite-sight.png" alt="BiteSight Logo" width="800">
</div>

# BiteSight

A Progressive Web App that uses your phone's camera and Google Gemini AI to identify food, estimate nutrition, and help you track your health goals — all locally on your device, no account required.

## Features

- **Snap & Analyze** — Photograph or upload a meal photo; Gemini AI returns calories, protein, carbs, fat, fiber, sugar, and sodium in seconds
- **Optional description** — Add a text note alongside your photo for better AI accuracy
- **Daily Dashboard** — Circular progress ring showing calories consumed vs your daily goal, with a scrollable meal list
- **Meal History** — Date-range selector (1W → All), bar chart with smart aggregation (daily / weekly / monthly), macro donut, and per-macro mini bar tiles
- **Body & BMI Tracker** — Log daily weight (kg or lb), see your BMI on a colour-coded zone bar, track progress toward a goal weight with a line chart
- **Daily Calorie Plan** — Set a target date; the app calculates exactly how many kcal/day you need, with preset Moderate and Fast pace options
- **Customisable Goal** — Adjust your daily calorie target (1 000–5 000 kcal) via a slider
- **Installable PWA** — Add to your Android home screen for a native app experience
- **Offline Support** — Service worker caches the app shell; all data lives in IndexedDB on your device

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | React 19 + TypeScript |
| Build | Vite 7 + `vite-plugin-pwa` |
| Styling | Tailwind CSS 4 |
| AI | Google Gemini API (`gemini-3-flash-preview`) |
| Storage | IndexedDB via `idb` |
| Hosting | Netlify |

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Google AI Studio](https://aistudio.google.com/apikey) API key

### Install & run locally

```bash
git clone https://github.com/ASH1998/bite-sight.git
cd bite-sight
npm install
```

Create a `.env` file with your Gemini key:

```bash
echo "VITE_GEMINI_KEY=your_api_key_here" > .env
```

Start the dev server (available on your local network so you can open it on your phone):

```bash
npm run dev
```

Open `http://localhost:5173` in your browser, or use the **Network** URL printed in the terminal to test on a phone connected to the same Wi-Fi.

### Build for production

```bash
npm run build        # type-check + bundle → dist/
npm run preview      # serve dist/ locally to verify before deploying
```

### Deploy

The `dist/` folder is a static site — drop it on Netlify, Vercel, Cloudflare Pages, or any static host.

## Usage

1. Open the app and go to **Settings** — paste your Gemini API key and save
2. Tap **Snap** — take a photo or pick one from your gallery, add an optional description, and hit Analyze
3. Review the nutrition breakdown and tap **Add to log** to record the meal
4. Check **Today** for your daily progress ring
5. Go to **Body** — log your weight, set a goal weight in Settings, and watch the BMI bar and calorie plan update

## Project Structure

```
src/
├── components/
│   ├── Camera.tsx          # Live viewfinder + upload + text description
│   ├── DailyProgress.tsx   # Circular calorie ring (SVG)
│   ├── FoodResult.tsx      # AI result card with add-to-log action
│   ├── Header.tsx          # Top bar with title
│   ├── MealCard.tsx        # Individual meal row
│   └── Navigation.tsx      # Bottom tab bar (Today · Snap · Body · History · Settings)
├── pages/
│   ├── HomePage.tsx        # Daily dashboard
│   ├── CameraPage.tsx      # Snap tab — capture, upload, analyse
│   ├── BodyPage.tsx        # Weight logging, BMI, goal progress, chart
│   ├── HistoryPage.tsx     # Past meals with charts and date range filter
│   └── SettingsPage.tsx    # API key, body metrics, calorie plan, data management
├── services/
│   ├── gemini.ts           # Gemini API call + prompt
│   └── database.ts         # IndexedDB schema (v2) and CRUD helpers
├── types/
│   └── index.ts            # Shared TypeScript interfaces
├── utils/
│   └── helpers.ts          # Date formatting, ID generation
├── App.tsx                 # Tab router
└── main.tsx                # Entry point
```

## Configuration

Gemini model settings live at the top of `src/services/gemini.ts`:

| Constant | Default | Description |
|----------|---------|-------------|
| `MODEL` | `gemini-3-flash-preview` | Gemini model ID |
| `TEMPERATURE` | `0` | `0` = deterministic output |
| `MAX_OUTPUT_TOKENS` | `2048` | Max response length |
| `THINKING_BUDGET` | `0` | Internal reasoning tokens (`0` = off) |

The daily calorie goal and body metrics (height, target weight, goal date) are saved in Settings and stored locally in IndexedDB — nothing is sent to any server other than the Gemini API call.

## Install on Android

1. Open the app URL in **Chrome** on your Android device
2. Tap ⋮ → **Add to Home Screen**
3. The app launches in standalone mode with its own icon

## License

MIT

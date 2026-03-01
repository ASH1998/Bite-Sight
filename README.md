<div align="center">
  <img src="static/bite-sight.png" alt="BiteSight Logo" width="800">
</div>

# BiteSight

A PWA calorie tracker that uses your phone's camera and Google Gemini AI to estimate nutrition from food photos.

## Features

- **Snap & Analyze** - Photograph your food, get instant calorie and macro estimates via Gemini AI
- **Daily Dashboard** - Circular progress ring showing calories consumed vs your daily goal
- **Detailed Nutrition** - Calories, protein, carbs, fat, fiber, sugar, sodium, and estimated serving size
- **Meal History** - Browse past days' meals with expandable day view
- **Customizable Goal** - Set your daily calorie target (1000-5000 kcal)
- **Installable PWA** - Add to your Android home screen for a native app experience
- **Offline Support** - Service worker caches the app shell; meal data stored locally in IndexedDB

## Tech Stack

- React 19 + TypeScript
- Vite 7 with PWA plugin
- Tailwind CSS 4
- Google Gemini API (gemini-3-flash-preview)
- IndexedDB via `idb`

## Setup

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key

### Install & Run

```bash
cd show_calorie
npm install

# Add your Gemini API key
echo "VITE_GEMINI_KEY=your_api_key_here" > .env

# Start dev server (accessible on local network)
npm run dev
```

Open `http://localhost:5173` on your computer, or use the Network URL shown in the terminal to open on your phone (same WiFi).

### Production Build

```bash
npm run build
npm run preview
```

## Install on Android

1. Open the app URL in Chrome on your Android phone
2. Tap the three-dot menu > **"Add to Home Screen"**
3. The app will appear as a standalone app with its own icon

## Project Structure

```
src/
├── components/      # Reusable UI (Camera, MealCard, DailyProgress, etc.)
├── pages/           # App screens (Home, Camera, History, Settings)
├── services/
│   ├── gemini.ts    # Gemini API integration (config at top of file)
│   └── database.ts  # IndexedDB operations
├── types/           # TypeScript interfaces
├── utils/           # Date formatting, ID generation
├── App.tsx          # Tab router & layout
└── main.tsx         # Entry point
```

## Configuration

All Gemini API settings are at the top of `src/services/gemini.ts`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL` | `gemini-3-flash-preview` | Gemini model to use |
| `TEMPERATURE` | `0` | LLM temperature (0 = deterministic) |
| `MAX_OUTPUT_TOKENS` | `2048` | Max response length |
| `THINKING_BUDGET` | `0` | Internal reasoning tokens (0 = disabled) |

## License

MIT

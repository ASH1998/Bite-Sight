# Changelog

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

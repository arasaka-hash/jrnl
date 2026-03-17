# JRNL — Westworld-Style Life Tracker

A dark, cyberpunk-inspired life tracking app with a 3D interactive spider graph. Enter qualitative life updates; AI parses them across six tracking points and visualizes your progress.

## Tracking Points

- Love and Awareness
- Mindfulness
- Intelligence
- Cool
- Technical Ability
- Physical Presence

## Features

- **Split layout**: Input panel and 3D spider graph always visible
- **AI parsing**: Qualitative updates parsed by Gemini across all points
- **3D spider graph**: Interactive, explorable with mouse (orbit, zoom, pan)
- **Terminal-style nodes**: Click points to see hero stat, trendline, and expandable details
- **Google Cloud persistence**: Same Firestore setup as creative-approval
- **Vercel-ready**: Deploy with environment variables

## Setup

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Local development
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Gemini API for AI parsing
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
# or GEMINI_API_KEY
```

### 2. Firestore

- Uses the **default** Firestore database. Omit `FIRESTORE_DATABASE_ID` in `.env.local` and Vercel.
- Collection: `life_updates`

**If you get `5 NOT_FOUND` or "database not found":**
1. Open [Firebase Console](https://console.firebase.google.com) → your project → Firestore
2. Create the default database if none exists (Firestore → Create database)
3. Remove `FIRESTORE_DATABASE_ID` from `.env.local` and Vercel so the app uses the default database

### 3. Vercel deployment

1. Set `GOOGLE_CLOUD_PROJECT` and `GOOGLE_SERVICE_ACCOUNT_KEY` (base64-encoded service account JSON)
2. Set `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`
3. Do **not** set `FIRESTORE_DATABASE_ID` (app uses the default database)
4. Run `node scripts/encode-key.js` to encode your service account key for `GOOGLE_SERVICE_ACCOUNT_KEY`

## Run locally

```bash
npm install
npm run dev
```

## Tech stack

- Next.js 14
- React Three Fiber + Drei (3D)
- Google Cloud Firestore
- Google Gemini (AI parsing)
- Tailwind CSS
- JetBrains Mono font throughout

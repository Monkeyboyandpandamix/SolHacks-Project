# CivicLens

CivicLens is a location-aware legislative discovery app that combines live government data, Firebase-backed persistence, and Gemini-powered summarization. It helps users browse federal, state, county, and city legislation, understand what it means in plain language, compare laws, and use community features tied to their location.

## Current Scope

- Real legislative feed based on selected `state`, `city`, and `language`
- Federal data from Congress.gov, Federal Register, and GovInfo
- State data from OpenStates
- Local/county data from configured public source scrapers
- Firebase Auth, Firestore caching, and community chat
- Community tab with events, neighborhood chat, translators, shelters, legal help, and immigration resources
- Analytics, map, saved laws, roadmap, digest, and AI assistant views

## Key Behaviors

### Real, Source-Backed Feed

- The feed is now filtered to source-backed laws only.
- Synthetic “coverage” placeholder laws were removed.
- Every law must have a public `sourceUrl` to survive normalization and deduplication.
- Congress API URLs are normalized to public Congress webpages before rendering or caching.

### Correct Jurisdiction Labels

- Laws are classified as `Federal`, `State`, `County`, or `City` using source URL and identifier patterns.
- OpenStates bills are labeled as `State`.
- Congress.gov, Federal Register, and GovInfo items are labeled as `Federal`.

### Canonical Law Deduplication

- Duplicate laws are merged into a single canonical record.
- Dedupe prioritizes:
  - source URL
  - stable bill identifiers
  - normalized title/date/level fallback
- This prevents the same bill from being recreated as multiple AI variants across different interests.

### Firestore-Backed Cache

- Firestore is the source of truth for cached laws per `state/city/language`.
- The app stores canonical location caches under `v4_<state>_<city>_<language>`.
- Legacy `v2_` and `v3_` cache docs are migrated into `v4_` and stale duplicates are deleted.
- New fetches merge only genuinely new laws into the stored dataset instead of replacing everything.

### State Feed Resilience

- OpenStates responses are cached server-side for 6 hours per state.
- OpenStates `429` responses trigger a cooldown/backoff window.
- If rate-limited, the server returns cached state results when available.
- The app surfaces a notification when state data is temporarily rate-limited.

## Community Features

### Community Tab

- Community Events
- Neighborhood Chat
- Nearby translators
- Nearby shelters
- Nearby lawyers and legal aid
- Immigration support resources

### Neighborhood Chat

- Backed by Firestore under `community_rooms/{roomId}/messages`
- Scoped per location
- Requires sign-in to post
- Publicly readable

## Firebase

### Active Firebase Project

This repo is configured to use:

- `solhack-7d8a0`

Config file:

- [firebase-applet-config.json](./firebase-applet-config.json)

Firebase bootstrap:

- [src/firebase.ts](./src/firebase.ts)

### Firestore Rules

Rules file:

- [firestore.rules](./firestore.rules)

Firebase deploy config:

- [firebase.json](./firebase.json)

Rules currently cover:

- `users/{uid}`
- `laws_cache/{cacheId}`
- `laws/{lawId}/comments/{commentId}`
- `community_rooms/{roomId}/messages/{messageId}`

## Data Sources

### Federal

- Congress.gov API
- Federal Register API
- GovInfo API

### State

- OpenStates API

### Local / County

- Scraped public legislative and council pages for configured cities/counties

### AI

- Gemini API for:
  - plain-language summaries
  - comparisons
  - conflict checks
  - translation
  - advocacy letters
  - chat assistant
  - community event/resource search fallback

## Environment Variables

Copy `.env.example` to `.env` and provide the needed values.

Required or strongly recommended:

- `GEMINI_API_KEY`
- `CONGRESS_GOV_API_KEY`
- `OPENSTATES_API_KEY`
- `GOVINFO_API_KEY`

Optional:

- `GOOGLE_CIVIC_API_KEY`
- `PROPUBLICA_API_KEY`
- `MEETUP_API_KEY`
- `APP_URL`

See:

- [`.env.example`](./.env.example)

## Installation

```bash
npm install
```

## Development

Start the combined frontend/backend server:

```bash
npm run dev
```

The app runs at:

- `http://localhost:3000`

## Build

```bash
npm run build
```

## Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules --project solhack-7d8a0
```

## Operational Notes

### OpenStates Limits

- OpenStates enforces request-rate limits.
- The app now mitigates this with state-level cache reuse and cooldown handling.
- Rapidly switching through many states can still trigger temporary throttling.

### Cache Refresh

- If old cached data is still visible, refresh the relevant location feed so the `v4_` cache path rewrites it.
- Old bad Congress API links may remain only in stale cache docs created before URL normalization.

### Auth Requirements

Google Authentication must be enabled in Firebase Console, and `localhost` must be in Authorized Domains for local sign-in to work.

## Main Files

- [src/App.tsx](./src/App.tsx)
- [src/firebase.ts](./src/firebase.ts)
- [src/services/geminiService.ts](./src/services/geminiService.ts)
- [src/services/communityService.ts](./src/services/communityService.ts)
- [src/components/LawCard.tsx](./src/components/LawCard.tsx)
- [src/components/LawFeed.tsx](./src/components/LawFeed.tsx)
- [src/components/CommunityView.tsx](./src/components/CommunityView.tsx)
- [server.ts](./server.ts)
- [firestore.rules](./firestore.rules)

## Tech Stack

- React 19
- Vite
- TypeScript
- Express
- Firebase Auth
- Firestore
- Axios
- Motion
- Lucide React
- Recharts
- Gemini

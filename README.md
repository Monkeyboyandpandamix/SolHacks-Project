# CulturAct

CulturAct is a location-aware legislative discovery app that combines live government data, Firebase-backed persistence, and Gemini-powered summarization. It helps users browse federal, state, county, and city legislation, understand what it means in plain language, compare laws, and use community features tied to their location.

It is designed for both:

- general civic users tracking everyday policy
- communities affected by culture, identity, language, immigration, equity, and heritage legislation

This project fits the Culture track because it focuses on how laws shape language, heritage, identity, belonging, and the day-to-day life of diverse communities, then gives those communities tools to understand and respond.

## Elevator Pitch

> Every year, bills are introduced that affect housing, education, work, immigration, language access, cultural funding, and community rights, but most people never hear about them until the impact is already real.
>
> CulturAct is an AI-powered civic platform where you choose who you are, where you live, and what issues matter to you, and it shows you the laws shaping your daily life and your community. Each law is pulled from real public sources, summarized in plain language, labeled by jurisdiction and impact, and explained in a way that connects policy to lived experience.
>
> Users can ask questions in natural language, compare laws, save what matters, explore legislation on a map, join neighborhood discussion, and take action through advocacy letters and representative contact tools.
>
> CulturAct helps people move from confusion to clarity, and from awareness to action.

## Current Scope

- Real legislative feed based on selected `state`, `city`, and `language`
- Federal data from Congress.gov, Federal Register, and GovInfo
- State data from OpenStates
- Local/county data from configured public source scrapers
- Real OpenStreetMap-based map view for geographic exploration
- Firebase Auth, Firestore caching, and community chat
- Community tab with events, neighborhood chat, translators, shelters, legal help, and immigration resources
- Analytics, map, saved laws, digest, and AI assistant views

## App Features

### Navigation Tabs

- Feed
- Saved Content
- Profile
- Map View
- Weekly Digest
- Analytics
- Community
- Law Workflow
- Court Simulator
- Bill Simulator

### Legislative Feed

- Location-aware feed for the selected `state` and `city`
- Standard civic filters such as `#Housing`, `#Labor`, `#Education`, `#Health`, and `#Environment`
- Culture-impact filters such as `#Immigration`, `#Language Access`, `#Indigenous Rights`, `#Arts & Culture Funding`, `#Racial Equity`, and `#Religious Freedom`
- Primary-interest prioritization
- Pagination for both the main feed and saved feed
- Real public source links on each law card
- Correct `Federal`, `State`, `County`, and `City` badges

### Law Card Actions

- Save and unsave laws
- Support / oppose voting
- Comments
- Community poll voting when a poll is available
- Share to clipboard
- Compare up to two laws side by side
- Follow topic directly from a law card
- Text-to-speech summary playback
- Focus mode for reading a law in isolation
- AI-generated advocacy letter or email draft

### AI Features

- Gemini-powered plain-language summaries
- CulturAct assistant chat drawer
- Personalized context using the user’s saved situation
- AI law comparison and conflict analysis
- AI advocacy letter generation
- Translation support in the feed pipeline

### User Profile

- Sign in with Firebase Auth
- Save a personal or community context statement
- Follow and unfollow standard civic topics and cultural impact tags
- Store per-user profile data in Firestore
- Representative cards with contact links

### Community

- Community Events section
- Neighborhood Chat per location
- Nearby translators
- Nearby shelters
- Lawyers and legal aid listings
- Immigration help resources

### Insights And Discovery

- Analytics dashboard
- Map-based exploration with OpenStreetMap
- Clickable state and federal map markers that filter the current feed
- Weekly Digest snapshot
- Law workflow explainer
- Courtroom simulator
- Bill simulator
- In-app notifications for feed and data warnings

## Key Behaviors

### Real, Source-Backed Feed

- The feed is now filtered to source-backed laws only.
- Synthetic “coverage” placeholder laws were removed.
- Every law must have a public `sourceUrl` to survive normalization and deduplication.
- Congress API URLs are normalized to public Congress webpages before rendering or caching.
- The classifier supports both regular civic categories and culture-focused impact categories.

### Correct Jurisdiction Labels

- Laws are classified as `Federal`, `State`, `County`, or `City` using source URL and identifier patterns.
- OpenStates bills are labeled as `State`.
- Congress.gov, Federal Register, and GovInfo items are labeled as `Federal`.

### Map View

- The map uses OpenStreetMap tiles through `react-leaflet`.
- State bubbles scale with the number of laws currently loaded for that state.
- A dedicated federal marker filters federal laws.
- Selecting the same marker again clears that map selection.

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

## Persistence And Data Flow

### Firestore Usage

- `users/{uid}` stores profile data, user context, and followed topics
- `laws_cache/{cacheId}` stores canonical location-based law caches
- `community_rooms/{roomId}/messages/{messageId}` stores neighborhood chat messages
- `laws/{lawId}/comments/{commentId}` supports structured discussion data

### Cache Strategy

- The app loads Firestore cache first for a location
- Fresh fetches merge only new or updated laws into the cached dataset
- Legacy `v2_` and `v3_` cache docs are migrated to `v4_`
- Stale duplicate cache docs are deleted after successful migration

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
- Leaflet
- React Leaflet
- Axios
- Motion
- Lucide React
- Recharts
- Gemini

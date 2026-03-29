# CulturAct

**Elevator pitch**

An AI-powered civic platform that helps communities understand how laws affect language, identity, heritage, belonging, and everyday life before those impacts are felt too late.

CulturAct is the project name.

## Inspiration

We were inspired by how often culture is affected by law long before people realize it. Policies around immigration, language access, education, religious freedom, housing, public funding, and community rights shape whether people feel seen, safe, and able to belong. Yet the people most affected by those decisions are often the least likely to receive that information in plain language or in a form that feels relevant to their lives. We wanted to build something that treats legislation not just as politics, but as something that shapes culture, identity, memory, and community survival.

## What it does

CulturAct is a location-aware legislative discovery app focused on helping people understand how policy affects culture and community. It pulls federal, state, and local policy data, summarizes it in plain language, translates it into supported languages including Farsi, and gives users tools to explore laws by geography, compare bills, follow issues, generate advocacy letters, and discover local community resources.

It also includes:

- a Census-backed U.S. heat map that helps users see where policy activity is concentrated
- representative lookup with contact information and recent official voting history
- support for culturally important issue areas such as immigration, language access, indigenous rights, arts and culture funding, racial equity, and religious freedom
- community resources and events that connect legislation to real local support systems
- interactive civic education features such as the Safety Guide, Law Workflow, Court Simulator, and Bill Simulator

## How we built it

We built CulturAct as a React + TypeScript application with a Node/Vite server. The frontend uses `react-leaflet` for the map experience and Firebase for auth and Firestore-backed persistence. The backend aggregates legislation from Congress.gov, Federal Register, GovInfo, OpenStates, local public sources, Google Civic, official House/Senate vote sources, and the U.S. Census ACS API.

Gemini powers the app's plain-language summaries, comparisons, advocacy-letter generation, translation pipeline, and assistant experiences. That mattered especially for turning dense policy language into something that people from different linguistic and cultural backgrounds could actually use. We also deployed the app on Vultr using Ubuntu, PM2, and Nginx.

## Challenges we ran into

- Legislative data quality varies a lot across federal, state, and local sources.
- Representative lookup for the U.S. House is much harder without ZIP code or exact address data.
- Vote-history data is not packaged cleanly in one source, so we had to work with official House and Senate sources.
- Map visualization needed to move beyond simple bubbles into a clearer heat-map style experience.
- Keeping the feed source-backed and deduplicated required careful normalization and caching logic.
- Designing for cultural relevance was also a challenge: it was not enough to show “what a bill is,” we had to think about how to show who it affects, why it matters, and how it touches community identity and access.

## Accomplishments that we're proud of

- Built a real source-backed civic legislation feed instead of a static demo dataset.
- Added multilingual support including Farsi.
- Added Census-backed demographic context to the map.
- Added live representative lookup and official recent voting history.
- Deployed the project to Vultr and got the full stack running behind Nginx with PM2.
- Built interactive civic learning modules, not just a feed reader.
- Framed legislation through culture-centered issue areas so the product speaks to identity, language, heritage, and belonging instead of treating policy as abstract bureaucracy.

## What we learned

- Civic-tech products need strong normalization and fallback logic because public data is messy.
- UX matters as much as data: laws need to be explained in plain language, not just displayed.
- Geographic context, translation, and representative access all make legislation feel more actionable.
- Culture-centered product design changes what “useful” means. People connect more when policy is explained through community impacts like language access, immigration risk, arts funding, education equity, and identity-based belonging.
- Deployment and operations matter early when a project depends on many outside APIs and scrapers.

## What's next for Untitled

Next for CulturAct:

- improve U.S. House representative resolution with fuller address handling
- strengthen official vote parsing and caching
- add richer demographic overlays from Census data
- integrate higher-quality voice features and multilingual civic storytelling
- deepen the culture-focused experience with stronger community narratives, localized impact analysis, and richer language-access workflows
- move from prototype deployment toward a stricter production runtime

## Built with

- TypeScript
- React
- Vite
- Node.js
- Express-style server routing in `server.ts`
- Firebase Auth
- Firestore
- Tailwind-style utility classes
- React Leaflet / OpenStreetMap
- PM2
- Nginx
- Vultr
- Gemini API
- Congress.gov API
- Federal Register API
- GovInfo API
- OpenStates API
- Google Civic API
- U.S. Census ACS API
- Official House Clerk vote sources
- Official U.S. Senate vote sources

## Which of the following AI tools did you use this weekend?

- Gemini API
- Generative AI-assisted code iteration and debugging workflows

## Did you implement a generative AI model or API in your hack this weekend?

Yes. We implemented Gemini-powered summarization, comparison, translation, assistant chat, and advocacy-letter generation directly in the app, especially to make culturally and linguistically complex legislation understandable to more people.

## Technology feedback

### Gemini

Gemini was one of the most useful parts of the stack because it let us turn dense legislative language into plain-language explanations, translations, and advocacy drafts quickly. The biggest value came from making policy understandable across different cultural and linguistic contexts rather than just searchable.

### Firebase

Firebase worked well for quick authentication and persistent user/community data. It let us focus on community features, user context, and civic participation instead of spending our time building core infrastructure from scratch.

### Vultr

Vultr was straightforward for getting a full-stack deployment online quickly. Using Ubuntu, PM2, and Nginx gave us enough control for a hackathon deployment without a complicated platform setup.

## Current Scope

- Real legislative feed based on selected `state`, `city`, and `language`
- Federal data from Congress.gov, Federal Register, and GovInfo
- State data from OpenStates
- Local/county data from configured public source scrapers
- Real OpenStreetMap-based map view for geographic exploration
- U.S. Census ACS-backed state heat map intensity
- Firebase Auth, Firestore caching, and community chat
- Community tab with events, neighborhood chat, translators, shelters, legal help, and immigration resources
- Analytics, map, saved laws, digest, AI assistant, and Safety Guide views

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
- Safety Guide

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
- Translation support in the feed pipeline, including Farsi (`فارسی`)

### User Profile

- Sign in with Firebase Auth
- Save a personal or community context statement
- Save ZIP code for more accurate U.S. House representative lookup
- Follow and unfollow standard civic topics and cultural impact tags
- Store per-user profile data in Firestore
- Representative cards with contact links
- Live federal representative lookup using Google Civic and Congress-aware fallback logic
- Recent official voting history from House Clerk and U.S. Senate vote sources

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
- State-level heat map using ACS population context from the U.S. Census API
- Clickable state and federal map interactions that filter the current feed
- Weekly Digest snapshot
- Law workflow explainer
- Courtroom simulator
- Bill simulator
- Safety Guide with rights, preparation, and interactive scenario flow
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
- The map includes a state-level choropleth/heat visualization.
- Heat intensity is based on loaded laws per 100,000 residents using U.S. Census ACS population data.
- State markers still provide quick popups and state selection anchors.
- A dedicated federal marker filters federal laws.
- Selecting the same marker again clears that map selection.

### Representative Lookup

- Google Civic API is used to resolve federal representatives from the selected location.
- ZIP code can be saved in the user profile to improve U.S. House district resolution.
- Official recent voting history is parsed from House Clerk and U.S. Senate vote sources.
- If a live federal lookup is incomplete, the UI falls back to state-aware representative cards instead of showing nothing.

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
- Official House Clerk vote pages
- Official U.S. Senate roll call vote pages

### State

- OpenStates API

### Demographic / Population Context

- U.S. Census ACS API for state population data used in the map heat layer

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
- `CENSUS_API_KEY`
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

## Vultr Deployment

The app was deployed to a Vultr Ubuntu server and run behind Nginx with PM2.

### Server Setup

- Provider: Vultr
- Instance type: Cloud Compute
- OS: Ubuntu 24.04 LTS
- App process manager: PM2
- Reverse proxy: Nginx

### Server Provisioning Commands

```bash
apt update && apt upgrade -y
apt install -y git curl nginx ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

### App Deployment Commands

```bash
cd /root
git clone https://github.com/Monkeyboyandpandamix/SolHacks-Project.git
cd SolHacks-Project
npm install
nano .env
npm run build
pm2 start "npm run dev" --name culturact
pm2 save
pm2 startup
```

### Firewall Commands

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### Runtime Verification Commands

```bash
pm2 status
curl http://127.0.0.1:3000
nginx -t
systemctl restart nginx
```

### Example Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Deployment Notes

- The current PM2 command uses `npm run dev`, which is acceptable for a prototype/demo deployment.
- For a stricter production setup, a dedicated production server command is recommended.
- The server should keep `.env` out of version control and store all API keys only on the deployed host.

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

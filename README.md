# CulturAct

**Elevator pitch**

An AI-powered civic platform that helps communities understand how laws affect language, identity, heritage, belonging, and everyday life before those impacts are felt too late.

CulturAct is the project name.

## Inspiration

We were inspired by how often culture is affected by law long before people realize it. Policies around immigration, language access, education, religious freedom, housing, public funding, and community rights shape whether people feel seen, safe, and able to belong. Yet the people most affected by those decisions are often the least likely to receive that information in plain language or in a form that feels relevant to their lives. We wanted to build something that treats legislation not just as politics, but as something that shapes culture, identity, memory, and community survival.

## What it does

CulturAct is a location-aware legislative discovery app focused on helping people understand how policy affects culture and community. It pulls federal, state, and local policy data, summarizes it in plain language, translates it into supported languages including Spanish, and gives users tools to explore laws by geography, compare bills, follow issues, generate advocacy letters, and discover local community resources.

It also includes:

- a Census-backed U.S. heat map that helps users see where policy activity is concentrated
- representative lookup with contact information and recent official voting history
- support for culturally important issue areas such as immigration, language access, indigenous rights, arts and culture funding, racial equity, and religious freedom
- community resources and events that connect legislation to real local support systems
- ElevenLabs-powered read-aloud for law summaries and selected text, with browser speech as fallback
- interactive civic education features such as the Safety Guide, Law Workflow, Court Simulator, and Bill Simulator

## How we built it

We built CulturAct as a React + TypeScript application with a Node/Vite server. The frontend uses `react-leaflet` for the map experience and Firebase for auth and Firestore-backed persistence. The backend aggregates legislation from Congress.gov, Federal Register, GovInfo, OpenStates, local public sources, Google Civic, official House/Senate vote sources, and the U.S. Census ACS API.

Gemini powers the app's plain-language summaries, comparisons, advocacy-letter generation, translation pipeline, and assistant experiences. That mattered especially for turning dense policy language into something that people from different linguistic and cultural backgrounds could actually use. We also deployed the app on Vultr using Ubuntu, PM2, and Nginx.

For accessibility and language support, we added ElevenLabs-based read-aloud so users can listen to law summaries and highlighted text. We also connected a Solana Anchor workspace (`SoH`) to the live React app so users can connect a wallet in the profile tab, inspect wallet state on devnet, request test SOL, record civic actions on-chain, and read those civic action receipts back from the blockchain.

## Challenges we ran into

- Legislative data quality varies a lot across federal, state, and local sources.
- Representative lookup for the U.S. House is much harder without ZIP code or exact address data.
- Vote-history data is not packaged cleanly in one source, so we had to work with official House and Senate sources.
- Map visualization needed to move beyond simple bubbles into a clearer heat-map style experience.
- Keeping the feed source-backed and deduplicated required careful normalization and caching logic.
- Designing for cultural relevance was also a challenge: it was not enough to show “what a bill is,” we had to think about how to show who it affects, why it matters, and how it touches community identity and access.

## Accomplishments that we're proud of

- Built a real source-backed civic legislation feed instead of a static demo dataset.
- Added multilingual support including Spanish, French, Chinese.
- Added Census-backed demographic context to the map.
- Added live representative lookup and official recent voting history.
- Added ElevenLabs read-aloud with automatic browser fallback.
- Deployed the project to Vultr and got the full stack running behind Nginx with PM2.
- Built interactive civic learning modules, not just a feed reader.
- Framed legislation through culture-centered issue areas so the product speaks to identity, language, heritage, and belonging instead of treating policy as abstract bureaucracy.
- Connected the Solana Anchor program to the live app so users can record civic participation with a wallet-signed transaction instead of keeping that activity only in a centralized web session.
- Generated the real Anchor IDL and type artifacts and wired the React app to the actual Solana program shape instead of a mock or placeholder contract layer.

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
- expand the Solana civic-actions flow into richer badge, campaign, and coalition-participation experiences
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
- Solana
- Anchor
- Solana Wallet Adapter
- ElevenLabs API

## Which of the following AI tools did you use this weekend?

- Gemini API
- ElevenLabs API
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

### ElevenLabs

ElevenLabs made the project more accessible by turning written policy summaries into audio. That mattered for users who prefer listening over reading, for longer legal text, and for multilingual or language-access-oriented use cases. We also built the app so browser speech synthesis remains available as a fallback if ElevenLabs fails or usage is exhausted.

## Solana / SoH Workspace

This repo includes a Solana Anchor workspace under [`SoH/`](./SoH), and it is now connected to the main React app. In this project, Solana is being used specifically for verifiable civic-action infrastructure rather than generic crypto features.

### How Solana Is Being Utilized

The Solana side of the project is built around the idea of recording meaningful civic participation in a tamper-resistant way.

In CulturAct, Solana is intended to support:

- recording a civic action on-chain, such as petition support, advocacy outreach, or community participation
- creating verifiable proof that a user completed a civic workflow inside the app
- giving community-oriented actions a durable receipt beyond a normal web session or centralized database alone
- supporting future wallet-based civic badges, coalition participation records, and campaign milestones

### How Solana Works Inside The App

The Solana flow is available directly in the **Profile** tab of the React app.

1. The app wraps the UI with a Solana wallet provider using Phantom and Solflare on **devnet**.
2. The user connects a wallet through the in-app wallet button.
3. The app loads the connected wallet address, devnet balance, and previously recorded on-chain civic action accounts.
4. The user can request devnet SOL directly from the profile tab for testing.
5. The user selects a civic action such as:
   - `Record Petition Support`
   - `Record Advocacy Action`
   - `Record Community Participation`
6. The frontend derives a PDA for that action and submits a transaction to the `civic_actions` Anchor program.
7. When the transaction succeeds, the app shows a Solana Explorer link so the action can be verified publicly on devnet.
8. The same profile panel can then reload and display the wallet's on-chain civic action history.

This means the app is not just “Solana-ready.” It already uses Solana as an active participation layer inside the user experience.

### On-Chain Data Model

The Anchor program in `SoH/programs/civic-actions/src/lib.rs` records:

- the user's wallet public key
- the action type
- the timestamp

Each civic action is stored in a PDA-backed account derived from:

- the static seed `action`
- the user's public key
- the action type

That means the project already has the foundation for:

- “I signed this petition”
- “I completed this civic action”
- “I participated in this public-interest workflow”

This makes Solana useful here not as a speculative feature, but as a way to make civic participation portable, transparent, and verifiable.

### App Files That Power The Solana Flow

- `src/components/SolanaWalletProvider.tsx`: wraps the app with Solana connection and wallet state
- `src/components/SolanaCivicActions.tsx`: renders the wallet connect UI, devnet balance, airdrop action, record-action buttons, and on-chain history in the profile tab
- `src/solana/config.ts`: stores the devnet RPC endpoint, program ID, and frontend IDL that now matches the generated Anchor artifacts
- `src/main.tsx`: mounts the wallet provider around the app
- `src/App.tsx`: places the civic-action UI inside the profile experience
- `SoH/programs/civic-actions/src/lib.rs`: Anchor program that stores civic action accounts on-chain
- `SoH/target/idl/civic_actions.json`: generated Anchor IDL artifact from the real program build
- `SoH/target/types/civic_actions.ts`: generated TypeScript program types from the real program build

### Why Solana Fits This Project

For CulturAct, the point of Solana is not cryptocurrency speculation. It is civic proof.

It lets the app move beyond “I clicked a button on a website” toward:

- public proof that a civic action happened
- portable participation records not locked inside one database
- a foundation for community badges, organizer workflows, and coalition accountability
- user-owned identity around civic and cultural participation

### What `SoH` Contains

- `SoH/programs/civic-actions/src/lib.rs`: Anchor program for recording civic actions
- `SoH/tests/anchor.ts`: Anchor test for PDA-based civic action creation
- `SoH/client/client.ts`: simple client script for checking provider, program ID, and wallet balance
- `SoH/client/programConfig.ts`: shared local program config so the CLI client can reach the deployed program cleanly
- `src/components/SolanaCivicActions.tsx`: live frontend civic-action flow connected to the Anchor program
- `src/components/SolanaWalletProvider.tsx`: wallet connection layer for the React app
- `src/solana/config.ts`: frontend Solana network and program configuration

### Local Solana Setup Commands

From the repo root:

```bash
npm run solana:install
npm run solana:build
npm run solana:test
npm run solana:client
```

Directly inside `SoH/`:

```bash
cd SoH
npm install
anchor build
anchor test
npm run client
```

### Solana Prerequisites

You will need:

- Solana CLI configured
- Anchor CLI installed
- a local keypair at `~/.config/solana/id.json`
- `ANCHOR_PROVIDER_URL=https://api.devnet.solana.com`
- `ANCHOR_WALLET=~/.config/solana/id.json`

Example Solana configuration:

```bash
solana config set --url https://api.devnet.solana.com
solana config get
solana airdrop 2
solana balance
```

Shell environment used on this machine:

```bash
export PATH="$HOME/.cargo/bin:$PATH"
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="$HOME/.config/solana/id.json"
```

### Using The Solana Flow In The App

1. Open the app and go to the **Profile** tab.
2. Click the wallet connect button.
3. Connect Phantom or Solflare on **devnet**.
4. Optionally request devnet SOL if the wallet needs test funds.
5. If the wallet is low on devnet SOL, the app will also try to auto-request a smaller airdrop before recording the action.
6. Pick one of the civic action buttons.
7. Approve the transaction in the wallet.
8. Open the returned Explorer link to verify the action receipt.
9. Use the same panel to refresh and view the wallet's recorded civic actions.

If the program is not deployed, the wallet transaction will fail. The frontend expects the `civic_actions` Anchor program to be deployed on devnet at the configured program ID.

If the public devnet faucet is rate-limiting requests, fund the wallet manually first:

```bash
solana airdrop 2 8YTs2gVQ8aBEucgwv2DGnkNA8phpnw9jZFhEdM75hmKp --url https://api.devnet.solana.com
```

### Solana Verification Status

The Solana flow has been verified locally with:

```bash
npm run solana:build
npm run solana:client
```

After the fixed Anchor build, the workspace now generates:

- `SoH/target/idl/civic_actions.json`
- `SoH/target/types/civic_actions.ts`

That means:

- the Anchor program builds successfully
- the generated Solana artifacts exist
- the CLI client can reach the deployed program on devnet
- the React app is wired to the real program shape
- the frontend wallet flow is connected to the live Solana program, not just a placeholder interface
- the app can auto-attempt devnet funding before sending a civic action transaction

## Current Scope

- Real legislative feed based on selected `state`, `city`, and `language`
- Federal data from Congress.gov, Federal Register, and GovInfo
- State data from OpenStates
- Local/county data from configured public source scrapers
- Real OpenStreetMap-based map view for geographic exploration
- U.S. Census ACS-backed state heat map intensity
- Firebase Auth, Firestore caching, and community chat
- Community tab with events, neighborhood chat, translators, shelters, legal help, and immigration resources
- Analytics, map, saved items, digest, AI assistant, and Safety Guide views

## App Features

### Navigation Tabs

- Feed
- Saved
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
- Translation support in the feed pipeline, including Farsi (`فارسی`), Spanish.

### User Profile

- Sign in with Firebase Auth
- Save a personal or community context statement
- Save ZIP code for more accurate U.S. House representative lookup
- Follow and unfollow standard civic topics and cultural impact tags
- Store per-user profile data in Firestore
- Connect a Solana wallet with Phantom or Solflare
- Record on-chain civic actions as wallet-signed participation receipts
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
- `ELEVENLABS_API_KEY`
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

### How Vultr Is Being Utilized

Vultr is the cloud infrastructure layer for CulturAct. We use it to host the full-stack application in a single deployable environment where the Node/Vite server, API aggregation logic, and reverse proxy all run together.

In this project, Vultr is used for:

- hosting the production Ubuntu server that runs the app
- serving the web app publicly through a stable public IP
- running the Node application process through PM2 for persistence and restarts
- fronting the app with Nginx as a reverse proxy
- centralizing the backend API orchestration that talks to Congress.gov, GovInfo, OpenStates, Google Civic, House/Senate vote sources, Meetup, and the U.S. Census API
- keeping environment variables and deployment configuration on the server rather than in the client
- giving us a straightforward path to scale into a more production-ready deployment later

Vultr is especially useful here because CulturAct depends on multiple external APIs, live data fetching, server-side aggregation, and deployment control that would be harder to manage in a purely static frontend setup.

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

### Updating The Live Vultr Deployment

To push new updates to the live site hosted on Vultr:

```bash
ssh root@YOUR_SERVER_IP
cd /root/SolHacks-Project
git pull origin main
npm install
npm run build
pm2 restart culturact
pm2 save
```

If you update Nginx configuration:

```bash
nginx -t
systemctl restart nginx
```

Quick verification after deploying changes:

```bash
pm2 status
curl http://127.0.0.1:3000
curl http://YOUR_SERVER_IP
```

Recommended update workflow:

1. Push code changes to GitHub from your local machine.
2. SSH into the Vultr server.
3. Run `git pull origin main`.
4. Rebuild with `npm run build`.
5. Restart the app with `pm2 restart culturact`.
6. Verify the site through PM2, local curl, and the public URL.

### Pushing `SoH` Solana Updates To Vultr

If you update the Solana workspace too:

```bash
ssh root@YOUR_SERVER_IP
cd /root/SolHacks-Project
git pull origin main
cd SoH
npm install
anchor build
cd /root/SolHacks-Project
npm install
npm run build
pm2 restart culturact
pm2 save
```

If Anchor is not yet installed on the server, install the Solana/Anchor toolchain first. For most app-only updates, you do not need to rebuild `SoH`, but for any change under `SoH/programs`, `SoH/tests`, `SoH/client`, or the Solana app wiring files, you should.

### Exact Commands For The Latest Solana Push

From this machine:

```bash
cd /Users/mohammadaghamohammadi/Desktop/Projects/SolHacks-Project-main
git add README.md SoH/Anchor.toml SoH/Cargo.toml SoH/client/client.ts SoH/client/frontend/src/App.tsx SoH/client/frontend/src/main.tsx SoH/client/frontend/src/programClient.ts SoH/package.json SoH/programs/civic-actions/Cargo.toml src/components/SolanaCivicActions.tsx src/solana/config.ts SoH/Cargo.lock SoH/client/programConfig.ts SoH/package-lock.json
git commit -m "Finalize Solana flow and improve devnet funding fallback"
git push origin main
```

On Vultr:

```bash
ssh root@YOUR_SERVER_IP
cd /root/SolHacks-Project
git pull origin main
npm install
npm run build
pm2 restart culturact
pm2 save
```

If you also want the `SoH` workspace refreshed on the server:

```bash
ssh root@YOUR_SERVER_IP
cd /root/SolHacks-Project/SoH
npm install
anchor build
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

# CivicLens

CivicLens is a democracy-focused application that helps users stay informed about local and national legislation. It uses AI to simplify legal jargon and provides a personalized feed based on user location and interests.

## Features

- **Personalized Legislative Feed:** Real-time updates on laws affecting your specific location.
- **AI-Powered Insights:** Simplifies complex legal text using Gemini AI.
- **Location-Based Filtering:** Easily change your location with city/county autofill suggestions.
- **Follow Topics:** Subscribe to specific legislative categories like Housing, Education, and Labor.
- **Comparison Tool:** Select and compare two laws side-by-side.
- **Representative Information:** Find and contact your elected officials.
- **Interactive Map:** Visualize legislation across different regions.

## :large_blue_diamond: Additional Feature Recommendations

### 1. AI-Enhanced Comprehension Features
| Feature | Description | Status |
|---|---|---|
| **Plain Language Summarizer** | AI condenses dense legal text into a 3-sentence plain English summary per law | Planned |
| **"How Does This Affect Me?" Engine** | User fills a profile (homeowner, student, small business owner, parent, etc.) to get personalized impact analysis | Planned |
| **Side-by-Side Law Comparator** | Compare how the same issue is legislated across different states | In Progress |
| **Conflict Detector** | AI flags when a state law potentially conflicts with a federal law | Planned |
| **Legal Jargon Glossary** | Inline definitions when hovering over complex legal terms | Planned |

---

### 2. Civic Engagement & Action Features
| Feature | Description | Status |
|---|---|---|
| **AI Letter/Email Generator** | Drafts a personalized advocacy letter to the user's elected representative based on selected law and stance | Planned |
| **Representative Finder** | Auto-populates elected officials (federal, state, local) based on user ZIP code via Google Civic API | Planned |
| **Voting Record Integration** | Shows how representatives voted on similar past bills through ProPublica Congress API data | Planned |
| **Legislative Status Tracker** | Visual bill progress bar: Introduced → Committee → Floor Vote → Signed/Vetoed | Planned |
| **Hearing Calendar** | Upcoming public hearings where citizens can testify, with registration links | Planned |

---

### 3. Community & Collaboration Features
| Feature | Description | Status |
|---|---|---|
| **Community Commentary** | Per-law threaded discussion board moderated by AI for civility | Planned |
| **Advocacy Groups Directory** | Organizations working on the same law so users can connect directly | Planned |
| **Collective Bookmarks** | Groups and coalitions can share curated law lists | Planned |
| **Crowd-sourced Impact Stories** | Citizens submit how a law affected them personally in a verified, anonymized format | Planned |

---

### 4. Intelligence & Discovery Features
| Feature | Description | Status |
|---|---|---|
| **Smart Alerts** | Notify users when bookmarked bills change status or new laws match their interest tags | Planned |
| **Trending Laws Dashboard** | Show what is being discussed most in the user's state this week | Planned |
| **"Related Laws" Recommendation** | Collaborative and content-based filtering for laws with similar issues and effects | Planned |
| **Multi-language Support** | AI translation in Spanish, Mandarin, and other languages for accessibility | Planned |
| **Audio Summaries** | Text-to-speech summaries for visually impaired or low-literacy users | Planned |

---

### 5. Analytics & Transparency (for Orgs & Power Users)
| Feature | Description | Status |
|---|---|---|
| **Advocacy Campaign Dashboard** | Track petition signatures, letters sent, and views per law | Planned |
| **Sentiment Heatmap** | Geographic view of public sentiment on a law across counties | Planned |
| **Legislation Velocity Score** | AI predicts likelihood of a bill passing based on historical patterns | Planned |

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

1. Create a `.env` file in the root directory based on `.env.example`.
2. Add your API keys:
   - `GEMINI_API_KEY`: Required for AI insights and location suggestions.
   - `CONGRESS_GOV_API_KEY`: Required for federal legislation data.
   - `OPENSTATES_API_KEY`: Required for state legislation data.
   - `GOVINFO_API_KEY`: Required for government documents.

### Running the App

To start the development server (both frontend and backend):
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Lucide React, Motion.
- **Backend:** Express, Node.js, Axios, Cheerio (for web scraping).
- **Database/Auth:** Firebase (Firestore & Authentication).
- **AI:** Google Gemini API.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const stateLegislationCache = new Map<string, { data: any; timestamp: number }>();
const stateLegislationBackoff = new Map<string, number>();
const STATE_CACHE_TTL = 6 * 60 * 60 * 1000;

const CITY_DIRECTORY: Record<string, string[]> = {
  California: ["San Francisco", "San Diego", "San Jose", "Sacramento", "Oakland", "Los Angeles"],
  "North Carolina": ["Charlotte", "Raleigh", "Durham", "Greensboro", "Chapel Hill", "Wilmington"],
  Texas: ["Austin", "Houston", "Dallas", "San Antonio", "El Paso", "Fort Worth"],
  "New York": ["New York City", "Buffalo", "Albany", "Rochester", "Syracuse", "Yonkers"],
};

const STATE_CODES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

const LOCAL_SOURCE_CONFIG: Record<string, Array<{ url: string; level: "city" | "county"; label: string }>> = {
  "California:San Francisco": [
    { url: "https://sfbos.org/legislation-introduced-2026", level: "city", label: "SF Board of Supervisors" },
    { url: "https://sfbos.org/legislation-passed-0", level: "city", label: "SF Board of Supervisors" },
    { url: "https://sfbos.org/events/calendar/upcoming", level: "city", label: "SF Board calendar" },
  ],
  "New York:New York City": [
    { url: "https://council.nyc.gov/legislation/", level: "city", label: "NYC Council legislation" },
    { url: "https://council.nyc.gov/calendar/", level: "city", label: "NYC Council calendar" },
  ],
  "North Carolina:Raleigh": [
    { url: "https://raleighnc.gov/city-council", level: "city", label: "Raleigh City Council" },
    { url: "https://raleighnc.gov/calendar", level: "city", label: "Raleigh calendar" },
    { url: "https://www.wake.gov/departments-government/board-commissioners", level: "county", label: "Wake County commissioners" },
  ],
  "North Carolina:Durham": [
    { url: "https://www.durhamnc.gov/131/City-Council", level: "city", label: "Durham City Council" },
    { url: "https://www.dconc.gov/government/departments-f-z/board-of-county-commissioners", level: "county", label: "Durham County commissioners" },
  ],
  "Texas:Austin": [
    { url: "https://www.austintexas.gov/department/city-council/council-meetings", level: "city", label: "Austin City Council" },
    { url: "https://www.traviscountytx.gov/commissioners-court/agendas", level: "county", label: "Travis County commissioners" },
  ],
  "Texas:Houston": [
    { url: "https://www.houstontx.gov/council/meetings.html", level: "city", label: "Houston City Council" },
    { url: "https://www.harriscountytx.gov/Government/Departments/Commissioners-Court", level: "county", label: "Harris County commissioners" },
  ],
};

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function hasAlphaTitle(value: string) {
  return /[A-Za-z]/.test(value);
}

function cleanScrapedTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeLegislation(title: string, href?: string) {
  const haystack = `${title} ${href || ""}`.toLowerCase();
  return /(ordinance|resolution|hearing|agenda|legislation|committee|budget|appropriation|amend|measure|li\d+|filed|introduced|council|commissioners|bill|meeting)/.test(haystack);
}

function isNavigationNoise(title: string, href?: string) {
  const haystack = `${title} ${href || ""}`.toLowerCase();
  return /(skip to main content|translate|pay a utility bill|staff|all city council members|mailto:|login|sign in|home|contact us|about us)/.test(haystack);
}

function absoluteUrl(baseUrl: string, href?: string) {
  if (!href) return baseUrl;
  if (href.startsWith("http")) return href;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

async function scrapeLegislationSource(source: { url: string; level: "city" | "county"; label: string }, keyPrefix: string) {
  try {
    const response = await axios.get(source.url, { timeout: 6000 });
    const $ = cheerio.load(response.data);
    const entries: any[] = [];

    $("a").each((i, el) => {
      const rawTitle = cleanScrapedTitle($(el).text().trim());
      const href = $(el).attr("href");
      const title = cleanScrapedTitle(rawTitle.replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, "").trim());
      const sourceUrl = absoluteUrl(source.url, href);

      if (!title || !hasAlphaTitle(title) || title.length < 8 || isNavigationNoise(title, sourceUrl) || !looksLikeLegislation(title, sourceUrl)) return;

      entries.push({
        id: `${keyPrefix}-${i}`,
        title,
        summary: `Scraped from ${source.label}`,
        level: source.level,
        sourceUrl,
        date: new Date().toLocaleDateString(),
      });
    });

    const deduped = entries.filter((entry, index, list) =>
      list.findIndex((item) => item.title === entry.title || item.sourceUrl === entry.sourceUrl) === index
    );

    return deduped;
  } catch (error: any) {
    console.error(`Scraper Error (${source.url}):`, error.message);
    return [];
  }
}

async function generateAiJson<T>(payload: {
  prompt: string;
  schema: Record<string, unknown>;
  tools?: Array<Record<string, unknown>>;
}): Promise<T | null> {
  if (!ai) return null;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: payload.prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: payload.schema as any,
      tools: payload.tools,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  return JSON.parse(response.text || "null") as T;
}

async function generateAiText(prompt: string): Promise<string | null> {
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  return response.text || null;
}

function normalizeLocationLabel(state: string, city: string) {
  return city?.trim() ? `${city}, ${state}` : state;
}

function fallbackCommunityEvents(state: string, city: string) {
  const locationLabel = normalizeLocationLabel(state, city);
  const now = Date.now();
  return [
    {
      id: `${state}-${city}-townhall`,
      title: `${locationLabel} Community Town Hall`,
      startDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      venue: `${city || state} Civic Center`,
      organizer: 'City Community Office',
      description: `A public conversation covering neighborhood concerns, service updates, and local policy changes affecting residents in ${locationLabel}.`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${locationLabel} town hall`)}`,
      category: 'Town Hall',
    },
    {
      id: `${state}-${city}-clinic`,
      title: `${locationLabel} Legal and Benefits Clinic`,
      startDate: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString(),
      venue: `${city || state} Public Library`,
      organizer: 'Community Legal Partners',
      description: 'Walk-in support for benefits questions, immigration paperwork, translation referrals, and legal aid intake.',
      url: `https://www.google.com/search?q=${encodeURIComponent(`${locationLabel} legal aid clinic`)}`,
      category: 'Support Clinic',
    },
  ];
}

function fallbackCommunityResources(
  state: string,
  city: string,
  category: 'translator' | 'shelter' | 'legal' | 'immigration',
) {
  const locationLabel = normalizeLocationLabel(state, city);
  const fallbackByCategory = {
    translator: [
      {
        id: `${state}-${city}-211-language`,
        name: '211 Language Access Help',
        category: 'translator',
        description: `Call 211 to ask for interpretation, multilingual navigation, and language-access referrals serving ${locationLabel}.`,
        phone: '211',
        website: 'https://www.211.org',
        languages: ['English', 'Spanish', 'Multiple languages via interpreter'],
      },
      {
        id: `${state}-${city}-findhello`,
        name: 'FindHello Translation and Immigration Services',
        category: 'translator',
        description: `Search multilingual support programs, translation help, and newcomer services near ${locationLabel}.`,
        website: `https://www.findhello.org/search/?query=${encodeURIComponent(locationLabel)}`,
        languages: ['English', 'Spanish', 'Arabic', 'French'],
      },
    ],
    shelter: [
      {
        id: `${state}-${city}-211-shelter`,
        name: '211 Shelter and Emergency Housing',
        category: 'shelter',
        description: `24/7 housing and shelter referrals for people in crisis in and around ${locationLabel}.`,
        phone: '211',
        website: 'https://www.211.org',
        hours: '24/7',
      },
      {
        id: `${state}-${city}-homelessshelterdirectory`,
        name: 'Homeless Shelter Directory',
        category: 'shelter',
        description: `Directory of nearby shelters, food pantries, and housing support programs for ${locationLabel}.`,
        website: `https://www.homelessshelterdirectory.org/cgi-bin/id/city.cgi?city=${encodeURIComponent(city || state)}&state=${encodeURIComponent(state)}`,
      },
    ],
    legal: [
      {
        id: `${state}-${city}-lawhelp`,
        name: 'LawHelp Legal Aid Finder',
        category: 'legal',
        description: `Locate legal aid offices, self-help clinics, and attorneys serving low-income residents near ${locationLabel}.`,
        website: 'https://www.lawhelp.org',
      },
      {
        id: `${state}-${city}-aba`,
        name: 'American Bar Association Free Legal Answers',
        category: 'legal',
        description: 'Ask civil legal questions online and find bar-sponsored attorney referral resources.',
        website: 'https://abafreelegalanswers.org',
      },
    ],
    immigration: [
      {
        id: `${state}-${city}-immadvocates`,
        name: 'Immigration Advocates Network',
        category: 'immigration',
        description: `Nonprofit legal-service directory for immigration help that can be filtered to ${locationLabel}.`,
        website: 'https://www.immigrationadvocates.org/nonprofit/legaldirectory/',
      },
      {
        id: `${state}-${city}-uscis`,
        name: 'USCIS Find Legal Services',
        category: 'immigration',
        description: 'Official federal directory for legal-service providers and immigration assistance.',
        website: 'https://www.uscis.gov/avoid-scams/find-legal-services',
      },
    ],
  } as const;

  return fallbackByCategory[category];
}

function currentCongress() {
  const now = new Date();
  const year = now.getFullYear();
  const baseCongress = 119;
  const offset = Math.floor((year - 2025) / 2);
  return String(Math.max(118, baseCongress + offset));
}

async function fetchVotingRecord(memberId: string) {
  const apiKey = process.env.PROPUBLICA_API_KEY;
  if (!apiKey) return [];
  try {
    const congress = currentCongress();
    const response = await axios.get(`https://api.propublica.org/congress/v1/members/${memberId}/votes.json`, {
      headers: { "X-API-Key": apiKey },
      timeout: 6000,
    });
    const results = response.data?.results?.[0]?.votes || response.data?.results || [];
    return results.slice(0, 5).map((vote: any) => ({
      billTitle: vote.description || vote.bill?.title || vote.question || "Recent vote",
      stance: vote.position === "Yes" ? "support" : vote.position === "No" ? "oppose" : "watching",
      note: `${vote.position || "Tracked"} on ${vote.date || "recent vote"}`,
    }));
  } catch (error: any) {
    console.error("ProPublica voting record error:", error.message);
    return [];
  }
}

async function enrichRepresentativeWithProPublica(rep: any, officeName: string, divisionId?: string) {
  const apiKey = process.env.PROPUBLICA_API_KEY;
  if (!apiKey) return { ...rep, votingRecord: [] };

  const state = rep.address?.[0]?.state || divisionId?.match(/state:([a-z]{2})/i)?.[1]?.toUpperCase();
  const isSenate = /senator/i.test(officeName);
  const districtMatch = divisionId?.match(/cd:(\d+)/i);
  const district = districtMatch ? String(Number(districtMatch[1])) : undefined;
  if (!state || (!isSenate && !district)) {
    return { ...rep, votingRecord: [] };
  }

  try {
    const chamber = isSenate ? "senate" : "house";
    const url = isSenate
      ? `https://api.propublica.org/congress/v1/members/${chamber}/${state}/current.json`
      : `https://api.propublica.org/congress/v1/members/${chamber}/${state}/${district}/current.json`;
    const response = await axios.get(url, {
      headers: { "X-API-Key": apiKey },
      timeout: 6000,
    });
    const candidates = response.data?.results || [];
    const matched = candidates.find((candidate: any) => {
      const candidateName = normalizeName(candidate.name || `${candidate.first_name || ""} ${candidate.last_name || ""}`);
      const repName = normalizeName(rep.name || "");
      return candidateName === repName || candidateName.includes(repName) || repName.includes(candidateName);
    }) || candidates[0];

    if (!matched?.id) {
      return { ...rep, votingRecord: [] };
    }

    const votingRecord = await fetchVotingRecord(matched.id);
    return {
      ...rep,
      propublicaId: matched.id,
      votingRecord,
    };
  } catch (error: any) {
    console.error("ProPublica member lookup error:", error.message);
    return { ...rep, votingRecord: [] };
  }
}

async function fetchRepresentativesByAddress(address: string) {
  const civicKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!civicKey) return [];
  const response = await axios.get("https://www.googleapis.com/civicinfo/v2/representatives", {
    params: {
      address,
      includeOffices: true,
      key: civicKey,
    },
    timeout: 6000,
  });

  const offices = response.data?.offices || [];
  const officials = response.data?.officials || [];

  const mapped = await Promise.all(
    offices.flatMap((office: any) =>
      (office.officialIndices || []).map(async (index: number) => {
        const official = officials[index];
        if (!official) return null;
        const representative = {
          id: `${normalizeName(official.name)}-${index}`,
          name: official.name,
          office: office.name,
          role: office.name,
          party: official.party || "Nonpartisan",
          photoUrl: official.photoUrl,
          emails: official.emails || [],
          phones: official.phones || [],
          urls: official.urls || [],
          channels: official.channels || [],
          contact: {
            email: official.emails?.[0],
            phone: official.phones?.[0],
            website: official.urls?.[0],
            twitter: official.channels?.find((channel: any) => channel.type === "Twitter")?.id,
          },
          sponsoredBills: [],
        };
        return enrichRepresentativeWithProPublica(representative, office.name, office.divisionId);
      })
    )
  );

  return mapped.filter(Boolean);
}

async function fetchHearings(state: string, city: string) {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) return [];

  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
    const response = await axios.get("https://api.congress.gov/v3/committee-meeting", {
      params: {
        api_key: apiKey,
        format: "json",
        fromDateTime: start,
        toDateTime: end,
        limit: 6,
      },
      timeout: 6000,
    });

    const meetings = response.data?.committeeMeetings || response.data?.meetings || [];
    return meetings.slice(0, 6).map((meeting: any, index: number) => ({
      id: meeting.eventId || meeting.meetingId || `hearing-${index}`,
      title: meeting.title || meeting.committee?.name || "Congressional Hearing",
      date: meeting.date || meeting.startDate || meeting.meetingDate || new Date().toLocaleDateString(),
      venue: meeting.location || `${city}, ${state}`,
      type: /town/i.test(meeting.title || "") ? "town-hall" : /committee/i.test(meeting.title || "") ? "committee" : "hearing",
      registrationUrl: meeting.url || meeting.link,
    }));
  } catch (error: any) {
    console.error("Congress hearing API error:", error.message);
    return [
      {
        id: "fallback-hearing-1",
        title: `${city} Legislative Hearing Watch`,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        venue: `${city}, ${state}`,
        type: "hearing",
        registrationUrl: "https://www.congress.gov/committees",
      },
    ];
  }
}

async function translateTexts(texts: string[], targetLanguage: string) {
  if (!process.env.GEMINI_API_KEY || targetLanguage === "English") {
    return texts;
  }
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{
        parts: [{
          text: `Translate each item in this JSON array into ${targetLanguage}. Return JSON only. Input: ${JSON.stringify(texts)}`,
        }],
      }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    },
    { timeout: 12000 }
  );
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text || "[]");
  return Array.isArray(parsed) ? parsed : texts;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/legislation/federal", async (_req, res) => {
    try {
      const apiKey = process.env.CONGRESS_GOV_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "CONGRESS_GOV_API_KEY not configured" });

      const response = await axios.get("https://api.congress.gov/v3/bill", {
        params: { api_key: apiKey, format: "json", limit: 50, sort: "updateDate+desc" },
        timeout: 10000,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Congress.gov API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch federal legislation" });
    }
  });

  app.get("/api/legislation/federal-register", async (_req, res) => {
    try {
      const response = await axios.get("https://www.federalregister.gov/api/v1/documents.json", {
        params: {
          per_page: 25,
          order: "newest",
        },
        timeout: 10000,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Federal Register API Error:", error.message);
      res.json({ results: [] });
    }
  });

  app.get("/api/legislation/state", async (req, res) => {
    try {
      const apiKey = process.env.OPENSTATES_API_KEY;
      const state = String(req.query.state || "").trim();
      if (!apiKey) return res.status(500).json({ error: "OPENSTATES_API_KEY not configured" });
      if (!state) return res.status(400).json({ error: "State parameter is required" });

      const cacheKey = state;
      const cached = stateLegislationCache.get(cacheKey);
      const backoffUntil = stateLegislationBackoff.get(cacheKey) || 0;

      if (backoffUntil > Date.now()) {
        const retryAfterMs = backoffUntil - Date.now();
        if (cached) {
          return res.json({
            ...cached.data,
            meta: {
              ...(cached.data?.meta || {}),
              cached: true,
              rateLimited: true,
              retryAfterMs,
            },
          });
        }
        return res.json({
          results: [],
          meta: {
            cached: false,
            rateLimited: true,
            retryAfterMs,
          },
        });
      }

      if (cached && Date.now() - cached.timestamp < STATE_CACHE_TTL) {
        return res.json({
          ...cached.data,
          meta: {
            ...(cached.data?.meta || {}),
            cached: true,
            rateLimited: false,
          },
        });
      }

      const response = await axios.get("https://v3.openstates.org/bills", {
        params: { jurisdiction: state, sort: "updated_desc", per_page: 20, apikey: apiKey },
        timeout: 15000,
      });
      stateLegislationBackoff.delete(cacheKey);
      stateLegislationCache.set(cacheKey, {
        data: {
          ...response.data,
          meta: {
            cached: false,
            rateLimited: false,
          },
        },
        timestamp: Date.now(),
      });
      res.json({
        ...response.data,
        meta: {
          cached: false,
          rateLimited: false,
        },
      });
    } catch (error: any) {
      console.error("Open States API Error:", error.response?.data || error.message);
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const cacheKey = String(req.query.state || "");
        const retryAfterHeader = Number(error.response.headers?.["retry-after"]);
        const retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader * 1000 : 60 * 1000;
        stateLegislationBackoff.set(cacheKey, Date.now() + retryAfterMs);
        const cached = stateLegislationCache.get(cacheKey);
        if (cached) {
          return res.json({
            ...cached.data,
            meta: {
              ...(cached.data?.meta || {}),
              cached: true,
              rateLimited: true,
              retryAfterMs,
            },
          });
        }
        return res.json({
          results: [],
          meta: {
            cached: false,
            rateLimited: true,
            retryAfterMs,
          },
        });
      }
      res.status(500).json({ error: "Failed to fetch state legislation" });
    }
  });

  app.get("/api/legislation/documents", async (_req, res) => {
    try {
      const apiKey = process.env.GOVINFO_API_KEY;
      if (!apiKey) return res.json({ packages: [] });

      const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split(".")[0] + "Z";
      const response = await axios.get(`https://api.govinfo.gov/collections/BILLS/${startDate}`, {
        params: {
          api_key: apiKey,
          pageSize: 25,
          offsetMark: "*",
        },
        timeout: 10000,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("GovInfo API Error:", error.message);
      res.json({ packages: [] });
    }
  });

  app.get("/api/legislation/scrape", async (req, res) => {
    const { state, city } = req.query;
    try {
      const sources = LOCAL_SOURCE_CONFIG[`${state}:${city}`] || [];
      const sourceResults = await Promise.all(
        sources.map((source, index) => scrapeLegislationSource(source, `${String(city).replace(/\s+/g, "-")}-${index}`))
      );
      const results = sourceResults.flat();
      const deduped = results.filter((entry, index, list) =>
        list.findIndex((item) => item.title === entry.title || item.sourceUrl === entry.sourceUrl) === index
      );

      res.json(deduped);
    } catch (error: any) {
      console.error("Scraper Error:", error.message);
      res.json([]);
    }
  });

  app.get("/api/location/suggest", async (req, res) => {
    const query = String(req.query.query || "");
    const state = String(req.query.state || "");
    if (!query || !state) return res.json([]);
    const options = CITY_DIRECTORY[state] || [];
    const normalized = query.toLowerCase();
    res.json(options.filter(item => item.toLowerCase().includes(normalized)).slice(0, 5));
  });

  app.get("/api/civic/representatives", async (req, res) => {
    const address = String(req.query.address || "");
    if (!address) return res.status(400).json({ error: "Address is required" });
    try {
      const representatives = await fetchRepresentativesByAddress(address);
      res.json({ representatives });
    } catch (error: any) {
      console.error("Google Civic API Error:", error.message);
      res.json({ representatives: [] });
    }
  });

  app.get("/api/hearings", async (req, res) => {
    const state = String(req.query.state || "");
    const city = String(req.query.city || "");
    try {
      const hearings = await fetchHearings(STATE_CODES[state] || state, city);
      res.json({ hearings });
    } catch (error: any) {
      console.error("Hearing API Error:", error.message);
      res.json({ hearings: [] });
    }
  });

  app.get("/api/community/events", async (req, res) => {
    const state = String(req.query.state || "");
    const city = String(req.query.city || "");
    const meetupKey = process.env.MEETUP_API_KEY;
    const locationLabel = normalizeLocationLabel(state, city);

    try {
      if (meetupKey) {
        const meetupResponse = await axios.get("https://api.meetup.com/2/open_events", {
          params: {
            key: meetupKey,
            sign: true,
            country: "us",
            state: STATE_CODES[state] || state,
            city,
            page: 10,
            time: `${Date.now()},${Date.now() + 21 * 24 * 60 * 60 * 1000}`,
          },
          timeout: 10000,
        });

        const meetupEvents = Array.isArray(meetupResponse.data?.results)
          ? meetupResponse.data.results.map((event: any) => ({
              id: String(event.id || `${event.name}-${event.time}`),
              title: String(event.name || "Community event"),
              startDate: new Date(Number(event.time || Date.now())).toISOString(),
              venue: event.venue?.name || event.venue?.address_1 || locationLabel,
              organizer: event.group?.name || "Meetup",
              description: String(event.description || event.how_to_find_us || `Upcoming community event in ${locationLabel}.`).replace(/<[^>]+>/g, ' '),
              url: event.event_url,
              category: event.group?.category?.name || 'Meetup',
            }))
          : [];

        if (meetupEvents.length > 0) {
          return res.json({ events: meetupEvents });
        }
      }

      if (ai) {
        const events = await generateAiJson<any[]>({
          prompt: `Find 6 to 10 real upcoming community events for ${locationLabel} in the United States.
Prioritize town halls, public meetings, mutual-aid gatherings, immigration clinics, health fairs, translation support events, legal clinics, and neighborhood meetups.
Use Google Search to find live event details.
Return JSON only.`,
          schema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                startDate: { type: Type.STRING },
                venue: { type: Type.STRING },
                organizer: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
                category: { type: Type.STRING },
              },
              required: ["id", "title", "startDate", "description"],
            },
          },
          tools: [{ googleSearch: {} }],
        });

        if (Array.isArray(events) && events.length > 0) {
          return res.json({ events });
        }
      }

      res.json({ events: fallbackCommunityEvents(state, city) });
    } catch (error: any) {
      console.error("Community events error:", error.message);
      res.json({ events: fallbackCommunityEvents(state, city) });
    }
  });

  app.get("/api/community/resources", async (req, res) => {
    const state = String(req.query.state || "");
    const city = String(req.query.city || "");
    const category = String(req.query.category || "translator") as "translator" | "shelter" | "legal" | "immigration";
    const locationLabel = normalizeLocationLabel(state, city);

    try {
      if (ai) {
        const resources = await generateAiJson<any[]>({
          prompt: `Find 5 to 8 real nearby ${category} resources for ${locationLabel} in the United States.
Return only organizations, offices, clinics, or directories that are useful for a resident seeking immediate help.
For "legal", prioritize legal aid and lawyers.
For "immigration", prioritize immigration legal services, immigrant welcome centers, and newcomer support.
For "translator", prioritize interpreters, multilingual support centers, and language access services.
For "shelter", prioritize shelters, emergency housing, and housing crisis services.
Use Google Search and return JSON only.`,
          schema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                category: { type: Type.STRING, enum: ["translator", "shelter", "legal", "immigration"] },
                description: { type: Type.STRING },
                address: { type: Type.STRING },
                phone: { type: Type.STRING },
                website: { type: Type.STRING },
                languages: { type: Type.ARRAY, items: { type: Type.STRING } },
                hours: { type: Type.STRING },
              },
              required: ["id", "name", "category", "description"],
            },
          },
          tools: [{ googleSearch: {} }],
        });

        if (Array.isArray(resources) && resources.length > 0) {
          return res.json({ resources });
        }
      }

      res.json({ resources: fallbackCommunityResources(state, city, category) });
    } catch (error: any) {
      console.error("Community resources error:", error.message);
      res.json({ resources: fallbackCommunityResources(state, city, category) });
    }
  });

  app.post("/api/ai/translate", async (req, res) => {
    const text = String(req.body?.text || "");
    const targetLanguage = String(req.body?.targetLanguage || "English");
    if (!text) return res.json({ translation: "" });
    try {
      const [translation] = await translateTexts([text], targetLanguage);
      res.json({ translation });
    } catch (error: any) {
      console.error("Translate API Error:", error.message);
      res.json({ translation: text });
    }
  });

  app.post("/api/ai/translate-batch", async (req, res) => {
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.map((item: unknown) => String(item)) : [];
    const targetLanguage = String(req.body?.targetLanguage || "English");
    try {
      const translations = await translateTexts(texts, targetLanguage);
      res.json({ translations });
    } catch (error: any) {
      console.error("Translate batch API Error:", error.message);
      res.json({ translations: texts });
    }
  });

  app.post("/api/ai/laws", async (req, res) => {
    const state = String(req.body?.state || "");
    const city = String(req.body?.city || "");
    const userSituation = String(req.body?.userSituation || "");
    const primaryInterest = String(req.body?.primaryInterest || "all");
    const rawData = req.body?.rawData || {};
    if (!ai || !state) return res.json({ laws: [] });

    try {
      const laws = await generateAiJson<any[]>({
        prompt: `You are a civic information expert. Return only real, source-backed laws, bills, or ordinances that affect daily life for a resident of ${city ? `${city}, ${state}` : state}.
${userSituation ? `User situation: ${userSituation}. Prioritize direct relevance.` : ""}
${primaryInterest !== "all" ? `Primary interest: ${primaryInterest}. Rank laws in this area first while still including other important state and federal items.` : ""}
Use this official raw data as your primary source:
Federal: ${JSON.stringify(rawData.federal)}
State: ${JSON.stringify(rawData.state)}
Documents: ${JSON.stringify(rawData.documents)}
Scraped local/state data: ${JSON.stringify(rawData.scraped)}
If the provided data is insufficient, use Google Search to fill gaps, but do not invent laws.
Only include items with a real public source URL.
Use the exact requested location. For local items, prefer ${city ? `${city}, ${state}` : state}; do not substitute another city.
If there are only a few verified results, return only those few results.
Return JSON only.`,
        schema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              originalText: { type: Type.STRING },
              simplifiedSummary: { type: Type.STRING },
              impact: { type: Type.STRING },
              personalImpact: { type: Type.STRING },
              glossary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                  },
                },
              },
              category: { type: Type.STRING },
              level: { type: Type.STRING, enum: ["federal", "state", "county", "city"] },
              status: { type: Type.STRING, enum: ["proposed", "passed", "rejected", "updated"] },
              date: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
            },
            required: ["id", "title", "originalText", "simplifiedSummary", "impact", "category", "level", "status", "date", "sourceUrl"],
          },
        },
        tools: [{ googleSearch: {} }],
      });
      res.json({ laws: Array.isArray(laws) ? laws : [] });
    } catch (error: any) {
      console.error("AI laws error:", error.message);
      res.json({ laws: [] });
    }
  });

  app.post("/api/ai/advocacy-letter", async (req, res) => {
    const law = req.body?.law;
    const stance = String(req.body?.stance || "support");
    const userSituation = String(req.body?.userSituation || "");
    if (!law?.title) return res.json({ letter: "" });
    if (!ai) {
      return res.json({
        letter: `The Honorable [Representative Name],\n\nI am writing to ${stance === "support" ? "support" : "oppose"} ${law.title}. ${userSituation ? `${userSituation}. ` : ""}${law.impact || ""}\n\nThank you for your attention to this issue.\n\nSincerely,\n[Your Name]`,
      });
    }
    try {
      const letter = await generateAiText(`Draft a professional advocacy letter.
Law Title: ${law.title}
Position: ${stance}
${userSituation ? `User context: ${userSituation}` : ""}
Return only the completed letter.`);
      res.json({ letter: letter || "" });
    } catch (error: any) {
      console.error("AI advocacy letter error:", error.message);
      res.json({ letter: "" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const context = Array.isArray(req.body?.context) ? req.body.context : [];
    const userSituation = String(req.body?.userSituation || "");
    if (!ai) return res.json({ reply: "" });
    try {
      const conversation = history.map((item: any) => `${item.role === "user" ? "User" : "Assistant"}: ${String(item.text || "")}`).join("\n");
      const reply = await generateAiText(`You are the CulturAct assistant.
${userSituation ? `The user's situation is: "${userSituation}".` : ""}
Use these laws as context: ${JSON.stringify(context.map((l: any) => ({ id: l.id, title: l.title, summary: l.simplifiedSummary, impact: l.impact, status: l.status })))}
Conversation so far:
${conversation}
Assistant:`);
      res.json({ reply: reply || "" });
    } catch (error: any) {
      console.error("AI chat error:", error.message);
      res.json({ reply: "" });
    }
  });

  app.post("/api/ai/compare", async (req, res) => {
    const law1 = req.body?.law1;
    const law2 = req.body?.law2;
    if (!law1?.title || !law2?.title) return res.json({ analysis: "" });
    if (!ai) return res.json({ analysis: "" });
    try {
      const analysis = await generateAiText(`Compare the following two laws and provide a concise analysis of their key differences, potential conflicts, and unique impacts.
Law 1: ${law1.title}
Summary 1: ${law1.simplifiedSummary}
Impact 1: ${law1.impact}
Law 2: ${law2.title}
Summary 2: ${law2.simplifiedSummary}
Impact 2: ${law2.impact}`);
      res.json({ analysis: analysis || "" });
    } catch (error: any) {
      console.error("AI compare error:", error.message);
      res.json({ analysis: "" });
    }
  });

  app.post("/api/ai/conflict", async (req, res) => {
    const law1 = req.body?.law1;
    const law2 = req.body?.law2;
    if (!law1?.title || !law2?.title || !ai) return res.json({});
    try {
      const conflict = await generateAiJson<Record<string, unknown>>({
        prompt: `Assess whether these two laws conflict. Return JSON with keys risk, summary, overlaps. Law 1: ${law1.title} ${law1.simplifiedSummary}. Law 2: ${law2.title} ${law2.simplifiedSummary}.`,
        schema: {
          type: Type.OBJECT,
          properties: {
            risk: { type: Type.STRING, enum: ["low", "medium", "high"] },
            summary: { type: Type.STRING },
            overlaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["risk", "summary", "overlaps"],
        },
      });
      res.json(conflict || {});
    } catch (error: any) {
      console.error("AI conflict error:", error.message);
      res.json({});
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

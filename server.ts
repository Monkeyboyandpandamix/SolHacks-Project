import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { getLanguageLabel, normalizeLanguageCode } from "./src/constants/languages";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const stateLegislationCache = new Map<string, { data: any; timestamp: number }>();
const stateLegislationBackoff = new Map<string, number>();
const STATE_CACHE_TTL = 6 * 60 * 60 * 1000;
const STATE_RESULT_LIMIT = 40;
const ELEVENLABS_DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const ELEVENLABS_DEFAULT_MODEL_ID = "eleven_multilingual_v2";

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

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function rankRelevantLaws(message: string, context: any[]) {
  const queryTerms = new Set(
    normalizeSearchText(message)
      .split(" ")
      .filter((term) => term.length > 2)
  );

  if (queryTerms.size === 0) {
    return context.slice(0, 6);
  }

  return [...context]
    .map((law) => {
      const haystack = normalizeSearchText(
        `${law.title || ""} ${law.simplifiedSummary || ""} ${law.impact || ""} ${law.category || ""} ${law.status || ""}`
      );
      const score = [...queryTerms].reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { law, score };
    })
    .sort((left, right) => right.score - left.score)
    .map(({ law }) => law)
    .slice(0, 6);
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

function decodeHtml(value?: string) {
  if (!value) return "";
  return cheerio.load(`<span>${value}</span>`)("span").text().trim();
}

function legiscanStatusToText(status?: number) {
  switch (status) {
    case 1:
      return "introduced";
    case 2:
      return "in committee";
    case 3:
      return "engrossed";
    case 4:
      return "passed";
    case 5:
      return "vetoed";
    default:
      return "updated";
  }
}

async function fetchOpenStatesBills(state: string, apiKey: string) {
  const response = await axios.get("https://v3.openstates.org/bills", {
    params: { jurisdiction: state, sort: "updated_desc", per_page: 20, apikey: apiKey },
    timeout: 15000,
  });

  const results = Array.isArray(response.data?.results) ? response.data.results : [];
  return results.map((bill: any) => ({
    ...bill,
    sourceSystem: "openstates",
  }));
}

async function fetchLegiScanBills(state: string, apiKey: string) {
  const stateCode = STATE_CODES[state];
  if (!stateCode) return [];

  const response = await axios.get("https://api.legiscan.com/", {
    params: { key: apiKey, op: "getMasterList", state: stateCode },
    timeout: 20000,
  });

  const masterlist = response.data?.masterlist;
  if (!masterlist || typeof masterlist !== "object") return [];

  return Object.entries(masterlist)
    .filter(([key, value]) => key !== "session" && value && typeof value === "object")
    .map(([, bill]: [string, any]) => ({
      id: `legiscan-${bill.bill_id}`,
      identifier: decodeHtml(bill.number),
      title: decodeHtml(bill.title) || decodeHtml(bill.description) || "State legislation update",
      description: decodeHtml(bill.description),
      openstates_url: bill.url,
      updated_at: bill.last_action_date || bill.status_date,
      latest_action_description: decodeHtml(bill.last_action) || legiscanStatusToText(Number(bill.status)),
      classification: [legiscanStatusToText(Number(bill.status))],
      sourceSystem: "legiscan",
      legiscan_bill_id: bill.bill_id,
      status: Number(bill.status) || 0,
    }))
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    .slice(0, STATE_RESULT_LIMIT);
}

function mergeStateBills(openStatesBills: any[], legiscanBills: any[]) {
  const merged = new Map<string, any>();

  for (const bill of [...openStatesBills, ...legiscanBills]) {
    const key = String(bill.identifier || bill.id || bill.openstates_url || bill.url || bill.title || "").toLowerCase();
    if (!key) continue;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, bill);
      continue;
    }

    merged.set(key, {
      ...existing,
      ...bill,
      title: bill.title || existing.title,
      description: bill.description || existing.description,
      openstates_url: existing.openstates_url || bill.openstates_url,
      updated_at: existing.updated_at > bill.updated_at ? existing.updated_at : bill.updated_at,
      latest_action_description: bill.latest_action_description || existing.latest_action_description,
      classification: Array.from(new Set([...(existing.classification || []), ...(bill.classification || [])])),
      sourceSystem: existing.sourceSystem === "openstates" ? existing.sourceSystem : bill.sourceSystem,
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    .slice(0, STATE_RESULT_LIMIT);
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

function refreshRuntimeEnv() {
  dotenv.config({ path: ".env.local", override: true });
  dotenv.config({ override: true });
}

/** USPS state FIPS (first two digits of county/cousub GEOID) → two-letter state code */
const FIPS_TO_STATE: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY",
};

function extractUsZip5(address: string): string | null {
  const m = String(address).match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

async function fetchLatLonFromZip(zip5: string): Promise<{ lat: number; lon: number; stateAbbr: string } | null> {
  try {
    const { data } = await axios.get(`https://api.zippopotam.us/us/${zip5}`, { timeout: 6000 });
    const place = data?.places?.[0];
    if (!place) return null;
    return {
      lat: parseFloat(place.latitude),
      lon: parseFloat(place.longitude),
      stateAbbr: String(place["state abbreviation"] || "").toUpperCase(),
    };
  } catch {
    return null;
  }
}

function parseCongressionalDistrictFromGeographies(geographies: Record<string, unknown>): { stateAbbr: string; district: number } | null {
  const cdKey = Object.keys(geographies || {}).find((k) => /\d+(st|th|nd|rd)\s+Congressional\s+Districts/i.test(k));
  if (!cdKey) return null;
  const row = (geographies as any)[cdKey]?.[0];
  if (!row || typeof row !== "object") return null;

  const cdField = Object.keys(row).find((k) => /^CD\d+$/i.test(k));
  let district = 0;
  if (cdField && row[cdField] !== undefined && row[cdField] !== null) {
    district = parseInt(String(row[cdField]), 10);
    if (Number.isNaN(district)) district = 0;
  } else if (typeof row.BASENAME === "string" && /^\d+$/.test(row.BASENAME)) {
    district = parseInt(row.BASENAME, 10);
  }

  const stateFips = String(row.STATE ?? "").padStart(2, "0");
  const stateAbbr = FIPS_TO_STATE[stateFips];
  if (!stateAbbr) return null;
  return { stateAbbr, district };
}

function dedupeRepresentativesById(reps: any[]) {
  const seen = new Set<string>();
  return reps.filter((r) => {
    const key = String(r.bioguideId || r.id || r.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchCongressGovSponsoredActivitySnapshot(
  bioguideId: string,
  apiKey: string,
): Promise<Array<{ billTitle: string; stance: "support" | "oppose" | "watching"; note: string }>> {
  try {
    const { data } = await axios.get(`https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation`, {
      params: { api_key: apiKey, format: "json", limit: 5 },
      timeout: 8000,
    });
    const bills = data?.sponsoredLegislation || [];
    return bills.map((bill: any) => ({
      billTitle: cleanText(bill.title || `${bill.type || ""} ${bill.number || ""}`.trim()) || "Legislation",
      stance: "watching" as const,
      note: cleanText(bill.latestAction?.text || bill.policyArea?.name || "Recent legislative activity"),
    }));
  } catch (error: any) {
    console.error("Congress.gov sponsored activity snapshot error:", error.message);
    return [];
  }
}

async function congressMemberDetailToRepresentative(
  bioguideId: string,
  officeName: string,
  apiKey: string,
): Promise<any | null> {
  if (!apiKey) return null;
  try {
    const { data } = await axios.get(`https://api.congress.gov/v3/member/${bioguideId}`, {
      params: { api_key: apiKey, format: "json" },
      timeout: 8000,
    });
    const m = data?.member;
    if (!m) return null;
    const party = m.partyHistory?.[0]?.partyName || m.partyName || "Nonpartisan";
    const name = m.directOrderName || m.name || m.invertedOrderName || bioguideId;
    const phones = m.addressInformation?.phoneNumber ? [String(m.addressInformation.phoneNumber)] : [];
    const urls = m.officialWebsiteUrl ? [String(m.officialWebsiteUrl)] : [];
    const representative = {
      id: bioguideId,
      bioguideId,
      name,
      office: officeName,
      role: officeName,
      party,
      photoUrl: m.depiction?.imageUrl,
      emails: [] as string[],
      phones,
      urls,
      channels: [] as { type: string; id: string }[],
      contact: {
        phone: phones[0],
        website: urls[0],
      },
      sponsoredBills: [] as string[],
    };
    return enrichRepresentativeWithOfficialVoting(representative, officeName, apiKey);
  } catch (error: any) {
    console.error("Congress.gov member detail error:", error.message);
    return null;
  }
}

async function fetchRepresentativesViaCongressGov(address: string, apiKey: string): Promise<any[]> {
  const zip5 = extractUsZip5(address);
  if (!zip5) {
    console.warn("Congress.gov fallback: no 5-digit ZIP in address; cannot resolve district.");
    return [];
  }

  const loc = await fetchLatLonFromZip(zip5);
  if (!loc) return [];

  let parsed: { stateAbbr: string; district: number } | null = null;
  try {
    const { data } = await axios.get("https://geocoding.geo.census.gov/geocoder/geographies/coordinates", {
      params: {
        x: loc.lon,
        y: loc.lat,
        benchmark: "Public_AR_Current",
        vintage: "Current_Current",
        format: "json",
      },
      timeout: 8000,
    });
    parsed = parseCongressionalDistrictFromGeographies(data?.result?.geographies || {});
  } catch (error: any) {
    console.error("Census geocoder error:", error.message);
  }

  const stateAbbr = parsed?.stateAbbr || loc.stateAbbr;
  if (!stateAbbr) return [];

  const district = parsed?.district ?? 0;
  const congress = currentCongress();
  const results: any[] = [];

  try {
    const senRes = await axios.get(`https://api.congress.gov/v3/member/congress/${congress}/${stateAbbr}`, {
      params: { currentMember: true, api_key: apiKey, format: "json", limit: 250 },
      timeout: 12000,
    });
    const members = senRes.data?.members || [];
    const senators = members.filter((mem: any) => {
      if (mem.district !== undefined && mem.district !== null) return false;
      const terms = mem.terms?.item || [];
      return terms.some((t: any) => t.chamber === "Senate");
    });
    for (const mem of senators) {
      const id = mem.bioguideId;
      if (!id) continue;
      const rep = await congressMemberDetailToRepresentative(id, "U.S. Senator", apiKey);
      if (rep) results.push(rep);
    }
  } catch (error: any) {
    console.error("Congress.gov senate lookup error:", error.message);
  }

  try {
    const houseRes = await axios.get(`https://api.congress.gov/v3/member/congress/${congress}/${stateAbbr}/${district}`, {
      params: { currentMember: true, api_key: apiKey, format: "json", limit: 10 },
      timeout: 12000,
    });
    const houseMembers = houseRes.data?.members || [];
    for (const mem of houseMembers) {
      const id = mem.bioguideId;
      if (!id) continue;
      const rep = await congressMemberDetailToRepresentative(id, "U.S. Representative", apiKey);
      if (rep) results.push(rep);
    }
  } catch (error: any) {
    console.error("Congress.gov house lookup error:", error.message);
  }

  return dedupeRepresentativesById(results);
}

function currentSession() {
  return new Date().getFullYear() % 2 === 1 ? "1" : "2";
}

function extractLastName(value: string) {
  return normalizeName(value)
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(-1)[0] || "";
}

function namesMatch(candidate: string, target: string) {
  const candidateName = normalizeName(candidate);
  const targetName = normalizeName(target);
  if (!candidateName || !targetName) return false;
  if (candidateName === targetName) return true;
  if (candidateName.includes(targetName) || targetName.includes(candidateName)) return true;
  return extractLastName(candidateName) === extractLastName(targetName);
}

function mapVotePositionToStance(position: string) {
  const normalized = position.trim().toLowerCase();
  if (/(yea|yes|aye|guilty)/.test(normalized)) return "support";
  if (/(nay|no|not guilty)/.test(normalized)) return "oppose";
  return "watching";
}

function cleanText(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

async function fetchRecentHouseVoteUrls() {
  const response = await axios.get("https://clerk.house.gov/Votes", { timeout: 8000 });
  const $ = cheerio.load(response.data);
  const urls: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (!/\/Votes\//i.test(href)) return;
    if (href === "/Votes" || href === "/Votes/") return;
    urls.push(new URL(href, "https://clerk.house.gov").toString());
  });

  return [...new Set(urls)].slice(0, 10);
}

async function fetchRecentSenateVoteUrls() {
  const congress = currentCongress();
  const sessions = [currentSession(), currentSession() === "1" ? "2" : "1"];
  const urls: string[] = [];

  for (const session of sessions) {
    try {
      const response = await axios.get(
        `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.htm`,
        { timeout: 8000 },
      );
      const $ = cheerio.load(response.data);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        if (!/\/legislative\/LIS\/roll_call_votes\/vote\d+\/vote_\d+_\d+_\d+\.htm/i.test(href)) return;
        urls.push(new URL(href, "https://www.senate.gov").toString());
      });
      if (urls.length > 0) break;
    } catch {
      continue;
    }
  }

  return [...new Set(urls)].slice(0, 10);
}

async function fetchHouseVotingRecord(memberName: string) {
  try {
    const voteUrls = await fetchRecentHouseVoteUrls();
    const records: Array<{ billTitle: string; stance: "support" | "oppose" | "watching"; note: string }> = [];

    for (const url of voteUrls) {
      const response = await axios.get(url, { timeout: 8000 });
      const $ = cheerio.load(response.data);
      const pageTitle = cleanText($("h1").first().text()) || cleanText($("title").text()) || "Recent House vote";
      const pageText = cleanText($("body").text());
      const dateMatch = pageText.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}\b/i);

      let matchedPosition = "";
      $("table tr").each((_, row) => {
        const cells = $(row).find("th, td").map((__, cell) => cleanText($(cell).text())).get().filter(Boolean);
        if (cells.length < 2 || matchedPosition) return;
        const possibleName = cells[0];
        const possibleVote = cells[cells.length - 1];
        if (namesMatch(possibleName, memberName)) {
          matchedPosition = possibleVote;
        }
      });

      if (!matchedPosition) continue;

      records.push({
        billTitle: pageTitle.replace(/\s*\|\s*Bill Number:.*$/i, ""),
        stance: mapVotePositionToStance(matchedPosition),
        note: `${matchedPosition} on ${dateMatch?.[0] || "recent House roll call"} via Clerk of the House`,
      });

      if (records.length >= 5) break;
    }

    return records;
  } catch (error: any) {
    console.error("House voting record error:", error.message);
    return [];
  }
}

async function fetchSenateVotingRecord(memberName: string) {
  try {
    const voteUrls = await fetchRecentSenateVoteUrls();
    const records: Array<{ billTitle: string; stance: "support" | "oppose" | "watching"; note: string }> = [];

    for (const url of voteUrls) {
      const response = await axios.get(url, { timeout: 8000 });
      const $ = cheerio.load(response.data);
      const pageText = $("body").text();
      const compactText = cleanText(pageText);
      const questionMatch = compactText.match(/Question:\s*(.+?)\s*(?:Vote Number:|Vote Date:|Required For Majority:)/i);
      const measureTitleMatch = compactText.match(/Measure Title:\s*(.+?)\s*(?:Vote Counts:|Vote Summary|By Senator Name)/i);
      const dateMatch = compactText.match(/Vote Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}(?:,\s+\d{1,2}:\d{2}\s+[AP]M)?)/i);
      const lines = pageText.split("\n").map((line) => cleanText(line)).filter(Boolean);

      const memberLine = lines.find((line) => {
        const [namePart] = line.split(",");
        return namesMatch(namePart.replace(/\([^)]+\)/g, ""), memberName);
      });

      if (!memberLine) continue;

      const position = memberLine.split(",").slice(-1)[0]?.trim() || "Tracked";
      records.push({
        billTitle: measureTitleMatch?.[1] || questionMatch?.[1] || "Recent Senate vote",
        stance: mapVotePositionToStance(position),
        note: `${position} on ${dateMatch?.[1] || "recent Senate roll call"} via U.S. Senate`,
      });

      if (records.length >= 5) break;
    }

    return records;
  } catch (error: any) {
    console.error("Senate voting record error:", error.message);
    return [];
  }
}

async function enrichRepresentativeWithOfficialVoting(rep: any, officeName: string, congressApiKey?: string) {
  if (!/u\.s\. senator|senator|u\.s\. representative|representative/i.test(officeName)) {
    return { ...rep, votingRecord: [] };
  }

  refreshRuntimeEnv();
  const congressKey = congressApiKey || process.env.CONGRESS_GOV_API_KEY;

  const isSenate = /senator/i.test(officeName);
  let votingRecord = isSenate
    ? await fetchSenateVotingRecord(rep.name || "")
    : await fetchHouseVotingRecord(rep.name || "");

  if (votingRecord.length === 0 && rep.bioguideId && congressKey) {
    votingRecord = await fetchCongressGovSponsoredActivitySnapshot(rep.bioguideId, congressKey);
  }

  return {
    ...rep,
    votingRecord,
  };
}

async function mapCivicResponseToRepresentatives(data: any): Promise<any[]> {
  const offices = data?.offices || [];
  const officials = data?.officials || [];
  const federalOffices = offices.filter((office: any) => /u\.s\.\s+senator|u\.s\.\s+representative/i.test(office.name || ""));

  const mapped = await Promise.all(
    federalOffices.flatMap((office: any) =>
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
        return enrichRepresentativeWithOfficialVoting(representative, office.name);
      })
    )
  );

  return mapped.filter(Boolean);
}

async function fetchRepresentativesByAddress(address: string) {
  refreshRuntimeEnv();
  const civicKey = process.env.GOOGLE_CIVIC_API_KEY;
  const congressKey = process.env.CONGRESS_GOV_API_KEY || "DEMO_KEY";
  if (!process.env.CONGRESS_GOV_API_KEY) {
    console.warn(
      "[representatives] CONGRESS_GOV_API_KEY is not set; using Congress.gov DEMO_KEY (low rate limits). Add CONGRESS_GOV_API_KEY to .env.local for reliable lookups.",
    );
  }

  if (civicKey) {
    try {
      const response = await axios.get("https://www.googleapis.com/civicinfo/v2/representatives", {
        params: {
          address,
          includeOffices: true,
          key: civicKey,
        },
        timeout: 6000,
      });
      const mapped = await mapCivicResponseToRepresentatives(response.data);
      if (mapped.length > 0) return mapped;
    } catch (error: any) {
      console.error("Google Civic API Error:", error.message);
    }
  }

  try {
    const fallback = await fetchRepresentativesViaCongressGov(address, congressKey);
    if (fallback.length > 0) return fallback;
  } catch (error: any) {
    console.error("Congress.gov representative fallback error:", error.message);
  }

  return [];
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
  const languageCode = normalizeLanguageCode(targetLanguage);
  if (!process.env.GEMINI_API_KEY || languageCode === "en") {
    return texts;
  }
  const languageLabel = getLanguageLabel(languageCode);
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{
        parts: [{
          text: `Translate each item in this JSON array into ${languageLabel}. Return JSON only. Input: ${JSON.stringify(texts)}`,
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
      const openStatesApiKey = process.env.OPENSTATES_API_KEY;
      const legiscanApiKey = process.env.LEGISCAN_API_KEY;
      const state = String(req.query.state || "").trim();
      if (!openStatesApiKey && !legiscanApiKey) return res.status(500).json({ error: "No state legislation API key configured" });
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

      const [openStatesResult, legiscanResult] = await Promise.allSettled([
        openStatesApiKey ? fetchOpenStatesBills(state, openStatesApiKey) : Promise.resolve([]),
        legiscanApiKey ? fetchLegiScanBills(state, legiscanApiKey) : Promise.resolve([]),
      ]);

      const openStatesBills = openStatesResult.status === "fulfilled" ? openStatesResult.value : [];
      const legiscanBills = legiscanResult.status === "fulfilled" ? legiscanResult.value : [];
      const mergedResults = mergeStateBills(openStatesBills, legiscanBills);

      if (mergedResults.length === 0) {
        throw openStatesResult.status === "rejected"
          ? openStatesResult.reason
          : legiscanResult.status === "rejected"
            ? legiscanResult.reason
            : new Error("No state legislation results returned");
      }

      stateLegislationBackoff.delete(cacheKey);
      stateLegislationCache.set(cacheKey, {
        data: {
          results: mergedResults,
          meta: {
            cached: false,
            rateLimited: false,
            sources: {
              openstates: openStatesBills.length,
              legiscan: legiscanBills.length,
            },
          },
        },
        timestamp: Date.now(),
      });
      res.json({
        results: mergedResults,
        meta: {
          cached: false,
          rateLimited: false,
          sources: {
            openstates: openStatesBills.length,
            legiscan: legiscanBills.length,
          },
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

  app.get("/api/census/state-populations", async (_req, res) => {
    refreshRuntimeEnv();
    const censusKey = process.env.CENSUS_API_KEY;
    if (!censusKey) {
      return res.json({ populations: {} });
    }

    try {
      const response = await axios.get("https://api.census.gov/data/2023/acs/acs5", {
        params: {
          get: "NAME,B01003_001E",
          "for": "state:*",
          key: censusKey,
        },
        timeout: 10000,
      });

      const rows = Array.isArray(response.data) ? response.data : [];
      const [, ...dataRows] = rows;
      const populations = dataRows.reduce((acc: Record<string, number>, row: string[]) => {
        const stateName = row?.[0];
        const population = Number(row?.[1]);
        if (stateName && Number.isFinite(population)) {
          acc[stateName] = population;
        }
        return acc;
      }, {});

      res.json({ populations });
    } catch (error: any) {
      console.error("Census API Error:", error.message);
      res.json({ populations: {} });
    }
  });

  app.post("/api/voice/readaloud", async (req, res) => {
    refreshRuntimeEnv();
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const text = String(req.body?.text || "").trim();
    const language = String(req.body?.language || "English");

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!apiKey) {
      return res.status(503).json({ error: "ELEVENLABS_API_KEY is not configured" });
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_DEFAULT_VOICE_ID}`,
        {
          text,
          model_id: ELEVENLABS_DEFAULT_MODEL_ID,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
          },
          language_code: normalizeLanguageCode(language),
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
          timeout: 20000,
        },
      );

      res.setHeader("Content-Type", "audio/mpeg");
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error("ElevenLabs readaloud error:", error.response?.data || error.message);
      res.status(503).json({ error: "Failed to generate ElevenLabs audio" });
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
    const message = String(req.body?.message || "");
    const userSituation = String(req.body?.userSituation || "");
    if (!ai) return res.json({ reply: "" });
    try {
      const recentHistory = history.slice(-8);
      const conversation = recentHistory
        .map((item: any) => `${item.role === "user" ? "User" : "Assistant"}: ${String(item.text || "")}`)
        .join("\n");
      const relevantContext = rankRelevantLaws(message, context).map((law: any) => ({
        id: law.id,
        title: law.title,
        category: law.category,
        status: law.status,
        level: law.level,
        summary: law.simplifiedSummary,
        impact: law.impact,
      }));
      const reply = await generateAiText(`You are the CulturAct assistant.
Answer the user's latest question directly and specifically.
Do not repeat your generic introduction.
Do not repeat earlier wording unless it is necessary.
If relevant, mention specific law titles and why they matter.
If the question is broad, answer in 2-4 short paragraphs or a short bullet list.
${userSituation ? `The user's situation is: "${userSituation}".` : ""}
Most relevant loaded laws:
${JSON.stringify(relevantContext)}
Recent conversation:
${conversation}
Latest user question:
${message}
Assistant response:`);
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

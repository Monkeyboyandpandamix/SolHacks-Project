import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

dotenv.config();

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

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
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
        params: { api_key: apiKey, format: "json", limit: 10, sort: "updateDate+desc" },
        timeout: 5000,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Congress.gov API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch federal legislation" });
    }
  });

  app.get("/api/legislation/state", async (req, res) => {
    try {
      const apiKey = process.env.OPENSTATES_API_KEY;
      const { state } = req.query;
      if (!apiKey) return res.status(500).json({ error: "OPENSTATES_API_KEY not configured" });
      if (!state) return res.status(400).json({ error: "State parameter is required" });

      const response = await axios.get("https://v3.openstates.org/bills", {
        params: { jurisdiction: state, sort: "updated_desc", per_page: 10, apikey: apiKey },
        timeout: 5000,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Open States API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch state legislation" });
    }
  });

  app.get("/api/legislation/documents", async (_req, res) => {
    try {
      const apiKey = process.env.GOVINFO_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GOVINFO_API_KEY not configured" });

      const response = await axios.get("https://api.govinfo.gov/packages", {
        params: {
          api_key: apiKey,
          pageSize: 10,
          lastModifiedStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        timeout: 5000,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("GovInfo API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch government documents" });
    }
  });

  app.get("/api/legislation/scrape", async (req, res) => {
    const { state, city } = req.query;
    try {
      const results: any[] = [];

      if (state === "California" || state === "CA") {
        try {
          const response = await axios.get("https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB1", { timeout: 5000 });
          const $ = cheerio.load(response.data);
          results.push({
            id: "CA-AB1",
            title: $("h1").text().trim() || "California Assembly Bill 1",
            summary: $("#bill_summary").text().trim() || "Summary not found on page.",
            level: "state",
            sourceUrl: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB1",
            date: new Date().toLocaleDateString(),
          });
        } catch (e) {
          console.error("CA Scraper Error:", e);
        }
      }

      if (city === "San Francisco") {
        const sfUrl = "https://sfbos.org/legislation-introduced-2026";
        try {
          const response = await axios.get(sfUrl, { timeout: 5000 });
          const $ = cheerio.load(response.data);
          $(".views-row, .node").slice(0, 5).each((i, el) => {
            const title = $(el).find("a").first().text().trim();
            const link = $(el).find("a").first().attr("href");
            if (title) {
              results.push({
                id: `SF-${i}`,
                title,
                summary: "Scraped from SF Board of Supervisors",
                level: "city",
                sourceUrl: link ? (link.startsWith("http") ? link : `https://sfbos.org${link}`) : sfUrl,
                date: new Date().toLocaleDateString(),
              });
            }
          });
        } catch (e) {
          console.error("SF Scraper Error:", e);
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Scraper Error:", error.message);
      res.status(500).json({ error: "Failed to scrape legislation" });
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

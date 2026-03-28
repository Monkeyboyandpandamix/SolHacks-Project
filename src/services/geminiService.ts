import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import axios from "axios";
import {
  ChatMessage,
  ConflictAnalysis,
  HearingEvent,
  Law,
  Representative,
  RepresentativeVoteRecord,
} from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

const stateCodes: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

const glossaryByCategory: Record<string, { term: string; definition: string }[]> = {
  housing: [
    { term: "ordinance", definition: "A local law passed by a city or county government." },
    { term: "rent stabilization", definition: "Rules that limit how quickly rent can increase." },
    { term: "tenant protections", definition: "Laws that give renters rights against unfair treatment." },
  ],
  labor: [
    { term: "minimum wage", definition: "The lowest hourly pay an employer can legally offer." },
    { term: "overtime", definition: "Extra pay owed when work hours go above a legal threshold." },
    { term: "compliance", definition: "Following the rules required by law." },
  ],
  education: [
    { term: "appropriation", definition: "Government money officially set aside for a purpose." },
    { term: "eligibility", definition: "The conditions someone must meet to qualify." },
    { term: "implementation", definition: "The process of putting a law or policy into effect." },
  ],
  health: [
    { term: "benefits coverage", definition: "The medical services or costs a plan agrees to pay for." },
    { term: "eligibility", definition: "The standards a person must meet to receive a benefit." },
    { term: "provider network", definition: "The doctors and hospitals approved by an insurance plan." },
  ],
  taxes: [
    { term: "levy", definition: "A tax or fee charged by the government." },
    { term: "revenue", definition: "Money the government collects." },
    { term: "appropriation", definition: "Government money assigned to a specific use." },
  ],
};

function inferCategory(title: string, summary: string) {
  const haystack = `${title} ${summary}`.toLowerCase();
  if (/(rent|tenant|housing|zoning|homeless)/.test(haystack)) return "Housing";
  if (/(wage|worker|employment|labor|union|leave)/.test(haystack)) return "Labor";
  if (/(school|student|teacher|college|education)/.test(haystack)) return "Education";
  if (/(health|medical|insurance|medicaid|mental health)/.test(haystack)) return "Health";
  if (/(immigration|migrant|visa|citizen)/.test(haystack)) return "Immigration";
  if (/(climate|water|emission|environment|energy)/.test(haystack)) return "Environment";
  if (/(tax|budget|revenue|appropriation)/.test(haystack)) return "Taxes";
  return "Civic";
}

function inferStatus(value?: string): Law["status"] {
  const text = (value || "").toLowerCase();
  if (/(pass|enact|became law|signed)/.test(text)) return "passed";
  if (/(reject|failed|veto)/.test(text)) return "rejected";
  if (/(update|amend|referred|committee)/.test(text)) return "updated";
  return "proposed";
}

function buildTimeline(date: string, status: Law["status"]): Law["timeline"] {
  const base = [
    { stage: "introduced" as const, date, description: "Legislation was introduced." },
    { stage: "committee" as const, date, description: "Assigned for committee review." },
  ];
  if (status === "proposed" || status === "updated") {
    return [...base, { stage: "voting" as const, date, description: "Awaiting or moving through floor voting." }];
  }
  if (status === "passed") {
    return [
      ...base,
      { stage: "voting" as const, date, description: "Approved during floor action." },
      { stage: "passed" as const, date, description: "Legislation passed its chamber." },
      { stage: "law" as const, date, description: "Measure is now in force or pending final enactment." },
    ];
  }
  return [...base, { stage: "rejected" as const, date, description: "The measure did not advance." }];
}

function buildGlossary(category: string) {
  return glossaryByCategory[category.toLowerCase()] || [
    { term: "bill", definition: "A proposed law that has not fully taken effect yet." },
    { term: "committee", definition: "A smaller legislative group that studies a proposal in detail." },
    { term: "implementation", definition: "The process of putting a law into action." },
  ];
}

function computeVelocityScore(status: Law["status"], timeline?: Law["timeline"], votes?: Law["votes"]) {
  const base = status === "passed" ? 92 : status === "updated" ? 68 : status === "rejected" ? 25 : 55;
  const stageBoost = Math.min((timeline?.length || 0) * 6, 24);
  const sentimentBoost = votes ? Math.min(Math.max(votes.support - votes.oppose, 0), 18) : 0;
  return Math.min(99, base + stageBoost + sentimentBoost);
}

function buildHearings(law: Partial<Law>, city: string): HearingEvent[] {
  const date = law.date || new Date().toLocaleDateString();
  return [{
    id: `${law.id}-hearing`,
    title: `${law.title} Public Hearing`,
    date,
    venue: `${city} Civic Center`,
    type: "hearing",
    registrationUrl: law.sourceUrl,
  }];
}

function buildAdvocacyGroups(category: string) {
  const normalized = category.toLowerCase();
  return [
    {
      id: `${normalized}-1`,
      name: `${category} Action Coalition`,
      mission: `Tracks ${normalized} legislation and mobilizes public testimony.`,
      website: "https://www.usa.gov",
    },
    {
      id: `${normalized}-2`,
      name: `Community ${category} Network`,
      mission: `Helps residents understand how ${normalized} policy changes affect daily life.`,
      website: "https://www.communitycatalyst.org",
    },
  ];
}

function createLawFromRaw(input: Partial<Law> & { id: string; title: string; summary?: string }, state: string, city: string): Law {
  const category = input.category || inferCategory(input.title, input.summary || input.simplifiedSummary || input.originalText || "");
  const status = input.status || inferStatus(input.originalText || input.summary);
  const timeline = input.timeline || buildTimeline(input.date || new Date().toLocaleDateString(), status);
  const votes = input.votes || {
    support: Math.floor(Math.random() * 60) + 20,
    oppose: Math.floor(Math.random() * 25) + 5,
  };

  const law: Law = {
    id: input.id,
    title: input.title,
    originalText: input.originalText || input.summary || "Official summary unavailable. Review the source link for the full text.",
    simplifiedSummary: input.simplifiedSummary || input.summary || `${input.title} is a ${status} measure relevant to residents of ${city}, ${state}. It has been added to your feed based on its likely impact. Open the source to review the official language.`,
    impact: input.impact || `This ${category.toLowerCase()} measure may affect costs, services, or obligations for people living in ${city}. Monitor status changes and hearing notices if it matches your priorities.`,
    category,
    level: input.level || "state",
    status,
    location: { state, city },
    date: input.date || new Date().toLocaleDateString(),
    votes,
    comments: input.comments || [],
    sourceUrl: input.sourceUrl,
    timeline,
    glossary: input.glossary || buildGlossary(category),
    personalImpact: input.personalImpact || input.impact,
    hearings: input.hearings || buildHearings(input, city),
    advocacyGroups: input.advocacyGroups || buildAdvocacyGroups(category),
    impactStories: input.impactStories || [],
  };
  law.velocityScore = input.velocityScore || computeVelocityScore(law.status, law.timeline, law.votes);
  return law;
}

function fallbackFromRawData(rawData: any, state: string, city: string): Law[] {
  const laws: Law[] = [];
  const federalBills = rawData.federal?.bills || rawData.federal?.items || [];
  const stateBills = rawData.state?.results || rawData.state?.bills || [];
  const documents = rawData.documents?.packages || rawData.documents?.results || [];
  const scraped = Array.isArray(rawData.scraped) ? rawData.scraped : [];

  federalBills.slice(0, 3).forEach((bill: any, index: number) => {
    laws.push(createLawFromRaw({
      id: bill.number || bill.billNumber || `FED-${index}`,
      title: bill.title || bill.shortTitle || "Federal legislation update",
      summary: bill.latestAction?.text || bill.summary?.text || "Recent federal legislation update.",
      level: "federal",
      date: bill.updateDate || bill.latestAction?.actionDate,
      sourceUrl: bill.url,
      status: inferStatus(bill.latestAction?.text),
    }, state, city));
  });

  stateBills.slice(0, 3).forEach((bill: any, index: number) => {
    laws.push(createLawFromRaw({
      id: bill.identifier || bill.id || `STATE-${index}`,
      title: bill.title || bill.identifier || "State legislation update",
      summary: bill.abstracts?.[0]?.abstract || bill.extras?._summary || "Recent state legislation update.",
      level: "state",
      date: bill.updatedAt || bill.createdAt,
      sourceUrl: bill.sources?.[0]?.url || bill.openstatesUrl,
      status: inferStatus(bill.classification?.join(" ") || bill.latestActionDescription),
    }, state, city));
  });

  documents.slice(0, 2).forEach((doc: any, index: number) => {
    laws.push(createLawFromRaw({
      id: doc.packageId || `DOC-${index}`,
      title: doc.title || doc.collectionName || "Government document",
      summary: doc.summary || "Government publication relevant to current policy.",
      level: "federal",
      date: doc.lastModified || doc.dateIssued,
      sourceUrl: doc.packageLink,
      status: "updated",
    }, state, city));
  });

  scraped.slice(0, 3).forEach((item: any, index: number) => {
    laws.push(createLawFromRaw({
      id: item.id || `SCRAPE-${index}`,
      title: item.title || "Local legislative item",
      summary: item.summary || "Local legislative activity update.",
      level: item.level || "city",
      date: item.date,
      sourceUrl: item.sourceUrl,
      status: "updated",
    }, state, city));
  });

  return laws;
}

function enrichLaws(laws: Law[], state: string, city: string): Law[] {
  return laws.map((law, index) => {
    const related = laws
      .filter(candidate => candidate.id !== law.id && (candidate.category === law.category || candidate.level === law.level))
      .slice(0, 3)
      .map(candidate => candidate.id);
    return {
      ...createLawFromRaw(law, state, city),
      relatedLawIds: related,
      velocityScore: law.velocityScore || computeVelocityScore(law.status, law.timeline, law.votes),
      poll: law.poll ? {
        ...law.poll,
        options: law.poll.options.map((opt: any) => ({ ...opt, count: typeof opt.count === "number" ? opt.count : Math.floor(Math.random() * 50) })),
      } : index % 2 === 0 ? {
        question: `Do you support the direction of ${law.title}?`,
        options: [
          { label: "Support", count: Math.floor(Math.random() * 50) + 20 },
          { label: "Need changes", count: Math.floor(Math.random() * 30) + 10 },
          { label: "Oppose", count: Math.floor(Math.random() * 20) + 5 },
        ],
      } : undefined,
    };
  });
}

async function translateBatch(texts: string[], targetLanguage: string) {
  if (targetLanguage === "English" || texts.length === 0) return texts;
  try {
    const response = await axios.post("/api/ai/translate-batch", { texts, targetLanguage });
    return Array.isArray(response.data?.translations) ? response.data.translations : texts;
  } catch {
    return texts;
  }
}

async function applyTranslationToLaws(laws: Law[], targetLanguage: string): Promise<Law[]> {
  if (targetLanguage === "English" || laws.length === 0) return laws;
  const translated = await Promise.all(laws.map(async (law) => {
    const glossaryDefinitions = (law.glossary || []).map(item => item.definition);
    const fields = [
      law.simplifiedSummary,
      law.impact,
      law.personalImpact || law.impact,
      ...glossaryDefinitions,
    ];
    const translations = await translateBatch(fields, targetLanguage);
    const glossary = (law.glossary || []).map((item, index) => ({
      ...item,
      definition: translations[index + 3] || item.definition,
    }));
    return {
      ...law,
      simplifiedSummary: translations[0] || law.simplifiedSummary,
      impact: translations[1] || law.impact,
      personalImpact: translations[2] || law.personalImpact,
      glossary,
    };
  }));
  return translated;
}

export async function fetchLaws(state: string, city: string, language: string = "English", userSituation?: string): Promise<Law[]> {
  const model = "gemini-3-flash-preview";
  const stateCode = stateCodes[state] || state;

  const rawData: any = { federal: null, state: null, documents: null, scraped: null };

  try {
    const [fedRes, stateRes, docRes, scrapeRes] = await Promise.allSettled([
      axios.get("/api/legislation/federal"),
      axios.get(`/api/legislation/state?state=${stateCode}`),
      axios.get("/api/legislation/documents"),
      axios.get(`/api/legislation/scrape?state=${state}&city=${city}`),
    ]);

    if (fedRes.status === "fulfilled") rawData.federal = fedRes.value.data;
    if (stateRes.status === "fulfilled") rawData.state = stateRes.value.data;
    if (docRes.status === "fulfilled") rawData.documents = docRes.value.data;
    if (scrapeRes.status === "fulfilled") rawData.scraped = scrapeRes.value.data;
  } catch (e) {
    console.warn("External API fetch partially failed, falling back to Gemini search for missing parts", e);
  }

  if (!hasGeminiKey) {
    return applyTranslationToLaws(enrichLaws(fallbackFromRawData(rawData, state, city), state, city), language);
  }

  const prompt = `You are a civic information expert. I need to present recent or significant laws, bills, or local ordinances that affect daily life for a resident of ${city}, ${state}.
  ${userSituation ? `The user's situation is: "${userSituation}". Prioritize laws that are highly relevant to this specific context.` : ""}
  I have gathered specific raw data from official sources and web scrapers:
  Federal (Congress.gov): ${JSON.stringify(rawData.federal)}
  State (Open States): ${JSON.stringify(rawData.state)}
  Documents (GovInfo): ${JSON.stringify(rawData.documents)}
  Scraped Local/State Data: ${JSON.stringify(rawData.scraped)}
  CRITICAL:
  1. If raw data is provided, use it as the primary source.
  2. If raw data is missing or insufficient, use your Google Search tool to find the most recent and relevant laws for ${city}, ${state}.
  3. You MUST return at least 5-8 laws. If you cannot find enough specific local ordinances, include relevant state or federal laws that impact residents of ${city}.
  4. Ensure the laws are diverse (Housing, Labor, Education, etc.).`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
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
            required: ["id", "title", "originalText", "simplifiedSummary", "impact", "category", "level", "status", "date"],
          },
        },
      },
    });
    const laws = JSON.parse(response.text || "[]");
    return applyTranslationToLaws(enrichLaws(laws, state, city), language);
  } catch (e) {
    console.error("Failed to fetch or parse laws", e);
    return applyTranslationToLaws(enrichLaws(fallbackFromRawData(rawData, state, city), state, city), language);
  }
}

export async function generateAdvocacyLetter(law: Law, stance: "support" | "oppose", userSituation?: string): Promise<string> {
  if (!hasGeminiKey) {
    return `The Honorable [Representative Name],\n\nI am writing to ${stance === "support" ? "support" : "oppose"} ${law.title}. ${userSituation ? `${userSituation}. ` : ""}${law.impact}\n\nThank you for your attention to this issue.\n\nSincerely,\n[Your Name]`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Draft a professional advocacy letter.
    Law Title: ${law.title}
    Position: ${stance}
    ${userSituation ? `User context: ${userSituation}` : ""}
    Return only the completed letter.`,
  });
  return response.text || "Failed to generate letter. Please try again.";
}

export async function chatWithLawyer(history: ChatMessage[], message: string, context: Law[], userSituation?: string): Promise<string> {
  const normalizedHistory = history.length > 0 && history[history.length - 1]?.role === "user" && history[history.length - 1]?.text === message
    ? history
    : [...history, { role: "user", text: message }];
  const conversation = normalizedHistory.map(item => `${item.role === "user" ? "User" : "Assistant"}: ${item.text}`).join("\n");

  if (!hasGeminiKey) {
    return `Based on the laws currently loaded, compare status, jurisdiction, and who is affected. ${userSituation ? `Given your situation, focus on eligibility, costs, and deadlines. ` : ""}Ask about one law at a time for the clearest answer.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI Civic Assistant.
    ${userSituation ? `The user's situation is: "${userSituation}".` : ""}
    Use these laws as context: ${JSON.stringify(context.map(l => ({ id: l.id, title: l.title, summary: l.simplifiedSummary, impact: l.impact, status: l.status })))}.
    Conversation so far:
    ${conversation}
    Assistant:`,
  });

  return response.text || "I'm sorry, I couldn't process that request.";
}

export async function translateContent(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === "English") return text;
  try {
    const response = await axios.post("/api/ai/translate", { text, targetLanguage });
    return response.data?.translation || text;
  } catch {
    return text;
  }
}

export async function compareLawsWithAI(law1: Law, law2: Law): Promise<string> {
  const prompt = `Compare the following two laws and provide a concise analysis of their key differences, potential conflicts, and unique impacts.
  Law 1: ${law1.title}
  Summary 1: ${law1.simplifiedSummary}
  Impact 1: ${law1.impact}
  Law 2: ${law2.title}
  Summary 2: ${law2.simplifiedSummary}
  Impact 2: ${law2.impact}`;

  if (!hasGeminiKey) {
    return `${law1.title} and ${law2.title} affect ${law1.category === law2.category ? law1.category.toLowerCase() : "related policy areas"}, but they differ in scope, status, and jurisdiction. Compare implementation dates, who is covered, and whether one expands or limits obligations created by the other.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  return response.text || "Unable to generate comparative analysis at this time.";
}

export async function detectConflictBetweenLaws(law1: Law, law2: Law): Promise<ConflictAnalysis> {
  if (!hasGeminiKey) {
    const overlaps = [law1.category, law1.level, law2.level].filter(Boolean);
    const risk: ConflictAnalysis["risk"] =
      law1.category === law2.category && law1.status !== law2.status ? "medium" :
      law1.level !== law2.level && law1.category === law2.category ? "high" :
      "low";
    return {
      risk,
      overlaps,
      summary: risk === "high"
        ? "These laws cover similar issues at different government levels, so residents may face overlapping or conflicting compliance requirements."
        : risk === "medium"
        ? "These laws overlap in policy area, but the conflict appears manageable if timelines and coverage are reviewed carefully."
        : "These laws appear more complementary than conflicting based on their current scope and status.",
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Assess whether these two laws conflict. Return JSON with keys risk, summary, overlaps. Law 1: ${law1.title} ${law1.simplifiedSummary}. Law 2: ${law2.title} ${law2.simplifiedSummary}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          risk: { type: Type.STRING, enum: ["low", "medium", "high"] },
          summary: { type: Type.STRING },
          overlaps: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["risk", "summary", "overlaps"],
      },
    },
  });

  return JSON.parse(response.text || '{"risk":"low","summary":"No clear conflict detected.","overlaps":[]}');
}

export async function moderateComment(text: string): Promise<{ approved: boolean; reason?: string }> {
  const bannedPatterns = /(kill|hate|idiot|stupid|terrorist|slur)/i;
  if (bannedPatterns.test(text)) {
    return { approved: false, reason: "Comment held for civility review. Please remove hostile or harmful language." };
  }
  return { approved: true };
}

function fallbackVotingRecord(laws: Law[], stance: RepresentativeVoteRecord["stance"]): RepresentativeVoteRecord[] {
  return laws.slice(0, 3).map(law => ({
    billTitle: law.title,
    stance,
    note: `Tracking ${law.category.toLowerCase()} implications for constituents.`,
  }));
}

export function getRepresentativesForLocation(state: string, laws: Law[]): Representative[] {
  const topBills = laws.slice(0, 3).map(law => law.id);
  const byState: Record<string, Representative[]> = {
    California: [
      {
        id: "ca-sen-padilla",
        name: "Alex Padilla",
        office: "U.S. Senator",
        party: "Democrat",
        photoUrl: "https://www.congress.gov/img/member/p000145_200.jpg",
        emails: ["https://www.padilla.senate.gov/contact/contact-form/"],
        phones: ["(202) 224-3553"],
        urls: ["https://www.padilla.senate.gov"],
        channels: [{ type: "Twitter", id: "AlexPadilla4CA" }],
        sponsoredBills: topBills,
        votingRecord: fallbackVotingRecord(laws, "support"),
      },
    ],
    "North Carolina": [
      {
        id: "nc-sen-tillis",
        name: "Thom Tillis",
        office: "U.S. Senator",
        party: "Republican",
        photoUrl: "https://www.congress.gov/img/member/t000476_200.jpg",
        emails: ["contact@tillis.senate.gov"],
        phones: ["(202) 224-6342"],
        urls: ["https://www.tillis.senate.gov"],
        channels: [{ type: "Twitter", id: "SenThomTillis" }],
        sponsoredBills: topBills,
        votingRecord: fallbackVotingRecord(laws, "watching"),
      },
    ],
  };
  return byState[state] || [{
    id: `${state.toLowerCase().replace(/\s+/g, "-")}-rep-1`,
    name: `${state} Civic Office`,
    office: "State Legislative Contact",
    party: "Nonpartisan",
    urls: ["https://www.usa.gov/elected-officials"],
    sponsoredBills: topBills,
    votingRecord: fallbackVotingRecord(laws, "watching"),
  }];
}

export async function fetchRepresentativesForAddress(address: string, state: string, laws: Law[]): Promise<Representative[]> {
  try {
    const response = await axios.get("/api/civic/representatives", { params: { address } });
    return Array.isArray(response.data?.representatives) && response.data.representatives.length > 0
      ? response.data.representatives
      : getRepresentativesForLocation(state, laws);
  } catch {
    return getRepresentativesForLocation(state, laws);
  }
}

export async function fetchHearingsForLocation(state: string, city: string): Promise<HearingEvent[]> {
  try {
    const response = await axios.get("/api/hearings", { params: { state, city } });
    return Array.isArray(response.data?.hearings) ? response.data.hearings : [];
  } catch {
    return [];
  }
}

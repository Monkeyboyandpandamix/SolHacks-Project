import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Law, ChatMessage, ConflictAnalysis, Representative, RepresentativeVoteRecord } from "../types";
import axios from "axios";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

const stateCodes: { [key: string]: string } = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
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
    return [
      ...base,
      { stage: "voting" as const, date, description: "Awaiting or moving through floor voting." },
    ];
  }
  if (status === "passed") {
    return [
      ...base,
      { stage: "voting" as const, date, description: "Approved during floor action." },
      { stage: "passed" as const, date, description: "Legislation passed its chamber." },
      { stage: "law" as const, date, description: "Measure is now in force or pending final enactment." },
    ];
  }
  return [
    ...base,
    { stage: "rejected" as const, date, description: "The measure did not advance." },
  ];
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

function buildHearings(law: Partial<Law>, state: string, city: string) {
  const date = law.date || new Date().toLocaleDateString();
  return [
    {
      id: `${law.id}-hearing`,
      title: `${law.title} Public Hearing`,
      date,
      venue: `${city} Civic Center`,
      type: "hearing" as const,
      registrationUrl: law.sourceUrl,
    },
  ];
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
    hearings: input.hearings || buildHearings(input, state, city),
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

export async function fetchLaws(state: string, city: string, language: string = "English", userSituation?: string): Promise<Law[]> {
  const model = "gemini-3-flash-preview";
  const stateCode = stateCodes[state] || state;

  let rawData: any = {
    federal: null,
    state: null,
    documents: null,
    scraped: null
  };

  // Try to fetch from external APIs and Scraper via backend
  try {
    const [fedRes, stateRes, docRes, scrapeRes] = await Promise.allSettled([
      axios.get("/api/legislation/federal"),
      axios.get(`/api/legislation/state?state=${stateCode}`),
      axios.get("/api/legislation/documents"),
      axios.get(`/api/legislation/scrape?state=${state}&city=${city}`)
    ]);

    if (fedRes.status === "fulfilled") rawData.federal = fedRes.value.data;
    if (stateRes.status === "fulfilled") rawData.state = stateRes.value.data;
    if (docRes.status === "fulfilled") rawData.documents = docRes.value.data;
    if (scrapeRes.status === "fulfilled") rawData.scraped = scrapeRes.value.data;
  } catch (e) {
    console.warn("External API fetch partially failed, falling back to Gemini search for missing parts", e);
  }

  const hasRawData = rawData.federal || rawData.state || rawData.documents || rawData.scraped;

  if (!hasGeminiKey) {
    return enrichLaws(fallbackFromRawData(rawData, state, city), state, city);
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
  4. Ensure the laws are diverse (Housing, Labor, Education, etc.).
  
  For each law, provide:
  1. ID (a unique identifier)
  2. Title
  3. Original complex legal summary (brief)
  4. Simplified summary in ${language} (STRICTLY 3 sentences)
  5. Impact explanation (how it affects a regular person) in ${language}
  6. Personal Impact: If a user situation is provided, explain EXACTLY how this law affects them specifically. If no situation is provided, use a general but detailed impact analysis.
  7. Glossary: Identify 3-5 complex legal terms used in the law and provide clear, simple definitions.
  8. Category (Housing, Labor, Immigration, Education, Health, etc.)
  9. Level (federal, state, county, or city)
  10. Current status (proposed, passed, updated, or rejected)
  11. Date of introduction or update.
  12. Source URL (if provided in raw data, use it; otherwise find the official link).
  13. Timeline: A list of key stages the law has gone through (e.g., introduced, committee, voting, passed).
  14. If the status is 'proposed', generate a simple poll question and 2-3 options.`;

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
                    definition: { type: Type.STRING }
                  }
                }
              },
              category: { type: Type.STRING },
              level: { type: Type.STRING, enum: ["federal", "state", "county", "city"] },
              status: { type: Type.STRING, enum: ["proposed", "passed", "rejected", "updated"] },
              date: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stage: { type: Type.STRING, enum: ["introduced", "committee", "voting", "passed", "law", "rejected"] },
                    date: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              },
              poll: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        count: { type: Type.NUMBER }
                      }
                    }
                  }
                }
              }
            },
            required: ["id", "title", "originalText", "simplifiedSummary", "impact", "category", "level", "status", "date"],
          },
        },
      },
    });

    const laws = JSON.parse(response.text || "[]");
    return enrichLaws(laws, state, city);
  } catch (e) {
    console.error("Failed to fetch or parse laws", e);
    return enrichLaws(fallbackFromRawData(rawData, state, city), state, city);
  }
}

export async function generateAdvocacyLetter(law: Law, stance: 'support' | 'oppose', userSituation?: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  const prompt = `You are a civic engagement assistant. Draft a professional and persuasive advocacy letter to an elected representative.
  
  Law Title: ${law.title}
  User's Stance: ${stance === 'support' ? 'In Support of' : 'Opposed to'} this legislation.
  ${userSituation ? `User's Personal Context: "${userSituation}". Use this to make the letter more personal and compelling.` : ""}
  
  The letter should:
  1. Be addressed to "The Honorable [Representative Name]" (placeholder).
  2. Clearly state the user's position on the law.
  3. Provide 2-3 strong arguments based on the law's content and the user's situation.
  4. Use a respectful but firm tone.
  5. Include placeholders for the user's name and contact information at the end.
  
  Return ONLY the text of the letter.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Failed to generate letter. Please try again.";
  } catch (e) {
    console.error("Failed to generate advocacy letter", e);
    return "Error generating letter. Please check your connection.";
  }
}

export async function chatWithLawyer(history: ChatMessage[], message: string, context: Law[], userSituation?: string): Promise<string> {
  const normalizedHistory = history.length > 0 && history[history.length - 1]?.role === 'user' && history[history.length - 1]?.text === message
    ? history
    : [...history, { role: 'user', text: message }];
  const conversation = normalizedHistory.map(item => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`).join('\n');
  if (!hasGeminiKey) {
    return `Based on the laws currently loaded, the key things to compare are status, jurisdiction, and who is affected. ${userSituation ? `Given your situation, focus on laws that change eligibility, costs, or deadlines for residents like you. ` : ''}If you want a precise answer, ask about one law title at a time.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI Civic Assistant. Your goal is to help users understand laws and legislation.
    ${userSituation ? `The user's situation is: "${userSituation}". Tailor your answers to this specific context.` : ""}
    Use the following laws as context: ${JSON.stringify(context.map(l => ({ id: l.id, title: l.title, summary: l.simplifiedSummary, impact: l.impact, status: l.status }))) }.
    Conversation so far:
    ${conversation}
    Assistant:`,
  });
  return response.text || "I'm sorry, I couldn't process that request.";
}

export async function translateContent(text: string, targetLanguage: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Translate the following text into ${targetLanguage}: "${text}"`,
  });
  return response.text || text;
}

export async function compareLawsWithAI(law1: Law, law2: Law): Promise<string> {
  const model = "gemini-3-flash-preview";
  const prompt = `Compare the following two laws and provide a concise analysis of their key differences, potential conflicts, and unique impacts.
  
  Law 1: ${law1.title}
  Summary 1: ${law1.simplifiedSummary}
  Impact 1: ${law1.impact}
  
  Law 2: ${law2.title}
  Summary 2: ${law2.simplifiedSummary}
  Impact 2: ${law2.impact}
  
  Provide the analysis in a single paragraph, focusing on what a regular citizen needs to know about how these two pieces of legislation differ or interact.`;
  if (!hasGeminiKey) {
    return `${law1.title} and ${law2.title} both affect ${law1.category === law2.category ? law1.category.toLowerCase() : "related policy areas"}, but they differ in scope, status, and jurisdiction. Compare the implementation dates, who is covered, and whether one creates obligations that the other relaxes or expands. Residents should watch for timeline mismatches or conflicting compliance requirements.`;
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
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

export function getRepresentativesForLocation(state: string, laws: Law[]): Representative[] {
  const topBills = laws.slice(0, 3).map(law => law.id);
  const votingRecord = (party: string): RepresentativeVoteRecord[] =>
    laws.slice(0, 3).map(law => ({
      billTitle: law.title,
      stance: party === "Democrat" ? "support" : party === "Republican" ? "watching" : "support",
      note: `Tracking ${law.category.toLowerCase()} implications for constituents.`,
    }));

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
        votingRecord: votingRecord("Democrat"),
      },
      {
        id: "ca-sen-schiff",
        name: "Adam Schiff",
        office: "U.S. Senator",
        party: "Democrat",
        photoUrl: "https://www.congress.gov/img/member/s001150_200.jpg",
        emails: ["https://www.schiff.senate.gov/contact/"],
        phones: ["(202) 224-3841"],
        urls: ["https://www.schiff.senate.gov"],
        channels: [{ type: "Twitter", id: "SenAdamSchiff" }],
        sponsoredBills: topBills,
        votingRecord: votingRecord("Democrat"),
      },
    ],
    Texas: [
      {
        id: "tx-sen-cornyn",
        name: "John Cornyn",
        office: "U.S. Senator",
        party: "Republican",
        photoUrl: "https://www.congress.gov/img/member/c001056_200.jpg",
        phones: ["(202) 224-2934"],
        urls: ["https://www.cornyn.senate.gov"],
        channels: [{ type: "Twitter", id: "JohnCornyn" }],
        sponsoredBills: topBills,
        votingRecord: votingRecord("Republican"),
      },
    ],
    "North Carolina": [
      {
        id: "nc-rep-jackson",
        name: "Jeff Jackson",
        office: "U.S. Representative",
        party: "Democrat",
        photoUrl: "https://www.congress.gov/img/member/j000308_200.jpg",
        emails: ["contact@jackson.house.gov"],
        phones: ["(202) 225-5634"],
        urls: ["https://jeffjackson.house.gov"],
        channels: [{ type: "Twitter", id: "JeffJacksonNC" }],
        sponsoredBills: topBills,
        votingRecord: votingRecord("Democrat"),
      },
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
        votingRecord: votingRecord("Republican"),
      },
    ],
  };

  return byState[state] || [
    {
      id: `${state.toLowerCase().replace(/\s+/g, "-")}-rep-1`,
      name: `${state} Civic Office`,
      office: "State Legislative Contact",
      party: "Nonpartisan",
      urls: ["https://www.usa.gov/elected-officials"],
      sponsoredBills: topBills,
      votingRecord: laws.slice(0, 2).map(law => ({
        billTitle: law.title,
        stance: "watching",
        note: "Official voting data requires an external legislative source.",
      })),
    },
  ];
}

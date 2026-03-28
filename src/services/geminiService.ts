import axios from "axios";
import {
  ChatMessage,
  ConflictAnalysis,
  HearingEvent,
  Law,
  Representative,
  RepresentativeVoteRecord,
} from "../types";

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

function normalizeText(value?: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isValidSourceUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function normalizeSourceUrl(value?: string) {
  if (!value) return value;

  try {
    const url = new URL(value);

    if (url.hostname === "api.congress.gov") {
      const parts = url.pathname.split("/").filter(Boolean);
      const billIndex = parts.indexOf("bill");
      if (billIndex >= 0 && parts.length >= billIndex + 4) {
        const congress = parts[billIndex + 1];
        const billType = parts[billIndex + 2];
        const number = parts[billIndex + 3];
        return `https://www.congress.gov/bill/${congress}th-congress/${billType.toLowerCase()}-bill/${number}`;
      }
      return "https://www.congress.gov";
    }

    return url.toString();
  } catch {
    return value;
  }
}

function inferLevel(input: Partial<Law> & { id?: string; title?: string; sourceUrl?: string }): Law["level"] {
  if (input.level) return input.level;

  const source = (normalizeSourceUrl(input.sourceUrl) || "").toLowerCase();
  const id = (input.id || "").toLowerCase();
  const title = `${input.title || ""} ${input.originalText || ""} ${input.simplifiedSummary || ""}`.toLowerCase();

  if (source.includes("openstates.org") || id.startsWith("ocd-bill/")) return "state";
  if (source.includes("congress.gov") || source.includes("federalregister.gov") || source.includes("govinfo.gov") || /^fed-|^fr-|^doc-/.test(id)) return "federal";
  if (/\bcounty\b|\bcommissioners\b/.test(title)) return "county";
  if (/\bcity\b|\bcouncil\b|\bmunicipal\b|\bordinance\b/.test(title)) return "city";
  return "state";
}

function toPublicCongressUrl(bill: any) {
  const congress = bill.congress || bill.congressNumber;
  const type = (bill.type || bill.billType || "").toLowerCase();
  const number = bill.number || bill.billNumber;

  if (congress && type && number) {
    return `https://www.congress.gov/bill/${congress}th-congress/${type}-bill/${number}`;
  }

  if (typeof bill.url === "string" && bill.url.includes("api.congress.gov")) {
    return undefined;
  }

  return bill.url;
}

function isLikelyPlaceholderLaw(law: Partial<Law>) {
  const title = normalizeText(law.title);
  const summary = normalizeText(law.simplifiedSummary || law.originalText || "");
  return (
    title.includes("policy watch") ||
    title.includes("capitol update") ||
    title.includes("action briefing") ||
    title.includes("ordinance tracker") ||
    summary.includes("being tracked here") ||
    summary.includes("is being surfaced here while upstream bill data is limited")
  );
}

function canonicalLawKey(input: Partial<Law> & { id?: string; title?: string }) {
  const sourcePart = normalizeText(input.sourceUrl);
  if (sourcePart) return `source:${sourcePart}`;

  const idPart = normalizeText(input.id);
  if (idPart && !/^(fed|state|doc|scrape|fr)-\d+$/.test(idPart)) {
    return `id:${idPart}`;
  }

  return `title:${normalizeText(input.title)}|date:${normalizeText(input.date)}|level:${normalizeText(input.level)}`;
}

function preferLongerText(primary?: string, secondary?: string) {
  return (secondary && secondary.length > (primary || "").length) ? secondary : primary;
}

function mergeUniqueStrings(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim()))];
}

function dedupeLaws(laws: Law[], state: string, city: string): Law[] {
  const byKey = new Map<string, Law>();

  for (const current of laws) {
    if (!isValidSourceUrl(current.sourceUrl) || isLikelyPlaceholderLaw(current)) {
      continue;
    }

    const prepared = createLawFromRaw(current as Partial<Law> & { id: string; title: string }, state, city);
    const key = canonicalLawKey(prepared);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, prepared);
      continue;
    }

    const mergedCategory = mergeUniqueStrings([existing.category, prepared.category]).join(" / ") || existing.category;
    const mergedGlossary = [...(existing.glossary || []), ...(prepared.glossary || [])].filter(
      (item, index, list) => list.findIndex((candidate) => normalizeText(candidate.term) === normalizeText(item.term)) === index,
    );
    const mergedTimeline = [...(existing.timeline || []), ...(prepared.timeline || [])].filter(
      (item, index, list) => list.findIndex((candidate) => `${candidate.stage}-${candidate.date}-${candidate.description}` === `${item.stage}-${item.date}-${item.description}`) === index,
    );
    const mergedHearings = [...(existing.hearings || []), ...(prepared.hearings || [])].filter(
      (item, index, list) => list.findIndex((candidate) => candidate.id === item.id || `${candidate.title}-${candidate.date}` === `${item.title}-${item.date}`) === index,
    );
    const mergedAdvocacyGroups = [...(existing.advocacyGroups || []), ...(prepared.advocacyGroups || [])].filter(
      (item, index, list) => list.findIndex((candidate) => normalizeText(candidate.name) === normalizeText(item.name)) === index,
    );
    const mergedImpactStories = [...(existing.impactStories || []), ...(prepared.impactStories || [])].filter(
      (item, index, list) => list.findIndex((candidate) => `${normalizeText(candidate.text)}-${normalizeText(candidate.authorName)}` === `${normalizeText(item.text)}-${normalizeText(item.authorName)}`) === index,
    );

    byKey.set(key, {
      ...existing,
      id: existing.id.length <= prepared.id.length ? existing.id : prepared.id,
      title: preferLongerText(existing.title, prepared.title) || existing.title,
      originalText: preferLongerText(existing.originalText, prepared.originalText) || existing.originalText,
      simplifiedSummary: preferLongerText(existing.simplifiedSummary, prepared.simplifiedSummary) || existing.simplifiedSummary,
      impact: preferLongerText(existing.impact, prepared.impact) || existing.impact,
      personalImpact: preferLongerText(existing.personalImpact, prepared.personalImpact) || existing.personalImpact,
      category: mergedCategory,
      sourceUrl: existing.sourceUrl || prepared.sourceUrl,
      timeline: mergedTimeline,
      glossary: mergedGlossary,
      hearings: mergedHearings,
      advocacyGroups: mergedAdvocacyGroups,
      impactStories: mergedImpactStories,
      relatedLawIds: mergeUniqueStrings([...(existing.relatedLawIds || []), ...(prepared.relatedLawIds || [])]),
      velocityScore: Math.max(existing.velocityScore || 0, prepared.velocityScore || 0),
      votes: {
        support: Math.max(existing.votes?.support || 0, prepared.votes?.support || 0),
        oppose: Math.max(existing.votes?.oppose || 0, prepared.votes?.oppose || 0),
      },
    });
  }

  return [...byKey.values()];
}

export function mergeCanonicalLaws(existingLaws: Law[], incomingLaws: Law[], state: string, city: string): Law[] {
  return dedupeLaws([...existingLaws, ...incomingLaws], state, city);
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
    level: inferLevel(input),
    status,
    location: { state, city },
    date: input.date || new Date().toLocaleDateString(),
    votes,
    comments: input.comments || [],
    sourceUrl: normalizeSourceUrl(input.sourceUrl),
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
  const federalRegisterDocs = rawData.federalRegister?.results || rawData.federalRegister?.documents || [];
  const stateBills = rawData.state?.results || rawData.state?.bills || [];
  const documents = rawData.documents?.packages || rawData.documents?.results || [];
  const scraped = Array.isArray(rawData.scraped) ? rawData.scraped : [];

  federalBills.forEach((bill: any, index: number) => {
    laws.push(createLawFromRaw({
      id: bill.number || bill.billNumber || `FED-${index}`,
      title: bill.title || bill.shortTitle || "Federal legislation update",
      summary: bill.latestAction?.text || bill.summary?.text || "Recent federal legislation update.",
      level: "federal",
      date: bill.updateDate || bill.latestAction?.actionDate,
      sourceUrl: toPublicCongressUrl(bill),
      status: inferStatus(bill.latestAction?.text),
    }, state, city));
  });

  federalRegisterDocs.forEach((doc: any, index: number) => {
    laws.push(createLawFromRaw({
      id: doc.document_number || `FR-${index}`,
      title: doc.title || doc.type || "Federal Register update",
      summary: doc.abstract || doc.summary || "Recent Federal Register publication relevant to civic policy.",
      level: "federal",
      date: doc.publication_date || doc.signing_date,
      sourceUrl: doc.html_url || doc.pdf_url,
      status: "updated",
    }, state, city));
  });

  stateBills.forEach((bill: any, index: number) => {
    const summary =
      bill.abstracts?.[0]?.abstract ||
      bill.extras?._summary ||
      bill.extras?.impact_clause ||
      bill.latest_action_description ||
      "Recent state legislation update.";
    const sourceUrl =
      bill.sources?.[0]?.url ||
      bill.openstatesUrl ||
      bill.openstates_url ||
      bill.sources?.[0]?.link;

    laws.push(createLawFromRaw({
      id: bill.identifier || bill.id || `STATE-${index}`,
      title: bill.title || bill.identifier || "State legislation update",
      summary,
      level: "state",
      date: bill.updatedAt || bill.updated_at || bill.createdAt || bill.created_at,
      sourceUrl,
      status: inferStatus(bill.classification?.join(" ") || bill.latestActionDescription || bill.latest_action_description),
    }, state, city));
  });

  documents.forEach((doc: any, index: number) => {
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

  scraped.forEach((item: any, index: number) => {
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

  return ensureJurisdictionCoverage(laws, state, city);
}

function ensureJurisdictionCoverage(laws: Law[], _state: string, _city: string): Law[] {
  return laws.filter((law) => isValidSourceUrl(law.sourceUrl) && !isLikelyPlaceholderLaw(law));
}

function enrichLaws(laws: Law[], state: string, city: string): Law[] {
  const canonicalLaws = dedupeLaws(ensureJurisdictionCoverage(laws, state, city), state, city);
  return canonicalLaws.map((law, index) => {
    const related = canonicalLaws
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

async function postAi<T>(url: string, payload: unknown): Promise<T | null> {
  try {
    const response = await axios.post(url, payload);
    return response.data as T;
  } catch {
    return null;
  }
}

export async function fetchLaws(
  state: string,
  city: string,
  language: string = "English",
  userSituation?: string,
  primaryInterest: string = "all",
): Promise<{ laws: Law[]; warnings: string[] }> {

  const rawData: any = { federal: null, federalRegister: null, state: null, documents: null, scraped: null };
  const warnings: string[] = [];

  try {
    const [fedRes, federalRegisterRes, stateRes, docRes, scrapeRes] = await Promise.allSettled([
      axios.get("/api/legislation/federal"),
      axios.get("/api/legislation/federal-register"),
      axios.get(`/api/legislation/state?state=${encodeURIComponent(state)}`),
      axios.get("/api/legislation/documents"),
      axios.get(`/api/legislation/scrape?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`),
    ]);

    if (fedRes.status === "fulfilled") rawData.federal = fedRes.value.data;
    if (federalRegisterRes.status === "fulfilled") rawData.federalRegister = federalRegisterRes.value.data;
    if (stateRes.status === "fulfilled") {
      rawData.state = stateRes.value.data;
      if (stateRes.value.data?.meta?.rateLimited) {
        warnings.push(
          stateRes.value.data?.meta?.cached
            ? `State legislation for ${state} is temporarily rate-limited, so cached state results are being used.`
            : `State legislation for ${state} is temporarily rate-limited by OpenStates. Try again in about a minute.`,
        );
      }
    }
    if (docRes.status === "fulfilled") rawData.documents = docRes.value.data;
    if (scrapeRes.status === "fulfilled") rawData.scraped = scrapeRes.value.data;
  } catch (e) {
    console.warn("External API fetch partially failed, falling back to Gemini search for missing parts", e);
  }

  const fallback = enrichLaws(fallbackFromRawData(rawData, state, city), state, city);
  const aiResponse = await postAi<{ laws?: Law[] }>("/api/ai/laws", { state, city, userSituation, primaryInterest, rawData });
  const aiLaws = Array.isArray(aiResponse?.laws) && aiResponse.laws.length > 0 ? enrichLaws(aiResponse.laws, state, city) : fallback;
  const prioritized = [...aiLaws].sort((a, b) => {
    if (primaryInterest === "all") return 0;
    const aMatches = a.category.toLowerCase().includes(primaryInterest.toLowerCase()) ? 1 : 0;
    const bMatches = b.category.toLowerCase().includes(primaryInterest.toLowerCase()) ? 1 : 0;
    return bMatches - aMatches;
  });
  return {
    laws: await applyTranslationToLaws(prioritized, language),
    warnings,
  };
}

export async function generateAdvocacyLetter(law: Law, stance: "support" | "oppose", userSituation?: string): Promise<string> {
  const fallback = `The Honorable [Representative Name],\n\nI am writing to ${stance === "support" ? "support" : "oppose"} ${law.title}. ${userSituation ? `${userSituation}. ` : ""}${law.impact}\n\nThank you for your attention to this issue.\n\nSincerely,\n[Your Name]`;
  const response = await postAi<{ letter?: string }>("/api/ai/advocacy-letter", { law, stance, userSituation });
  return response?.letter || fallback;
}

export async function chatWithLawyer(history: ChatMessage[], message: string, context: Law[], userSituation?: string): Promise<string> {
  const normalizedHistory = history.length > 0 && history[history.length - 1]?.role === "user" && history[history.length - 1]?.text === message
    ? history
    : [...history, { role: "user", text: message }];
  const fallback = `Based on the laws currently loaded, compare status, jurisdiction, and who is affected. ${userSituation ? `Given your situation, focus on eligibility, costs, and deadlines. ` : ""}Ask about one law at a time for the clearest answer.`;
  const response = await postAi<{ reply?: string }>("/api/ai/chat", { history: normalizedHistory, message, context, userSituation });
  return response?.reply || fallback;
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
  const fallback = `${law1.title} and ${law2.title} affect ${law1.category === law2.category ? law1.category.toLowerCase() : "related policy areas"}, but they differ in scope, status, and jurisdiction. Compare implementation dates, who is covered, and whether one expands or limits obligations created by the other.`;
  const response = await postAi<{ analysis?: string }>("/api/ai/compare", { law1, law2 });
  return response?.analysis || fallback;
}

export async function detectConflictBetweenLaws(law1: Law, law2: Law): Promise<ConflictAnalysis> {
  const overlaps = [law1.category, law1.level, law2.level].filter(Boolean);
  const fallback: ConflictAnalysis = {
    risk:
      law1.category === law2.category && law1.status !== law2.status ? "medium" :
      law1.level !== law2.level && law1.category === law2.category ? "high" :
      "low",
    overlaps,
    summary:
      law1.level !== law2.level && law1.category === law2.category
        ? "These laws cover similar issues at different government levels, so residents may face overlapping or conflicting compliance requirements."
        : law1.category === law2.category && law1.status !== law2.status
          ? "These laws overlap in policy area, but the conflict appears manageable if timelines and coverage are reviewed carefully."
          : "These laws appear more complementary than conflicting based on their current scope and status.",
  };
  const response = await postAi<ConflictAnalysis>("/api/ai/conflict", { law1, law2 });
  return response?.risk ? response : fallback;
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

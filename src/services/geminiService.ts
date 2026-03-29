import axios from "axios";
import {
  ChatMessage,
  ConflictAnalysis,
  HearingEvent,
  Law,
  Representative,
} from "../types";
import { getLanguageLabel, normalizeLanguageCode } from "../constants/languages";

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
  immigration: [
    { term: "visa", definition: "Official permission allowing someone to enter, stay, study, or work under certain conditions." },
    { term: "removal proceedings", definition: "A legal process that decides whether someone can remain in the country." },
    { term: "legal aid", definition: "Free or low-cost legal help for people who need assistance." },
  ],
  "language access": [
    { term: "interpreter services", definition: "Language support that helps people communicate in hearings, hospitals, schools, or public offices." },
    { term: "translated materials", definition: "Forms, notices, and guides provided in languages other than English." },
    { term: "limited English proficiency", definition: "A term used when someone cannot easily read, speak, write, or understand English in official settings." },
  ],
  "indigenous rights": [
    { term: "tribal consultation", definition: "A process requiring governments to engage tribes before taking action that may affect them." },
    { term: "sacred site", definition: "A place with spiritual, historical, or ceremonial importance to an Indigenous community." },
    { term: "sovereignty", definition: "The authority of a tribal nation to govern itself and make decisions for its people." },
  ],
  "arts & culture funding": [
    { term: "grant appropriation", definition: "Public funding formally allocated to arts organizations, artists, or cultural institutions." },
    { term: "cultural institution", definition: "An organization such as a museum, theater, archive, or heritage center that preserves or shares culture." },
    { term: "public humanities", definition: "Programs that support history, language, storytelling, and cultural memory in public life." },
  ],
  "racial equity": [
    { term: "disparate impact", definition: "When a rule harms one group more than others even if it appears neutral on paper." },
    { term: "equity assessment", definition: "A review of whether a proposed policy will improve or worsen unequal outcomes." },
    { term: "protected class", definition: "A group protected by anti-discrimination laws." },
  ],
  "religious freedom": [
    { term: "religious accommodation", definition: "A change or exception that allows someone to practice their faith without unfair penalty." },
    { term: "free exercise", definition: "The constitutional protection for practicing religion." },
    { term: "establishment clause", definition: "A constitutional rule limiting government promotion or endorsement of religion." },
  ],
  "lgbtq+ rights": [
    { term: "gender identity", definition: "A person's internal sense of their own gender." },
    { term: "non-discrimination protections", definition: "Rules preventing unfair treatment in jobs, housing, schools, or services." },
    { term: "affirming care", definition: "Medical or supportive care that respects and responds to a person's gender identity." },
  ],
  "voting access": [
    { term: "early voting", definition: "Casting a ballot before the official election day." },
    { term: "voter eligibility", definition: "The rules determining who may legally register and vote." },
    { term: "ballot access", definition: "How easily eligible voters can register, receive, and submit their vote." },
  ],
  "international students": [
    { term: "F-1 status", definition: "A common visa category for international students studying in the United States." },
    { term: "CPT/OPT", definition: "Programs that allow eligible international students to work temporarily under immigration rules." },
    { term: "SEVIS", definition: "The federal system schools use to track and report information about international students." },
  ],
};

function inferCategory(title: string, summary: string) {
  const haystack = `${title} ${summary}`.toLowerCase();
  if (/(immigration|migrant|visa|citizen|daca|deport)/.test(haystack)) return "Immigration";
  if (/(refugee|asylum|resettlement)/.test(haystack)) return "Refugee & Asylum";
  if (/(language|translation|translated|interpreter|multilingual|linguistic|bilingual|language access|english learner|limited english)/.test(haystack)) return "Language Access";
  if (/(tribal|tribe|indigenous|native american|native nation|sacred site|reservation|heritage land)/.test(haystack)) return "Indigenous Rights";
  if (/(art|arts?|culture|museum|library|music|theater|creative|cultural institution|heritage center|humanities|historic preservation)/.test(haystack)) return "Arts & Culture Funding";
  if (/(race|racial|equity|discrimination|bias|civil rights|diversity|inclusion|hate crime|minority)/.test(haystack)) return "Racial Equity";
  if (/(religion|religious|faith|church|mosque|synagogue|temple|worship|chaplain|religious accommodation)/.test(haystack)) return "Religious Freedom";
  if (/(lgbt|lgbtq|queer|gay|transgender|sexual orientation|gender identity|same-sex)/.test(haystack)) return "LGBTQ+ Rights";
  if (/(vote|voting|ballot|election|polling|voter|redistricting)/.test(haystack)) return "Voting Access";
  if (/(international student|student visa|f-1|sevis|optional practical training|curricular practical training)/.test(haystack)) return "International Students";
  if (/(rent|tenant|housing|zoning|homeless)/.test(haystack)) return "Housing";
  if (/(wage|worker|employment|labor|union|leave)/.test(haystack)) return "Labor";
  if (/(school|student|teacher|college|education)/.test(haystack)) return "Education";
  if (/(health|medical|insurance|medicaid|mental health)/.test(haystack)) return "Health";
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

function looksLikeDateOnly(value?: string) {
  const text = (value || "").trim();
  if (!text) return false;
  return /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})$/.test(text);
}

function pickBestNarrativeText(candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    const text = (candidate || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (looksLikeDateOnly(text)) continue;
    if (text.length < 12) continue;
    return text;
  }
  return "";
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
  const normalizedSummary = pickBestNarrativeText([
    input.simplifiedSummary,
    input.summary,
    input.originalText,
    input.impact,
  ]);
  const votes = input.votes || {
    support: Math.floor(Math.random() * 60) + 20,
    oppose: Math.floor(Math.random() * 25) + 5,
  };

  const law: Law = {
    id: input.id,
    title: input.title,
    originalText: pickBestNarrativeText([input.originalText, input.summary]) || "Official summary unavailable. Review the source link for the full text.",
    simplifiedSummary: normalizedSummary || `${input.title} is a ${status} measure relevant to residents of ${city}, ${state}. It has been added to your feed based on its likely impact. Open the source to review the official language.`,
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
      bill.description ||
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
      originalText: bill.description || summary,
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
  const languageCode = normalizeLanguageCode(targetLanguage);
  if (languageCode === "en" || texts.length === 0) return texts;
  try {
    const response = await axios.post("/api/ai/translate-batch", {
      texts,
      targetLanguage: getLanguageLabel(languageCode),
    });
    return Array.isArray(response.data?.translations) ? response.data.translations : texts;
  } catch {
    return texts;
  }
}

async function applyTranslationToLaws(laws: Law[], targetLanguage: string): Promise<Law[]> {
  if (normalizeLanguageCode(targetLanguage) === "en" || laws.length === 0) return laws;
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
  language: string = "en",
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
  const fallback = `I could not get a fresh Gemini response for "${message}". Try asking about one specific law title, status change, or how a bill affects your situation${userSituation ? ` (${userSituation})` : ""}.`;
  const response = await postAi<{ reply?: string }>("/api/ai/chat", { history: normalizedHistory, message, context, userSituation });
  return response?.reply || fallback;
}

export async function translateContent(text: string, targetLanguage: string): Promise<string> {
  const languageCode = normalizeLanguageCode(targetLanguage);
  if (languageCode === "en") return text;
  try {
    const response = await axios.post("/api/ai/translate", {
      text,
      targetLanguage: getLanguageLabel(languageCode),
    });
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

function buildRepresentativeSnapshot(party: string): Representative["votingRecord"] {
  const isDemocrat = /democrat/i.test(party);
  const isRepublican = /republican/i.test(party);

  return [
    {
      billTitle: "Language Access and Public Services",
      stance: isRepublican ? "watching" : "support",
      note: "App-generated civic snapshot used when recent official voting history is unavailable. Indicates likely posture toward translation access, interpreter services, and multilingual public-service support.",
    },
    {
      billTitle: isRepublican ? "Business Regulation and Local Control" : "Arts, Culture, and Community Grants",
      stance: isRepublican ? "support" : "support",
      note: isRepublican
        ? "Fallback civic positioning snapshot based on commonly emphasized Republican priorities such as local control, business flexibility, and reduced regulatory burden."
        : "Fallback civic positioning snapshot based on commonly emphasized Democratic support for public arts funding, cultural institutions, and community grant programs.",
    },
    {
      billTitle: isRepublican ? "Border and Public Safety Enforcement" : "Voting Access and Civil Rights",
      stance: "support",
      note: "App-generated context card, not an official roll-call record. Added so users still get directional context when recent matched voting history is unavailable.",
    },
  ];
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
        votingRecord: buildRepresentativeSnapshot("Democrat"),
        votingRecordSource: "fallback",
      },
      {
        id: "ca-sen-schiff",
        name: "Adam Schiff",
        office: "U.S. Senator",
        party: "Democrat",
        photoUrl: "https://www.congress.gov/img/member/s001150_200.jpg",
        emails: ["https://www.schiff.senate.gov/contact/email-adam/"],
        phones: ["(202) 224-3841"],
        urls: ["https://www.schiff.senate.gov"],
        channels: [{ type: "Twitter", id: "SenAdamSchiff" }],
        sponsoredBills: topBills,
        votingRecord: buildRepresentativeSnapshot("Democrat"),
        votingRecordSource: "fallback",
      },
      {
        id: "ca-house-lookup",
        name: "Find Your U.S. Representative",
        office: "U.S. Representative",
        party: "Lookup Required",
        urls: ["https://www.house.gov/representatives/find-your-representative"],
        sponsoredBills: topBills,
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
        votingRecord: buildRepresentativeSnapshot("Republican"),
        votingRecordSource: "fallback",
      },
      {
        id: "nc-sen-budd",
        name: "Ted Budd",
        office: "U.S. Senator",
        party: "Republican",
        photoUrl: "https://www.congress.gov/img/member/b001305_200.jpg",
        emails: ["https://www.budd.senate.gov/contact/"],
        phones: ["(202) 224-3154"],
        urls: ["https://www.budd.senate.gov"],
        channels: [{ type: "Twitter", id: "SenTedBuddNC" }],
        sponsoredBills: topBills,
        votingRecord: buildRepresentativeSnapshot("Republican"),
        votingRecordSource: "fallback",
      },
      {
        id: "nc-house-lookup",
        name: "Find Your U.S. Representative",
        office: "U.S. Representative",
        party: "Lookup Required",
        urls: ["https://www.house.gov/representatives/find-your-representative"],
        sponsoredBills: topBills,
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
    votingRecord: buildRepresentativeSnapshot("Nonpartisan"),
    votingRecordSource: "fallback",
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

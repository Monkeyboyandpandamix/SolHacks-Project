import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Law, ChatMessage } from "../types";
import axios from "axios";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const stateCodes: { [key: string]: string } = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
};

function toArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function clip(text: string | undefined, max = 240): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function normalizeStatus(text: string | undefined): Law["status"] {
  const value = (text || "").toLowerCase();
  if (value.includes("pass") || value.includes("enact") || value.includes("became law") || value.includes("signed")) return "passed";
  if (value.includes("reject") || value.includes("fail") || value.includes("veto")) return "rejected";
  if (value.includes("update") || value.includes("amend")) return "updated";
  return "proposed";
}

function buildFallbackLaws(rawData: any, state: string, city: string): Law[] {
  const federalBills = toArray(rawData?.federal?.bills).map((bill: any, index: number) => {
    const title = bill.title || `${bill.type || "Bill"} ${bill.number || index + 1}`;
    const latestAction = bill.latestAction?.text || bill.latestAction?.actionDate || "Recent federal legislative activity.";
    const congress = bill.congress ? `Congress ${bill.congress}` : "Federal";
    return {
      id: `federal-${bill.congress || "x"}-${bill.type || "bill"}-${bill.number || index}`,
      title,
      originalText: latestAction,
      simplifiedSummary: clip(`${title}. ${latestAction} This is federal legislation that may affect residents in ${city}, ${state}.`, 280),
      impact: `This is a federal bill with recent activity. Review the source to see whether it changes rules, funding, or protections that affect people in ${city}.`,
      category: "Government",
      level: "federal" as const,
      status: normalizeStatus(bill.latestAction?.text),
      location: { state, city },
      date: bill.updateDate || bill.latestAction?.actionDate || "Recent",
      sourceUrl: bill.url,
      timeline: bill.latestAction?.actionDate ? [{
        stage: "introduced" as const,
        date: bill.latestAction.actionDate,
        description: latestAction,
      }] : undefined,
      votes: { support: 0, oppose: 0 },
      comments: [],
    } satisfies Law;
  });

  const stateBills = toArray(rawData?.state?.results || rawData?.state?.bills).map((bill: any, index: number) => {
    const title = bill.title || bill.identifier || `State Bill ${index + 1}`;
    const summary = bill.abstracts?.[0]?.abstract || bill.extras?._scraped_summary || bill.title || "Recent state legislative activity.";
    const latestAction = bill.latest_action_description || bill.latestAction?.description || bill.latest_action || "Recent state legislative activity.";
    const sourceUrl = bill.openstates_url || bill.sources?.[0]?.url || bill.versions?.[0]?.links?.[0]?.url;
    return {
      id: `state-${bill.identifier || bill.id || index}`,
      title,
      originalText: clip(summary, 400),
      simplifiedSummary: clip(`${title}. ${summary} This is a state-level bill relevant to ${state} residents.`, 280),
      impact: `This is a state bill that could affect services, rights, or requirements for people living in ${state}. Check the source for the latest status and full text.`,
      category: bill.classification?.[0] || "State Policy",
      level: "state" as const,
      status: normalizeStatus(latestAction),
      location: { state, city },
      date: bill.updated_at || bill.latest_action_date || "Recent",
      sourceUrl,
      timeline: latestAction ? [{
        stage: "committee" as const,
        date: bill.latest_action_date || bill.updated_at || "Recent",
        description: latestAction,
      }] : undefined,
      votes: { support: 0, oppose: 0 },
      comments: [],
    } satisfies Law;
  });

  const documents = toArray(rawData?.documents?.packages).map((pkg: any, index: number) => {
    const title = pkg.title || pkg.packageId || `Government Document ${index + 1}`;
    const summary = pkg.summary || pkg.category || "Recent government publication.";
    const link = pkg.detailsLink || pkg.packageLink || pkg.granulesLink || pkg.download?.pdfLink;
    return {
      id: `document-${pkg.packageId || index}`,
      title,
      originalText: summary,
      simplifiedSummary: clip(`${title}. ${summary} This is a recent government document connected to public policy.`, 280),
      impact: `This document may provide policy details, official notices, or legislative background that helps explain recent government actions.`,
      category: "Government Documents",
      level: "federal" as const,
      status: "updated" as const,
      location: { state, city },
      date: pkg.lastModified || pkg.dateIssued || "Recent",
      sourceUrl: link,
      votes: { support: 0, oppose: 0 },
      comments: [],
    } satisfies Law;
  });

  const scraped = toArray(rawData?.scraped).map((item: any, index: number) => ({
    id: item.id || `local-${index}`,
    title: item.title || `Local legislation ${index + 1}`,
    originalText: item.summary || "Recent local legislative activity.",
    simplifiedSummary: clip(`${item.title || `Local legislation ${index + 1}`}. ${item.summary || "Recent local legislative activity."} This appears to affect ${city}, ${state}.`, 280),
    impact: `This is local legislation or a local policy item that may affect residents in ${city}. Review the source page for the current details.`,
    category: "Local Government",
    level: (item.level === "state" ? "state" : item.level === "county" ? "county" : "city") as Law["level"],
    status: "updated" as const,
    location: { state, city },
    date: item.date || "Recent",
    sourceUrl: item.sourceUrl,
    votes: { support: 0, oppose: 0 },
    comments: [],
  }));

  const deduped = [...federalBills, ...stateBills, ...documents, ...scraped]
    .filter((law) => law.title && law.id)
    .filter((law, index, arr) => arr.findIndex((other) => other.title === law.title) === index);

  return deduped;
}

export async function localizeLaws(laws: Law[], targetLanguage: string): Promise<Law[]> {
  if (targetLanguage === "English" || laws.length === 0) {
    return laws;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Translate the following civic law feed content into ${targetLanguage}. Preserve the JSON structure exactly. Translate simplifiedSummary, impact, personalImpact, glossary definitions, poll questions, and poll option labels. Keep law ids, URLs, dates, and status values unchanged. Titles may be translated if natural.\n\n${JSON.stringify(laws)}`,
      config: {
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
                  },
                  userChoice: { type: Type.STRING }
                }
              }
            },
            required: ["id", "title", "originalText", "simplifiedSummary", "impact", "category", "level", "status", "date"]
          }
        }
      }
    });

    const translated = JSON.parse(response.text || "[]");
    return Array.isArray(translated) && translated.length === laws.length ? translated : laws;
  } catch (error) {
    console.warn(`Failed to localize laws into ${targetLanguage}`, error);
    return laws;
  }
}

export async function fetchLaws(state: string, city: string, language: string = "English", userSituation?: string, primaryInterest: string = "all"): Promise<Law[]> {
  const model = "gemini-1.5-flash";
  const locationLabel = city?.trim() ? `${city}, ${state}` : state;

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
      axios.get(`/api/legislation/state?state=${encodeURIComponent(state)}`),
      axios.get("/api/legislation/documents"),
      axios.get(`/api/legislation/scrape?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`)
    ]);

    if (fedRes.status === "fulfilled") rawData.federal = fedRes.value.data;
    if (stateRes.status === "fulfilled") rawData.state = stateRes.value.data;
    if (docRes.status === "fulfilled") rawData.documents = docRes.value.data;
    if (scrapeRes.status === "fulfilled") rawData.scraped = scrapeRes.value.data;
  } catch (e) {
    console.warn("External API fetch partially failed, falling back to Gemini search for missing parts", e);
  }

  const hasRawData = rawData.federal || rawData.state || rawData.documents || rawData.scraped;
  const fallbackLaws = buildFallbackLaws(rawData, state, city);

  console.log("fetchLaws raw data summary", {
    location: locationLabel,
    primaryInterest,
    federalCount: Array.isArray(rawData.federal?.bills) ? rawData.federal.bills.length : 0,
    stateCount: Array.isArray(rawData.state?.results) ? rawData.state.results.length : Array.isArray(rawData.state?.bills) ? rawData.state.bills.length : 0,
    documentCount: Array.isArray(rawData.documents?.packages) ? rawData.documents.packages.length : 0,
    scrapedCount: Array.isArray(rawData.scraped) ? rawData.scraped.length : 0,
    fallbackCount: fallbackLaws.length,
  });

  const prompt = `You are a civic information expert. I need to present recent or significant laws, bills, or local ordinances that affect daily life for a resident of ${locationLabel}. 
  
  ${userSituation ? `The user's situation is: "${userSituation}". Prioritize laws that are highly relevant to this specific context.` : ""}
  ${primaryInterest !== "all" ? `The user's primary interest is "${primaryInterest}". Prioritize laws in this area, but still include some broader important state or federal items.` : ""}
  
  I have gathered specific raw data from official sources and optional web scrapers:
  Federal (Congress.gov): ${JSON.stringify(rawData.federal)}
  State (Open States): ${JSON.stringify(rawData.state)}
  Documents (GovInfo): ${JSON.stringify(rawData.documents)}
  Scraped Local/State Data: ${JSON.stringify(rawData.scraped)}
  
  CRITICAL: 
  1. If raw data is provided, use it as the primary source.
  2. Prioritize federal and state legislation for all 50 U.S. states. Local scraped data is optional and may be missing.
  3. If raw data is missing or insufficient, use your Google Search tool to find the most recent and relevant federal and state laws for ${locationLabel}.
  4. You MUST return as many relevant laws as you can, ideally 15-30 items. If you cannot find enough location-specific items, include relevant state or federal laws that impact residents of ${locationLabel}.
  5. Ensure the laws are diverse (Housing, Labor, Education, etc.), but give extra weight to the user's primary interest when provided.
  
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
    if (!Array.isArray(laws) || laws.length === 0) {
      console.warn("Gemini returned no laws, using normalized live fallback", {
        location: locationLabel,
        fallbackCount: fallbackLaws.length,
      });
      return await localizeLaws(fallbackLaws, language);
    }

    console.log("Gemini returned laws", {
      location: locationLabel,
      count: laws.length,
    });
    const normalizedLaws = laws.map((law: any) => ({
      ...law,
      location: { state, city },
      votes: { support: Math.floor(Math.random() * 100), oppose: Math.floor(Math.random() * 50) },
      comments: [],
      poll: law.poll ? {
        ...law.poll,
        options: law.poll.options.map((opt: any) => ({ ...opt, count: Math.floor(Math.random() * 50) }))
      } : undefined
    })).filter((law: Law, index: number, arr: Law[]) => arr.findIndex((other) => other.id === law.id || other.title === law.title) === index);

    if (language !== "English") {
      console.log("Forcing localization for laws", {
        location: locationLabel,
        language,
        count: normalizedLaws.length,
      });
      return await localizeLaws(normalizedLaws, language);
    }

    return normalizedLaws;
  } catch (e) {
    console.error("Failed to fetch or parse laws", e);
    console.warn("Using normalized live fallback after Gemini failure", {
      location: locationLabel,
      fallbackCount: fallbackLaws.length,
    });
    return await localizeLaws(fallbackLaws, language);
  }
}

export async function generateAdvocacyLetter(law: Law, stance: 'support' | 'oppose', userSituation?: string): Promise<string> {
  const model = "gemini-1.5-flash";
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
  const chat = ai.chats.create({
    model: "gemini-1.5-flash",
    config: {
      systemInstruction: `You are an AI Civic Assistant. Your goal is to help users understand laws and legislation. 
      ${userSituation ? `The user's situation is: "${userSituation}". Tailor your answers to this specific context.` : ""}
      Use the following laws as context: ${JSON.stringify(context.map(l => ({ id: l.id, title: l.title, summary: l.simplifiedSummary, impact: l.impact, status: l.status }))) }. 
      Always explain things in simple, plain language. Be helpful, empathetic, and objective. 
      If a user asks about a specific law, refer to it by its title or ID. 
      If you don't know something, suggest where the user can find more information.`,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text || "I'm sorry, I couldn't process that request.";
}

export async function translateContent(text: string, targetLanguage: string): Promise<string> {
  const model = "gemini-1.5-flash";
  const response = await ai.models.generateContent({
    model,
    contents: `Translate the following text into ${targetLanguage}: "${text}"`,
  });
  return response.text || text;
}

export async function compareLawsWithAI(law1: Law, law2: Law): Promise<string> {
  const model = "gemini-1.5-flash";
  const prompt = `Compare the following two laws and provide a concise analysis of their key differences, potential conflicts, and unique impacts.
  
  Law 1: ${law1.title}
  Summary 1: ${law1.simplifiedSummary}
  Impact 1: ${law1.impact}
  
  Law 2: ${law2.title}
  Summary 2: ${law2.simplifiedSummary}
  Impact 2: ${law2.impact}
  
  Provide the analysis in a single paragraph, focusing on what a regular citizen needs to know about how these two pieces of legislation differ or interact.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text || "Unable to generate comparative analysis at this time.";
}

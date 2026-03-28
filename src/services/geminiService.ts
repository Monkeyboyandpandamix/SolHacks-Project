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
    return laws.map((law: any) => ({
      ...law,
      location: { state, city },
      votes: { support: Math.floor(Math.random() * 100), oppose: Math.floor(Math.random() * 50) },
      comments: [],
      poll: law.poll ? {
        ...law.poll,
        options: law.poll.options.map((opt: any) => ({ ...opt, count: Math.floor(Math.random() * 50) }))
      } : undefined
    }));
  } catch (e) {
    console.error("Failed to fetch or parse laws", e);
    return [];
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
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
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

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text || "Unable to generate comparative analysis at this time.";
}

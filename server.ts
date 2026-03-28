import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/legislation/federal", async (req, res) => {
    try {
      const apiKey = process.env.CONGRESS_GOV_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "CONGRESS_GOV_API_KEY not configured" });
      }

      const response = await axios.get("https://api.congress.gov/v3/bill", {
        params: {
          api_key: apiKey,
          format: "json",
          limit: 10,
          sort: "updateDate+desc"
        },
        timeout: 5000 // 5 second timeout
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
      
      if (!apiKey) {
        return res.status(500).json({ error: "OPENSTATES_API_KEY not configured" });
      }
      if (!state) {
        return res.status(400).json({ error: "State parameter is required" });
      }

      const response = await axios.get("https://v3.openstates.org/bills", {
        params: {
          jurisdiction: state,
          sort: "updated_desc",
          per_page: 10,
          apikey: apiKey
        },
        timeout: 5000 // 5 second timeout
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Open States API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch state legislation" });
    }
  });

  app.get("/api/legislation/documents", async (req, res) => {
    try {
      const apiKey = process.env.GOVINFO_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GOVINFO_API_KEY not configured" });
      }

      const response = await axios.get("https://api.govinfo.gov/packages", {
        params: {
          api_key: apiKey,
          pageSize: 10,
          lastModifiedStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        timeout: 5000 // 5 second timeout
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("GovInfo API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch government documents" });
    }
  });

  // Web Scraper Route
  app.get("/api/legislation/scrape", async (req, res) => {
    const { state, city } = req.query;
    
    try {
      const results: any[] = [];

      // Example: Scrape California Legislative Information if state is California
      if (state === "California" || state === "CA") {
        try {
          const response = await axios.get("https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB1", {
            timeout: 5000
          });
          const $ = cheerio.load(response.data);
          
          const title = $("h1").text().trim() || "California Assembly Bill 1";
          const summary = $("#bill_summary").text().trim() || "Summary not found on page.";
          
          results.push({
            id: "CA-AB1",
            title,
            summary,
            level: "state",
            sourceUrl: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB1",
            date: new Date().toLocaleDateString()
          });
        } catch (e) {
          console.error("CA Scraper Error:", e);
        }
      }

      // Example: Scrape a generic local news site for city ordinances if city is provided
      if (city === "San Francisco") {
        const sfUrl = "https://sfbos.org/legislation";
        try {
          const response = await axios.get(sfUrl, { timeout: 5000 });
          const $ = cheerio.load(response.data);
          
          $(".views-row").slice(0, 5).each((i, el) => {
            const title = $(el).find(".views-field-title").text().trim();
            const link = $(el).find("a").attr("href");
            if (title) {
              results.push({
                id: `SF-${i}`,
                title,
                summary: "Scraped from SF Board of Supervisors",
                level: "city",
                sourceUrl: link ? (link.startsWith("http") ? link : `https://sfbos.org${link}`) : sfUrl,
                date: new Date().toLocaleDateString()
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

  // Location Suggestion Route
  app.get("/api/location/suggest", async (req, res) => {
    const { query, state } = req.query;
    if (!query || !state) {
      return res.json([]);
    }

    try {
      // Use Gemini to suggest real cities/counties in the given state based on the query
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `List 5 real cities or counties in ${state} that start with or contain "${query}". Return only a JSON array of strings, nothing else.`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }
      );

      const text = response.data.candidates[0].content.parts[0].text;
      const suggestions = JSON.parse(text);
      res.json(Array.isArray(suggestions) ? suggestions : []);
    } catch (error: any) {
      console.error("Location Suggestion Error:", error.message);
      res.json([]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

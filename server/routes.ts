import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { ingestAllData } from "./ingest";

// Initialize data on first import
let dataReady = false;
let dataPromise: Promise<void> | null = null;

function ensureDataReady(): Promise<void> {
  if (dataReady) return Promise.resolve();
  if (!dataPromise) {
    dataPromise = ingestAllData().then((result) => {
      console.log(`Data ready: ${result.laws} laws, ${result.chunks} chunks`);
      dataReady = true;
    });
  }
  return dataPromise;
}

function getVisitorId(req: Request): string {
  return req.headers["x-visitor-id"] as string || "anonymous-" + Date.now();
}

const SYSTEM_PROMPT = `You are a Lebanese legal research assistant named Case Map.

STRICT RULES:
1. Answer ONLY from the provided source chunks below. Do not use any external knowledge.
2. Every legal proposition MUST cite the source using the exact citation label provided.
3. If the answer is not supported by the provided sources, say: "Not found in provided sources."
4. Never invent or fabricate law numbers, article numbers, or legal provisions.
5. Cite sources using this format: [Citation Label]
6. When case law (court decisions) is available in the sources, cite the court name, decision number, and date.
7. Distinguish between statutory provisions (laws/codes) and judicial decisions (case law/precedents).

ANSWER STRUCTURE:
1. **Issues Identified** — Key legal issues in the question
2. **Applicable Law** — Relevant laws and articles from the sources
3. **Relevant Case Law** — Court decisions and judicial precedents from the sources (if any)
4. **Analysis** — Legal analysis grounded in the cited sources
5. **Vulnerabilities / Procedural Angles** — Potential weaknesses or procedural considerations
6. **Next Steps** — Recommended actions
7. **Citations** — Full list of all cited sources (statutes and case law separately)

If citation verification is requested, include a short quoted excerpt (1-2 sentences) from each cited source under the Citations section.

Respond in the same language as the user's question when possible. If the user writes in Arabic, respond in Arabic. If in French, respond in French. Default to English.`;

export async function registerRoutes(server: Server, app: Express) {
  // Ensure data is loaded
  await ensureDataReady();

  // Get or create profile
  app.get("/api/profile", async (req: Request, res: Response) => {
    const visitorId = getVisitorId(req);
    let profile = await storage.getProfile(visitorId);
    if (!profile) {
      profile = await storage.createProfile({
        visitorId,
        freeQuestionsRemaining: 1,
        subscriptionStatus: "inactive",
      });
    }
    res.json(profile);
  });

  // Stats endpoint
  app.get("/api/stats", async (_req: Request, res: Response) => {
    const chunkCount = await storage.getChunkCount();
    const allLaws = await storage.getAllLaws();
    res.json({ laws: allLaws.length, chunks: chunkCount });
  });

  // Main ask endpoint
  app.post("/api/ask", async (req: Request, res: Response) => {
    const visitorId = getVisitorId(req);
    const { question, lang, citationVerification } = req.body;

    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return res.status(400).json({ error: "Please provide a valid question." });
    }

    // Get or create profile
    let profile = await storage.getProfile(visitorId);
    if (!profile) {
      profile = await storage.createProfile({
        visitorId,
        freeQuestionsRemaining: 1,
        subscriptionStatus: "inactive",
      });
    }

    // Check access
    if (profile.subscriptionStatus !== "active" && profile.freeQuestionsRemaining <= 0) {
      return res.status(403).json({ error: "paywall", message: "Your free question has been used. Subscribe to continue." });
    }

    try {
      // Retrieve relevant chunks
      const chunks = await storage.searchChunks(question, 16);

      if (chunks.length === 0) {
        const answer = "Not found in provided sources. The uploaded legal database does not contain information directly relevant to this query. Please try rephrasing your question or specifying the relevant area of Lebanese law.";

        // Still decrement if not subscribed
        if (profile.subscriptionStatus !== "active") {
          await storage.decrementFreeQuestions(visitorId);
        }

        await storage.insertQuery({
          visitorId,
          question,
          answerMarkdown: answer,
          citationsJson: [],
          sourcesJson: [],
        });

        return res.json({
          answer,
          citations: [],
          sources: [],
        });
      }

      // Build context for the LLM
      const sourceContext = chunks.map((c, i) =>
        `[Source ${i + 1}]\nCitation: ${c.citationLabel}\nCategory: ${c.category || "N/A"}\nSubject: ${c.subject || "N/A"}\nArticle: ${c.articleNumber || "N/A"}\nText: ${c.chunkText}`
      ).join("\n\n---\n\n");

      const userMessage = `SOURCES:\n${sourceContext}\n\n---\n\nUSER QUESTION: ${question}${citationVerification ? "\n\nPlease include short quoted excerpts from each cited source under the Citations section." : ""}${lang && lang !== "auto" ? `\n\nRespond in ${lang === "ar" ? "Arabic" : lang === "fr" ? "French" : "English"}.` : ""}`;

      // Call LLM
      const { OpenAI } = await import("openai");
      const client = new OpenAI();

      const response = await client.responses.create({
        model: "gemini_3_flash",
        instructions: SYSTEM_PROMPT,
        input: userMessage,
      });

      const answerText = typeof response.output_text === "string"
        ? response.output_text
        : "Unable to generate a response. Please try again.";

      // Build sources list
      const sources = chunks.map(c => ({
        citationLabel: c.citationLabel,
        lawId: c.lawId,
        articleNumber: c.articleNumber,
        subject: c.subject,
        category: c.category,
        excerpt: c.chunkText.substring(0, 200) + (c.chunkText.length > 200 ? "..." : ""),
      }));

      // Decrement free question if not subscribed
      if (profile.subscriptionStatus !== "active") {
        await storage.decrementFreeQuestions(visitorId);
      }

      // Log query
      await storage.insertQuery({
        visitorId,
        question,
        answerMarkdown: answerText,
        citationsJson: sources.map(s => s.citationLabel),
        sourcesJson: sources,
      });

      res.json({
        answer: answerText,
        citations: sources.map(s => s.citationLabel),
        sources,
      });
    } catch (err: any) {
      console.error("AI endpoint error:", err);
      res.status(422).json({ error: "Failed to process your question. Please try again." });
    }
  });
}

import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { ingestAllData } from "./ingest";
import { setupAuth, requireAuth, toProfile } from "./auth";

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
  // Setup authentication (must come before routes)
  setupAuth(app);

  // Ensure data is loaded
  await ensureDataReady();

  // Get current user profile
  app.get("/api/profile", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not logged in" });
    }
    res.json(toProfile(req.user!));
  });

  // Stats endpoint
  app.get("/api/stats", async (_req: Request, res: Response) => {
    const chunkCount = await storage.getChunkCount();
    const allLaws = await storage.getAllLaws();
    res.json({ laws: allLaws.length, chunks: chunkCount });
  });

  // Main ask endpoint
  app.post("/api/ask", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const { question, lang, citationVerification } = req.body;

    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return res.status(400).json({ error: "Please provide a valid question." });
    }

    // Refresh user data
    const freshUser = await storage.getUserById(user.id);
    if (!freshUser) return res.status(401).json({ error: "User not found" });

    // Check access
    if (freshUser.subscriptionStatus !== "active" && freshUser.freeQuestionsRemaining <= 0) {
      return res.status(403).json({ error: "paywall", message: "Your free question has been used. Subscribe to continue." });
    }

    try {
      const chunks = await storage.searchChunks(question, 16);

      if (chunks.length === 0) {
        const answer = "Not found in provided sources. The uploaded legal database does not contain information directly relevant to this query. Please try rephrasing your question or specifying the relevant area of Lebanese law.";

        if (freshUser.subscriptionStatus !== "active") {
          await storage.decrementFreeQuestions(user.id);
        }

        await storage.insertQuery({
          userId: user.id,
          question,
          answerMarkdown: answer,
          citationsJson: [],
          sourcesJson: [],
        });

        return res.json({ answer, citations: [], sources: [] });
      }

      const sourceContext = chunks.map((c, i) =>
        `[Source ${i + 1}]\nCitation: ${c.citationLabel}\nCategory: ${c.category || "N/A"}\nSubject: ${c.subject || "N/A"}\nArticle: ${c.articleNumber || "N/A"}\nText: ${c.chunkText}`
      ).join("\n\n---\n\n");

      const userMessage = `SOURCES:\n${sourceContext}\n\n---\n\nUSER QUESTION: ${question}${citationVerification ? "\n\nPlease include short quoted excerpts from each cited source under the Citations section." : ""}${lang && lang !== "auto" ? `\n\nRespond in ${lang === "ar" ? "Arabic" : lang === "fr" ? "French" : "English"}.` : ""}`;

      // Dynamic import required - esbuild can't bundle openai statically
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI();

      const response = await client.responses.create({
        model: "gemini_3_flash",
        instructions: SYSTEM_PROMPT,
        input: userMessage,
      });

      const answerText = typeof response.output_text === "string"
        ? response.output_text
        : "Unable to generate a response. Please try again.";

      const sources = chunks.map(c => ({
        citationLabel: c.citationLabel,
        lawId: c.lawId,
        articleNumber: c.articleNumber,
        subject: c.subject,
        category: c.category,
        excerpt: c.chunkText.substring(0, 200) + (c.chunkText.length > 200 ? "..." : ""),
      }));

      if (freshUser.subscriptionStatus !== "active") {
        await storage.decrementFreeQuestions(user.id);
      }

      await storage.insertQuery({
        userId: user.id,
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

  // --- Tap Payments ---

  app.post("/api/payments/create-charge", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const TAP_SECRET = process.env.TAP_SECRET_KEY;

    if (!TAP_SECRET) {
      return res.status(500).json({ error: "Payment system not configured. Set TAP_SECRET_KEY." });
    }

    const amount = parseFloat(process.env.SUBSCRIPTION_PRICE || "19.99");
    const currency = process.env.SUBSCRIPTION_CURRENCY || "USD";
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

    try {
      const response = await fetch("https://api.tap.company/v2/charges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TAP_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          customer_initiated: true,
          threeDSecure: true,
          save_card: false,
          description: "Case Map Pro - Monthly Subscription",
          metadata: {
            userId: String(user.id),
            type: "subscription",
          },
          receipt: { email: true, sms: false },
          customer: {
            first_name: user.displayName || user.email.split("@")[0],
            email: user.email,
          },
          source: { id: "src_all" },
          post: { url: `${baseUrl}/api/payments/webhook` },
          redirect: { url: `${baseUrl}/#/payment-result` },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Tap charge creation failed:", data);
        return res.status(422).json({ error: "Failed to create payment. Please try again." });
      }

      res.json({
        chargeId: data.id,
        redirectUrl: data.transaction?.url,
      });
    } catch (err: any) {
      console.error("Tap payment error:", err);
      res.status(500).json({ error: "Payment service unavailable" });
    }
  });

  // Tap webhook
  app.post("/api/payments/webhook", async (req: Request, res: Response) => {
    const payload = req.body;
    console.log("Tap webhook received:", JSON.stringify(payload, null, 2));

    if (!payload || !payload.id) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const userId = payload.metadata?.userId;
    if (!userId) {
      console.error("Webhook missing userId in metadata");
      return res.status(400).json({ error: "Missing user ID" });
    }

    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (payload.status === "CAPTURED") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await storage.updateSubscription(numericUserId, "active", expiresAt, payload.id);
      console.log(`Subscription activated for user ${numericUserId} until ${expiresAt.toISOString()}`);
    }

    res.json({ received: true });
  });

  // Verify charge after redirect
  app.get("/api/payments/verify/:chargeId", requireAuth, async (req: Request, res: Response) => {
    const TAP_SECRET = process.env.TAP_SECRET_KEY;
    if (!TAP_SECRET) {
      return res.status(500).json({ error: "Payment system not configured" });
    }

    try {
      const response = await fetch(`https://api.tap.company/v2/charges/${req.params.chargeId}`, {
        headers: { Authorization: `Bearer ${TAP_SECRET}` },
      });

      const data = await response.json();
      const user = req.user!;

      if (data.status === "CAPTURED" && data.metadata?.userId === String(user.id)) {
        const freshUser = await storage.getUserById(user.id);
        if (freshUser && freshUser.subscriptionStatus !== "active") {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          await storage.updateSubscription(user.id, "active", expiresAt, data.id);
        }
        res.json({ status: "success", subscriptionStatus: "active" });
      } else {
        res.json({ status: data.status?.toLowerCase() || "unknown" });
      }
    } catch (err: any) {
      console.error("Charge verification error:", err);
      res.status(500).json({ error: "Could not verify payment" });
    }
  });
}

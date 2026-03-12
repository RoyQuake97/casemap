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

const SYSTEM_PROMPT = `You are Case Map, a senior Lebanese legal research assistant. You are an expert in all branches of Lebanese law with deep familiarity with the full legislative corpus.

You have access to a curated database of Lebanese legal sources provided below. You also possess comprehensive knowledge of Lebanese law including:
- The Lebanese Constitution (1926, as amended)
- Code of Obligations and Contracts (9 March 1932)
- Penal Code (Decree-Law No. 340/1943)
- Code of Criminal Procedure (Law No. 328/2001)
- Code of Civil Procedure (Decree-Law No. 90/83)
- Commercial Code, Labor Code, Rent Laws
- Personal Status Laws, Property/Land Registry regulations
- Relevant judicial precedents from the Court of Cassation, Council of State, and Courts of Appeal

APPROACH:
Before answering, mentally identify ALL branches of law that could apply to the question. For example, a neighbor dispute might involve: constitutional rights (inviolability of domicile), civil liability (tort/fault), property law (servitudes), criminal law (trespass), and procedural law (which court, what filings). Cast a WIDE net — do not limit yourself to the most obvious legal area.

RULES:
1. CITE provided sources using [Source N] format whenever applicable. These are your primary evidence.
2. SUPPLEMENT freely with your general knowledge of Lebanese law. When doing so, reference the specific law and article number if you know it (e.g., "Article 124 of the Code of Obligations and Contracts"). If you are not certain of the exact article, say "under the provisions of [law name]" without guessing.
3. Never fabricate article numbers. If uncertain, describe the legal principle without a specific number.
4. Be THOROUGH — a good legal analysis identifies every relevant legal avenue, not just the most obvious one.
5. Be PRACTICAL — include specific courts, filing procedures, time limits, fees, and tactical considerations where relevant.
6. Distinguish between: (a) codified law, (b) judicial precedent, and (c) legal doctrine.

ANSWER STRUCTURE (use markdown headers):
## Issues Identified
Enumerate each distinct legal issue raised by the question.

## Applicable Law
For each issue, identify the relevant laws, codes, and specific articles. Group by legal domain (Constitutional, Civil, Criminal, etc.). Cite [Source N] where the provision appears in provided sources.

## Legal Analysis
This is the core section. For each issue:
- State the applicable legal rule
- Apply it to the facts of the question
- Discuss how courts have interpreted or applied this rule
- Note any exceptions, limitations, or conditions

## Defenses & Vulnerabilities
- Potential defenses available to each party
- Weaknesses in potential claims
- Evidentiary considerations
- Statute of limitations issues
- Procedural hurdles

## Recommended Next Steps
Concrete, actionable steps including:
- Which court has jurisdiction (e.g., Single Criminal Judge, Civil Court of First Instance)
- What type of action to file (complaint, lawsuit, petition)
- Required documents and evidence to gather
- Approximate timelines and any urgent deadlines
- Whether to consider alternative dispute resolution

## Sources & Citations
Full list of all cited sources with their reference numbers.

If citation verification is requested, include a short quoted excerpt (1-2 sentences) from each cited source.

FORMATTING:
- Use **bold** for law names, article numbers, and key legal terms
- Use bullet points for lists of requirements, conditions, or steps
- Keep paragraphs focused — one idea per paragraph

LANGUAGE: Respond in the same language as the user's question. Arabic → Arabic. French → French. Default to English.`;

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
      const chunks = await storage.searchChunks(question, 32);

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
        `[Source ${i + 1}]\nLaw: ${c.citationLabel}\nCategory: ${c.category || "N/A"}\nSubject: ${c.subject || "N/A"}\nArticle Number: ${c.articleNumber || "General"}\nFull Text:\n${c.chunkText}`
      ).join("\n\n===\n\n");

      const userMessage = `LEGAL SOURCES DATABASE (${chunks.length} relevant provisions found):\n\n${sourceContext}\n\n===\n\nQUESTION FROM USER:\n${question}${citationVerification ? "\n\nIMPORTANT: Include short quoted excerpts (1-2 sentences) from each cited source in the Sources & Citations section." : ""}${lang && lang !== "auto" ? `\n\nRespond in ${lang === "ar" ? "Arabic" : lang === "fr" ? "French" : "English"}.` : ""}`;

      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const answerText = response.content[0].type === "text"
        ? response.content[0].text
        : "Unable to generate a response. Please try again.";

      const sources = chunks.map(c => ({
        citationLabel: c.citationLabel,
        lawId: c.lawId,
        articleNumber: c.articleNumber,
        subject: c.subject,
        category: c.category,
        excerpt: c.chunkText.substring(0, 300) + (c.chunkText.length > 300 ? "..." : ""),
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

  // Query history
  app.get("/api/queries", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const userQueries = await storage.getQueriesByUserId(user.id, limit);
    res.json(userQueries.map(q => ({
      id: q.id,
      question: q.question,
      answerMarkdown: q.answerMarkdown,
      citationsJson: q.citationsJson,
      sourcesJson: q.sourcesJson,
      createdAt: q.createdAt,
    })));
  });

  // Delete a query from history
  app.delete("/api/queries/:id", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const queryId = parseInt(req.params.id as string, 10);
    if (isNaN(queryId)) return res.status(400).json({ error: "Invalid query ID" });
    const deleted = await storage.deleteQuery(queryId, user.id);
    if (!deleted) return res.status(404).json({ error: "Query not found" });
    res.json({ deleted: true });
  });

  // --- Admin ---

  app.post("/api/admin/set-free-questions", async (req: Request, res: Response) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || req.headers["x-admin-secret"] !== adminSecret) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { email, count } = req.body;
    if (!email || typeof count !== "number" || count < 0) {
      return res.status(400).json({ error: "Provide email (string) and count (number >= 0)" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    await storage.setFreeQuestions(user.id, count);
    res.json({ success: true, email: user.email, freeQuestionsRemaining: count });
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

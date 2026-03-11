import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

interface KeyArticle {
  article_number: string;
  text_arabic?: string;
  text_french?: string;
  text_english?: string;
  text_ar?: string;
  text_fr?: string;
  text_en?: string;
  subject?: string;
  current_version?: boolean;
}

interface LawEntry {
  law_id: string;
  official_number?: string;
  official_title_arabic?: string;
  official_title_french?: string;
  official_title_english?: string;
  date_enacted?: string;
  category?: string;
  subcategory?: string;
  status?: string;
  historical_context?: string;
  total_articles?: number;
  key_articles?: KeyArticle[];
  amendments?: any[];
  summary?: string;
  description?: string;
}

interface LawFile {
  metadata?: any;
  laws?: LawEntry[];
  entries?: LawEntry[];
  decrees?: LawEntry[];
  amendments?: any[];
}

// In dev, __dirname is casemap/server. In prod build, dist/. Always resolve from project root.
const DATA_DIR = path.resolve(process.cwd(), "data");

export async function ingestAllData(): Promise<{ laws: number; chunks: number }> {
  let lawCount = 0;
  let chunkCount = 0;

  // Check if already ingested
  const existingCount = await storage.getChunkCount();
  if (existingCount > 0) {
    console.log(`Data already ingested (${existingCount} chunks). Skipping.`);
    return { laws: 0, chunks: existingCount };
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
  console.log(`Found ${files.length} JSON files to ingest`);

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
      const data: LawFile = JSON.parse(raw);

      // Handle different array keys
      const lawEntries = data.laws || data.entries || data.decrees || [];

      for (const law of lawEntries) {
        if (!law.law_id) continue;

        // Insert law record
        try {
          await storage.insertLaw({
            lawId: law.law_id,
            officialNumber: law.official_number || null,
            titleAr: law.official_title_arabic || null,
            titleFr: law.official_title_french || null,
            titleEn: law.official_title_english || null,
            dateEnacted: law.date_enacted || null,
            category: law.category || null,
            subcategory: law.subcategory || null,
            status: law.status || null,
            historicalContext: law.historical_context || null,
            totalArticles: law.total_articles || null,
          });
          lawCount++;
        } catch (e) {
          // Duplicate law_id, skip
        }

        const lawTitle = law.official_title_english || law.official_title_french || law.official_number || law.law_id;

        // Ingest key_articles as chunks
        if (law.key_articles && Array.isArray(law.key_articles)) {
          for (const art of law.key_articles) {
            const textEn = art.text_english || art.text_en || "";
            const textFr = art.text_french || art.text_fr || "";
            const textAr = art.text_arabic || art.text_ar || "";

            // Create chunk for each available language
            const texts: { text: string; lang: string }[] = [];
            if (textEn) texts.push({ text: textEn, lang: "en" });
            if (textFr) texts.push({ text: textFr, lang: "fr" });
            if (textAr) texts.push({ text: textAr, lang: "ar" });

            // If no text in any language, use subject
            if (texts.length === 0 && art.subject) {
              texts.push({ text: art.subject, lang: "en" });
            }

            for (const { text, lang } of texts) {
              const citationLabel = `${lawTitle}, Article ${art.article_number}`;
              await storage.insertChunk({
                lawId: law.law_id,
                articleNumber: art.article_number,
                chunkText: text,
                language: lang,
                citationLabel: citationLabel,
                subject: art.subject || null,
                category: law.category || null,
              });
              chunkCount++;
            }
          }
        }

        // Ingest historical_context as a chunk
        if (law.historical_context) {
          await storage.insertChunk({
            lawId: law.law_id,
            articleNumber: null,
            chunkText: law.historical_context,
            language: "en",
            citationLabel: `${lawTitle} — Historical Context`,
            subject: "Historical context and overview",
            category: law.category || null,
          });
          chunkCount++;
        }

        // Ingest summary/description as a chunk
        if (law.summary || law.description) {
          await storage.insertChunk({
            lawId: law.law_id,
            articleNumber: null,
            chunkText: (law.summary || law.description)!,
            language: "en",
            citationLabel: `${lawTitle} — Summary`,
            subject: "Law summary",
            category: law.category || null,
          });
          chunkCount++;
        }

        // Ingest amendments as chunks
        if (law.amendments && Array.isArray(law.amendments)) {
          for (const amend of law.amendments) {
            if (amend.summary) {
              const citationLabel = `${lawTitle} — Amendment: ${amend.amending_law || "Amendment"}`;
              await storage.insertChunk({
                lawId: law.law_id,
                articleNumber: amend.articles_affected?.join(", ") || null,
                chunkText: amend.summary,
                language: "en",
                citationLabel: citationLabel,
                subject: "Amendment",
                category: law.category || null,
              });
              chunkCount++;
            }
          }
        }
      }

      // Handle amendments_index files
      if (data.amendments && Array.isArray(data.amendments) && !data.laws) {
        for (const amend of data.amendments) {
          if (amend.description || amend.summary) {
            await storage.insertChunk({
              lawId: amend.law_id || "AMENDMENTS",
              articleNumber: null,
              chunkText: amend.description || amend.summary,
              language: "en",
              citationLabel: `Amendment: ${amend.amending_law || amend.title || "Unknown"}`,
              subject: "Constitutional Amendment",
              category: "Constitutional Law",
            });
            chunkCount++;
          }
        }
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }

  console.log(`Ingestion complete: ${lawCount} laws, ${chunkCount} chunks`);
  return { laws: lawCount, chunks: chunkCount };
}

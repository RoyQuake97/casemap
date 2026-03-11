import { profiles, laws, chunks, queries, type Profile, type InsertProfile, type Law, type InsertLaw, type Chunk, type InsertChunk, type Query, type InsertQuery } from "@shared/schema";

export interface IStorage {
  // Profiles
  getProfile(visitorId: string): Promise<Profile | null>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  decrementFreeQuestions(visitorId: string): Promise<void>;

  // Laws
  insertLaw(law: InsertLaw): Promise<Law>;
  getLawByLawId(lawId: string): Promise<Law | null>;
  getAllLaws(): Promise<Law[]>;

  // Chunks
  insertChunk(chunk: InsertChunk): Promise<Chunk>;
  searchChunks(query: string, limit?: number): Promise<Chunk[]>;
  getAllChunks(): Promise<Chunk[]>;
  getChunkCount(): Promise<number>;

  // Queries
  insertQuery(query: InsertQuery): Promise<Query>;
}

export class MemStorage implements IStorage {
  private profiles: Map<string, Profile> = new Map();
  private lawsList: Law[] = [];
  private chunksList: Chunk[] = [];
  private queriesList: Query[] = [];
  private nextId = { profile: 1, law: 1, chunk: 1, query: 1 };

  async getProfile(visitorId: string): Promise<Profile | null> {
    return this.profiles.get(visitorId) || null;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const p: Profile = {
      id: this.nextId.profile++,
      visitorId: profile.visitorId,
      freeQuestionsRemaining: profile.freeQuestionsRemaining ?? 1,
      subscriptionStatus: profile.subscriptionStatus ?? "inactive",
      createdAt: new Date(),
    };
    this.profiles.set(p.visitorId, p);
    return p;
  }

  async decrementFreeQuestions(visitorId: string): Promise<void> {
    const p = this.profiles.get(visitorId);
    if (p && p.freeQuestionsRemaining > 0) {
      p.freeQuestionsRemaining--;
    }
  }

  async insertLaw(law: InsertLaw): Promise<Law> {
    const l: Law = { id: this.nextId.law++, ...law, totalArticles: law.totalArticles ?? null, historicalContext: law.historicalContext ?? null, subcategory: law.subcategory ?? null, status: law.status ?? null, titleAr: law.titleAr ?? null, titleFr: law.titleFr ?? null, titleEn: law.titleEn ?? null, dateEnacted: law.dateEnacted ?? null, officialNumber: law.officialNumber ?? null, category: law.category ?? null };
    this.lawsList.push(l);
    return l;
  }

  async getLawByLawId(lawId: string): Promise<Law | null> {
    return this.lawsList.find(l => l.lawId === lawId) || null;
  }

  async getAllLaws(): Promise<Law[]> {
    return this.lawsList;
  }

  async insertChunk(chunk: InsertChunk): Promise<Chunk> {
    const c: Chunk = { id: this.nextId.chunk++, ...chunk, articleNumber: chunk.articleNumber ?? null, language: chunk.language ?? null, subject: chunk.subject ?? null, category: chunk.category ?? null };
    this.chunksList.push(c);
    return c;
  }

  async searchChunks(query: string, limit: number = 12): Promise<Chunk[]> {
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(t => t.length > 2);
    
    // Domain-specific synonyms for better matching
    const synonymMap: Record<string, string[]> = {
      "labor": ["labour", "work", "employment", "employee", "worker", "travail"],
      "termination": ["dismiss", "dismissal", "fire", "firing", "end of service", "severance", "indemnity"],
      "contract": ["obligation", "agreement", "contrat"],
      "criminal": ["penal", "crime", "offense", "offence", "penalty"],
      "property": ["immovable", "real estate", "land", "rent", "lease"],
      "tax": ["fiscal", "income tax", "vat", "customs", "duty"],
      "bank": ["banking", "financial", "money", "credit", "monetary"],
      "marriage": ["divorce", "personal status", "custody", "family"],
      "company": ["commercial", "corporation", "business", "trade"],
      "constitution": ["constitutional", "fundamental rights"],
      "case": ["decision", "ruling", "judgment", "precedent", "court", "cassation", "jurisprudence"],
      "arbitration": ["arbitral", "arbitrator", "exequatur", "tribunal"],
      "tort": ["liability", "damage", "damages", "negligence", "fault", "compensation", "indemnity"],
      "consumer": ["protection", "product", "warranty", "defect"],
      "copyright": ["intellectual property", "trademark", "patent", "literary", "artistic"],
    };
    
    // Expand terms with synonyms
    const expandedTerms = new Set(terms);
    for (const term of terms) {
      for (const [key, synonyms] of Object.entries(synonymMap)) {
        if (term.includes(key) || key.includes(term)) {
          synonyms.forEach(s => expandedTerms.add(s));
          expandedTerms.add(key);
        }
        if (synonyms.some(s => term.includes(s) || s.includes(term))) {
          expandedTerms.add(key);
          synonyms.forEach(s => expandedTerms.add(s));
        }
      }
    }

    // Category detection from query
    const categoryHints: string[] = [];
    if (q.match(/labor|labour|work|employ|worker|minimum wage|working hours|termination|dismiss/)) categoryHints.push("labor");
    if (q.match(/penal|criminal|crime|murder|theft|assault|punish/)) categoryHints.push("criminal");
    if (q.match(/tax|fiscal|income|vat|customs|duty/)) categoryHints.push("tax");
    if (q.match(/bank|financial|money|credit|loan|deposit|secrecy/)) categoryHints.push("banking");
    if (q.match(/commercial|company|corporation|trade|business|merchant/)) categoryHints.push("commercial");
    if (q.match(/constitution|fundamental|rights|freedom|equality/)) categoryHints.push("constitutional");
    if (q.match(/rent|lease|property|land|immovable|mortgage/)) categoryHints.push("property", "civil");
    if (q.match(/contract|obligation|liability|damage|fault|tort/)) categoryHints.push("civil");
    if (q.match(/marriage|divorce|custody|inheritance|personal status|family/)) categoryHints.push("personal status");
    if (q.match(/municipal|local|administration|government|election/)) categoryHints.push("administrative", "municipal");
    if (q.match(/case law|court decision|ruling|precedent|jurisprudence|cassation|judgment/)) categoryHints.push("case_law");
    if (q.match(/arbitrat|exequatur|tribunal/)) categoryHints.push("commercial");
    if (q.match(/consumer|product safety|warranty|defect/)) categoryHints.push("consumer");
    if (q.match(/copyright|trademark|patent|intellectual property|literary/)) categoryHints.push("intellectual_property");
    if (q.match(/torture|human rights|detention|prisoner/)) categoryHints.push("criminal");

    // Score each chunk
    const scored = this.chunksList.map(chunk => {
      let score = 0;
      const text = (chunk.chunkText + " " + chunk.citationLabel + " " + (chunk.subject || "") + " " + (chunk.category || "")).toLowerCase();

      // Exact article number match (high priority)
      const articleMatch = q.match(/(?:article|مادة|art\.?)\s*(\d+)/i);
      if (articleMatch && chunk.articleNumber) {
        const num = articleMatch[1];
        if (chunk.articleNumber === num || chunk.articleNumber.includes(num)) {
          score += 100;
        }
      }

      // Law number match
      const lawNumMatch = q.match(/(?:law|loi|قانون)\s*(?:no\.?\s*)?(\d+)/i);
      if (lawNumMatch) {
        const num = lawNumMatch[1];
        if (chunk.citationLabel.includes(num)) {
          score += 80;
        }
      }

      // Category match bonus
      if (categoryHints.length > 0 && chunk.category) {
        const cat = chunk.category.toLowerCase();
        for (const hint of categoryHints) {
          if (cat.includes(hint)) {
            score += 40;
          }
        }
      }

      // Expanded term matching
      for (const term of expandedTerms) {
        if (text.includes(term)) {
          score += 8;
          // Bonus for subject match
          if ((chunk.subject || "").toLowerCase().includes(term)) {
            score += 25;
          }
          // Bonus for citation match
          if (chunk.citationLabel.toLowerCase().includes(term)) {
            score += 15;
          }
          // Bonus for original query term (not just synonym)
          if (terms.includes(term)) {
            score += 5;
          }
        }
      }

      return { chunk, score };
    });

    // Deduplicate: if same citationLabel appears with different languages, keep highest score
    const seen = new Map<string, { chunk: Chunk; score: number }>();
    for (const s of scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)) {
      const key = s.chunk.citationLabel + "|" + (s.chunk.articleNumber || "");
      if (!seen.has(key)) {
        seen.set(key, s);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.chunk);
  }

  async getAllChunks(): Promise<Chunk[]> {
    return this.chunksList;
  }

  async getChunkCount(): Promise<number> {
    return this.chunksList.length;
  }

  async insertQuery(query: InsertQuery): Promise<Query> {
    const q: Query = {
      id: this.nextId.query++,
      ...query,
      answerMarkdown: query.answerMarkdown ?? null,
      citationsJson: query.citationsJson ?? null,
      sourcesJson: query.sourcesJson ?? null,
      createdAt: new Date(),
    };
    this.queriesList.push(q);
    return q;
  }
}

export const storage = new MemStorage();

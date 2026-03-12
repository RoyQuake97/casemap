import { eq, sql, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  users, laws, chunks, queries,
  type User, type InsertUser,
  type Law, type InsertLaw,
  type Chunk, type InsertChunk,
  type Query, type InsertQuery,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  decrementFreeQuestions(userId: number): Promise<void>;
  updateSubscription(userId: number, status: string, expiresAt: Date | null, tapChargeId?: string): Promise<void>;

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
  getQueriesByUserId(userId: number, limit?: number): Promise<Query[]>;
  deleteQuery(queryId: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | null> {
    const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await getDb().select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return user || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await getDb().insert(users).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return created;
  }

  async decrementFreeQuestions(userId: number): Promise<void> {
    await getDb().update(users)
      .set({ freeQuestionsRemaining: sql`GREATEST(${users.freeQuestionsRemaining} - 1, 0)` })
      .where(eq(users.id, userId));
  }

  async updateSubscription(userId: number, status: string, expiresAt: Date | null, tapChargeId?: string): Promise<void> {
    await getDb().update(users)
      .set({
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt,
        ...(tapChargeId ? { tapChargeId } : {}),
      })
      .where(eq(users.id, userId));
  }

  async insertLaw(law: InsertLaw): Promise<Law> {
    const result = await getDb().insert(laws).values(law).onConflictDoNothing().returning();
    if (result.length > 0) return result[0];
    // Already exists, fetch it
    const [existing] = await getDb().select().from(laws).where(eq(laws.lawId, law.lawId)).limit(1);
    return existing;
  }

  async getLawByLawId(lawId: string): Promise<Law | null> {
    const [law] = await getDb().select().from(laws).where(eq(laws.lawId, lawId)).limit(1);
    return law || null;
  }

  async getAllLaws(): Promise<Law[]> {
    return getDb().select().from(laws);
  }

  async insertChunk(chunk: InsertChunk): Promise<Chunk> {
    const [created] = await getDb().insert(chunks).values(chunk).returning();
    return created;
  }

  async searchChunks(query: string, limit: number = 12): Promise<Chunk[]> {
    const allChunks = await getDb().select().from(chunks);
    return scoreAndRankChunks(allChunks, query, limit);
  }

  async getAllChunks(): Promise<Chunk[]> {
    return getDb().select().from(chunks);
  }

  async getChunkCount(): Promise<number> {
    const [result] = await getDb().select({ count: sql<number>`count(*)` }).from(chunks);
    return Number(result.count);
  }

  async insertQuery(query: InsertQuery): Promise<Query> {
    const [created] = await getDb().insert(queries).values(query).returning();
    return created;
  }

  async getQueriesByUserId(userId: number, limit: number = 50): Promise<Query[]> {
    return getDb().select().from(queries).where(eq(queries.userId, userId)).orderBy(desc(queries.createdAt)).limit(limit);
  }

  async deleteQuery(queryId: number, userId: number): Promise<boolean> {
    const result = await getDb().delete(queries).where(sql`${queries.id} = ${queryId} AND ${queries.userId} = ${userId}`).returning();
    return result.length > 0;
  }
}

export class MemStorage implements IStorage {
  private usersList: User[] = [];
  private lawsList: Law[] = [];
  private chunksList: Chunk[] = [];
  private queriesList: Query[] = [];
  private nextId = { user: 1, law: 1, chunk: 1, query: 1 };

  async getUserById(id: number): Promise<User | null> {
    return this.usersList.find(u => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.usersList.find(u => u.email === email.toLowerCase()) || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const u: User = {
      id: this.nextId.user++,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      displayName: user.displayName ?? null,
      freeQuestionsRemaining: user.freeQuestionsRemaining ?? 1,
      subscriptionStatus: user.subscriptionStatus ?? "inactive",
      tapCustomerId: user.tapCustomerId ?? null,
      tapChargeId: user.tapChargeId ?? null,
      subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
      createdAt: new Date(),
    };
    this.usersList.push(u);
    return u;
  }

  async decrementFreeQuestions(userId: number): Promise<void> {
    const u = this.usersList.find(u => u.id === userId);
    if (u && u.freeQuestionsRemaining > 0) u.freeQuestionsRemaining--;
  }

  async updateSubscription(userId: number, status: string, expiresAt: Date | null, tapChargeId?: string): Promise<void> {
    const u = this.usersList.find(u => u.id === userId);
    if (u) {
      u.subscriptionStatus = status;
      u.subscriptionExpiresAt = expiresAt;
      if (tapChargeId) u.tapChargeId = tapChargeId;
    }
  }

  async insertLaw(law: InsertLaw): Promise<Law> {
    const existing = this.lawsList.find(l => l.lawId === law.lawId);
    if (existing) return existing;
    const l: Law = {
      id: this.nextId.law++,
      lawId: law.lawId,
      officialNumber: law.officialNumber ?? null,
      titleAr: law.titleAr ?? null,
      titleFr: law.titleFr ?? null,
      titleEn: law.titleEn ?? null,
      dateEnacted: law.dateEnacted ?? null,
      category: law.category ?? null,
      subcategory: law.subcategory ?? null,
      status: law.status ?? null,
      historicalContext: law.historicalContext ?? null,
      totalArticles: law.totalArticles ?? null,
    };
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
    const c: Chunk = {
      id: this.nextId.chunk++,
      lawId: chunk.lawId,
      articleNumber: chunk.articleNumber ?? null,
      chunkText: chunk.chunkText,
      language: chunk.language ?? null,
      citationLabel: chunk.citationLabel,
      subject: chunk.subject ?? null,
      category: chunk.category ?? null,
    };
    this.chunksList.push(c);
    return c;
  }

  async searchChunks(query: string, limit: number = 12): Promise<Chunk[]> {
    return scoreAndRankChunks(this.chunksList, query, limit);
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

  async getQueriesByUserId(userId: number, limit: number = 50): Promise<Query[]> {
    return this.queriesList
      .filter(q => q.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async deleteQuery(queryId: number, userId: number): Promise<boolean> {
    const idx = this.queriesList.findIndex(q => q.id === queryId && q.userId === userId);
    if (idx === -1) return false;
    this.queriesList.splice(idx, 1);
    return true;
  }
}

// Legal concept mapping: maps real-world situations to relevant legal concepts and specific law provisions
const CONCEPT_MAP: Array<{
  trigger: RegExp;
  concepts: string[];  // terms to search in chunk text
  lawIds: string[];    // specific law IDs to boost
  subjects: string[];  // subject keywords to boost
  categories: string[];
}> = [
  {
    // Privacy, surveillance, photography, drones
    trigger: /privacy|private life|surveillance|wiretap|eavesdrop|photo|photograph|camera|drone|record|spy|monitor|intrusion|image.*house|image.*property/i,
    concepts: ["inviolab", "dwelling", "private", "privacy", "tort", "fault", "damage", "personal freedom", "morals", "dignity", "trespass", "liability"],
    lawIds: ["LB-CONST-001", "LB-CIV-001-EXPANDED", "LD-1932-COC", "LB-CRIM-001", "LB-CRIM-001-EXPANDED", "LB-PROC-001"],
    subjects: ["inviolab", "personal freedom", "tort", "liability", "morals", "dwelling", "property"],
    categories: ["constitutional", "civil", "criminal"],
  },
  {
    // Neighbor disputes
    trigger: /neighbou?r|adjacent|boundary|fence|nuisance|disturbance|easement|servitude/i,
    concepts: ["neighbou?r", "adjacent", "servitude", "easement", "nuisance", "property", "damage", "liability", "fault", "dwelling", "inviolab"],
    lawIds: ["LB-CIV-001-EXPANDED", "LD-1932-COC", "LB-CONST-001", "LB-CRIM-001-EXPANDED"],
    subjects: ["tort", "liability", "property", "servitude", "easement", "dwelling"],
    categories: ["civil", "constitutional", "criminal"],
  },
  {
    // Tort / civil liability / damages
    trigger: /tort|liability|damage|negligence|fault|compensation|harm|injury|accident|sue|lawsuit/i,
    concepts: ["liability", "fault", "damage", "compensation", "tort", "negligence", "obligation", "injure", "harm"],
    lawIds: ["LB-CIV-001-EXPANDED", "LD-1932-COC", "LB-PROC-001"],
    subjects: ["tort", "liability", "fault", "damage", "compensation"],
    categories: ["civil"],
  },
  {
    // Criminal offenses
    trigger: /penal|criminal|crime|murder|theft|assault|punish|prison|offense|offence|steal|rob|fraud|forgery/i,
    concepts: ["penal", "criminal", "offense", "penalty", "punishment", "prison", "felony", "misdemeanour"],
    lawIds: ["LB-CRIM-001", "LB-CRIM-001-EXPANDED", "LB-PROC-001", "LB-CRIM-002-EXPANDED"],
    subjects: ["penal", "criminal", "penalty", "offense"],
    categories: ["criminal", "procedural"],
  },
  {
    // Constitutional rights
    trigger: /constitution|fundamental|rights|freedom|equality|liberty|free speech|press|religion|conscience/i,
    concepts: ["constitution", "freedom", "equality", "liberty", "rights", "inviolab"],
    lawIds: ["LB-CONST-001"],
    subjects: ["freedom", "equality", "rights", "constitution"],
    categories: ["constitutional"],
  },
  {
    // Labor / employment
    trigger: /labor|labour|work|employ|worker|wage|working hours|termination|dismiss|severance|end of service/i,
    concepts: ["labor", "labour", "employment", "worker", "wage", "termination", "dismiss", "severance", "travail"],
    lawIds: ["LB-LAB-001", "LB-LAB-001-EXPANDED"],
    subjects: ["labor", "employment", "worker", "wage", "termination"],
    categories: ["labor"],
  },
  {
    // Property / real estate / rent
    trigger: /property|rent|lease|landlord|tenant|eviction|real estate|immovable|mortgage|ownership|house|building|apartment/i,
    concepts: ["property", "rent", "lease", "tenant", "landlord", "eviction", "immovable", "ownership", "mortgage"],
    lawIds: ["LB-RENT-001", "LB-RENT-002", "LB-RENT-003", "LB-CIV-001-EXPANDED", "LD-1932-COC"],
    subjects: ["property", "rent", "lease", "tenant", "ownership"],
    categories: ["property", "civil"],
  },
  {
    // Family / personal status
    trigger: /marriage|divorce|custody|inheritance|personal status|family|succession|will|testament|dowry/i,
    concepts: ["marriage", "divorce", "custody", "inheritance", "family", "succession", "personal status"],
    lawIds: [],
    subjects: ["marriage", "divorce", "custody", "inheritance", "family"],
    categories: ["personal status"],
  },
  {
    // Commercial / company
    trigger: /commercial|company|corporation|business|trade|merchant|shareholder|partnership|bankruptcy/i,
    concepts: ["commercial", "company", "corporation", "business", "trade", "merchant", "shareholder", "bankruptcy"],
    lawIds: ["LB-COM-001", "LB-COM-001-EXPANDED"],
    subjects: ["commercial", "company", "corporation", "business"],
    categories: ["commercial"],
  },
  {
    // Banking / finance
    trigger: /bank|banking|financial|credit|loan|deposit|secrecy|monetary|interest rate/i,
    concepts: ["bank", "banking", "financial", "credit", "loan", "deposit", "secrecy", "monetary"],
    lawIds: [],
    subjects: ["bank", "financial", "credit", "monetary"],
    categories: ["banking"],
  },
  {
    // Defamation / reputation
    trigger: /defam|slander|libel|insult|reputation|honor|honour|dignity/i,
    concepts: ["defam", "slander", "libel", "insult", "reputation", "honor", "dignity", "morals", "penal"],
    lawIds: ["LB-CRIM-001", "LB-CRIM-001-EXPANDED", "LB-CIV-001-EXPANDED"],
    subjects: ["defam", "slander", "libel", "insult", "reputation"],
    categories: ["criminal", "civil"],
  },
  {
    // Intellectual property / copyright
    trigger: /copyright|trademark|patent|intellectual property|literary|artistic|brand|piracy/i,
    concepts: ["copyright", "trademark", "patent", "intellectual", "literary", "artistic"],
    lawIds: ["LB-IP-001", "LB-IP-002"],
    subjects: ["copyright", "trademark", "patent", "intellectual"],
    categories: ["intellectual"],
  },
  {
    // Procedure / courts / litigation
    trigger: /court|litigation|appeal|cassation|procedure|filing|lawsuit|prosecution|judgment|injunction/i,
    concepts: ["court", "appeal", "cassation", "procedure", "prosecution", "judgment", "trial", "injunction"],
    lawIds: ["LB-PROC-001", "LB-CRIM-002-EXPANDED"],
    subjects: ["court", "appeal", "procedure", "prosecution"],
    categories: ["procedural"],
  },
];

// Shared search scoring logic
function scoreAndRankChunks(allChunks: Chunk[], query: string, limit: number): Chunk[] {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(t => t.length > 2);

  // Basic synonym expansion for keyword matching
  const synonymMap: Record<string, string[]> = {
    "labor": ["labour", "work", "employment", "employee", "worker", "travail"],
    "termination": ["dismiss", "dismissal", "fire", "firing", "end of service", "severance", "indemnity"],
    "contract": ["obligation", "agreement", "contrat"],
    "criminal": ["penal", "crime", "offense", "offence", "penalty", "punishment", "prison"],
    "property": ["immovable", "real estate", "land", "rent", "lease", "ownership"],
    "privacy": ["private", "personal", "surveillance", "wiretap", "secret", "confidential", "intrusion", "photograph", "camera", "drone", "recording"],
    "tax": ["fiscal", "income tax", "vat", "customs", "duty"],
    "bank": ["banking", "financial", "money", "credit", "monetary"],
    "marriage": ["divorce", "personal status", "custody", "family"],
    "company": ["commercial", "corporation", "business", "trade"],
    "constitution": ["constitutional", "fundamental rights", "freedom", "liberty"],
    "tort": ["liability", "damage", "damages", "negligence", "fault", "compensation", "indemnity", "harm", "injury"],
    "neighbour": ["neighbor", "adjacent", "boundary", "fence", "nuisance", "disturbance", "easement", "servitude"],
    "defamation": ["slander", "libel", "insult", "reputation", "honor", "honour", "dignity"],
    "accident": ["traffic", "vehicle", "car", "collision", "road", "driving"],
    "housing": ["tenant", "landlord", "eviction", "apartment", "building"],
  };

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

  // Match concept maps based on query
  const matchedConcepts = CONCEPT_MAP.filter(c => c.trigger.test(q));
  const conceptTerms = new Set<string>();
  const boostedLawIds = new Set<string>();
  const boostedSubjects = new Set<string>();
  const boostedCategories = new Set<string>();

  for (const cm of matchedConcepts) {
    cm.concepts.forEach(c => conceptTerms.add(c));
    cm.lawIds.forEach(l => boostedLawIds.add(l));
    cm.subjects.forEach(s => boostedSubjects.add(s));
    cm.categories.forEach(c => boostedCategories.add(c));
  }

  const scored = allChunks.map(chunk => {
    let score = 0;
    const text = (chunk.chunkText + " " + chunk.citationLabel + " " + (chunk.subject || "") + " " + (chunk.category || "")).toLowerCase();

    // Exact article number match
    const articleMatch = q.match(/(?:article|مادة|art\.?)\s*(\d+)/i);
    if (articleMatch && chunk.articleNumber) {
      const num = articleMatch[1];
      if (chunk.articleNumber === num || chunk.articleNumber.includes(num)) score += 100;
    }

    // Exact law number match
    const lawNumMatch = q.match(/(?:law|loi|قانون)\s*(?:no\.?\s*)?(\d+)/i);
    if (lawNumMatch) {
      const num = lawNumMatch[1];
      if (chunk.citationLabel.includes(num)) score += 80;
    }

    // Concept-based law ID boosting (most important for cross-domain queries)
    if (boostedLawIds.has(chunk.lawId)) {
      score += 30;
    }

    // Concept-based category boosting
    if (chunk.category && boostedCategories.size > 0) {
      const cat = chunk.category.toLowerCase();
      Array.from(boostedCategories).forEach(bc => {
        if (cat.includes(bc)) score += 25;
      });
    }

    // Concept-based subject boosting
    if (chunk.subject && boostedSubjects.size > 0) {
      const subj = chunk.subject.toLowerCase();
      Array.from(boostedSubjects).forEach(bs => {
        if (subj.includes(bs)) score += 35;
      });
    }

    // Concept term matching in chunk text (semantic bridge)
    Array.from(conceptTerms).forEach(ct => {
      const regex = new RegExp(ct, "i");
      if (regex.test(text)) {
        score += 12;
        if (chunk.subject && regex.test(chunk.subject)) score += 20;
      }
    });

    // Direct keyword and synonym matching
    Array.from(expandedTerms).forEach(term => {
      if (text.includes(term)) {
        score += 8;
        if ((chunk.subject || "").toLowerCase().includes(term)) score += 25;
        if (chunk.citationLabel.toLowerCase().includes(term)) score += 15;
        if (terms.includes(term)) score += 5;
      }
    });

    return { chunk, score };
  });

  // Deduplicate by citation + article
  const seen = new Map<string, { chunk: Chunk; score: number }>();
  for (const s of scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)) {
    const key = s.chunk.citationLabel + "|" + (s.chunk.articleNumber || "");
    if (!seen.has(key)) seen.set(key, s);
  }

  // Ensure diversity: pick from multiple law categories
  const results = Array.from(seen.values()).sort((a, b) => b.score - a.score);
  const selected: Array<{ chunk: Chunk; score: number }> = [];
  const lawIdCount = new Map<string, number>();

  for (const r of results) {
    if (selected.length >= limit) break;
    const lid = r.chunk.lawId;
    const count = lawIdCount.get(lid) || 0;
    // Allow max 8 chunks from same law to ensure diversity
    if (count < 8) {
      selected.push(r);
      lawIdCount.set(lid, count + 1);
    }
  }

  // If we have room, fill with remaining high-scoring chunks
  if (selected.length < limit) {
    for (const r of results) {
      if (selected.length >= limit) break;
      if (!selected.includes(r)) {
        selected.push(r);
      }
    }
  }

  return selected.map(s => s.chunk);
}

// Use database if DATABASE_URL is set, otherwise fall back to memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();

import { eq, sql } from "drizzle-orm";
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
    const [created] = await getDb().insert(laws).values(law).onConflictDoNothing().returning();
    return created;
  }

  async getLawByLawId(lawId: string): Promise<Law | null> {
    const [law] = await getDb().select().from(laws).where(eq(laws.lawId, lawId)).limit(1);
    return law || null;
  }

  async getAllLaws(): Promise<Law[]> {
    return db.select().from(laws);
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
    return db.select().from(chunks);
  }

  async getChunkCount(): Promise<number> {
    const [result] = await getDb().select({ count: sql<number>`count(*)` }).from(chunks);
    return Number(result.count);
  }

  async insertQuery(query: InsertQuery): Promise<Query> {
    const [created] = await getDb().insert(queries).values(query).returning();
    return created;
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
}

// Shared search scoring logic
function scoreAndRankChunks(allChunks: Chunk[], query: string, limit: number): Chunk[] {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(t => t.length > 2);

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

  const scored = allChunks.map(chunk => {
    let score = 0;
    const text = (chunk.chunkText + " " + chunk.citationLabel + " " + (chunk.subject || "") + " " + (chunk.category || "")).toLowerCase();

    const articleMatch = q.match(/(?:article|مادة|art\.?)\s*(\d+)/i);
    if (articleMatch && chunk.articleNumber) {
      const num = articleMatch[1];
      if (chunk.articleNumber === num || chunk.articleNumber.includes(num)) score += 100;
    }

    const lawNumMatch = q.match(/(?:law|loi|قانون)\s*(?:no\.?\s*)?(\d+)/i);
    if (lawNumMatch) {
      const num = lawNumMatch[1];
      if (chunk.citationLabel.includes(num)) score += 80;
    }

    if (categoryHints.length > 0 && chunk.category) {
      const cat = chunk.category.toLowerCase();
      for (const hint of categoryHints) {
        if (cat.includes(hint)) score += 40;
      }
    }

    for (const term of expandedTerms) {
      if (text.includes(term)) {
        score += 8;
        if ((chunk.subject || "").toLowerCase().includes(term)) score += 25;
        if (chunk.citationLabel.toLowerCase().includes(term)) score += 15;
        if (terms.includes(term)) score += 5;
      }
    }

    return { chunk, score };
  });

  const seen = new Map<string, { chunk: Chunk; score: number }>();
  for (const s of scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)) {
    const key = s.chunk.citationLabel + "|" + (s.chunk.articleNumber || "");
    if (!seen.has(key)) seen.set(key, s);
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.chunk);
}

// Use database if DATABASE_URL is set, otherwise fall back to memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();

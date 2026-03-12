import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (auth-based, replaces visitor profiles)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  freeQuestionsRemaining: integer("free_questions_remaining").notNull().default(1),
  subscriptionStatus: text("subscription_status").notNull().default("inactive"),
  tapCustomerId: text("tap_customer_id"),
  tapChargeId: text("tap_charge_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Profile type sent to frontend (no sensitive fields)
export type Profile = {
  id: number;
  email: string;
  displayName: string | null;
  freeQuestionsRemaining: number;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
};

// Laws
export const laws = pgTable("laws", {
  id: serial("id").primaryKey(),
  lawId: text("law_id").notNull().unique(),
  officialNumber: text("official_number"),
  titleAr: text("title_ar"),
  titleFr: text("title_fr"),
  titleEn: text("title_en"),
  dateEnacted: text("date_enacted"),
  category: text("category"),
  subcategory: text("subcategory"),
  status: text("status"),
  historicalContext: text("historical_context"),
  totalArticles: integer("total_articles"),
});

export const insertLawSchema = createInsertSchema(laws).omit({ id: true });
export type InsertLaw = z.infer<typeof insertLawSchema>;
export type Law = typeof laws.$inferSelect;

// Chunks (articles + text chunks for search)
export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  lawId: text("law_id").notNull(),
  articleNumber: text("article_number"),
  chunkText: text("chunk_text").notNull(),
  language: text("language"),
  citationLabel: text("citation_label").notNull(),
  subject: text("subject"),
  category: text("category"),
});

export const insertChunkSchema = createInsertSchema(chunks).omit({ id: true });
export type InsertChunk = z.infer<typeof insertChunkSchema>;
export type Chunk = typeof chunks.$inferSelect;

// Queries log
export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  question: text("question").notNull(),
  answerMarkdown: text("answer_markdown"),
  citationsJson: jsonb("citations_json"),
  sourcesJson: jsonb("sources_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuerySchema = createInsertSchema(queries).omit({ id: true, createdAt: true });
export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;

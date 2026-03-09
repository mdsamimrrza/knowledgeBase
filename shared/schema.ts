import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({ id: true, createdAt: true });

export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;

export const searchSchema = z.object({
  query: z.string(),
});
export type SearchRequest = z.infer<typeof searchSchema>;

export const searchResultSchema = z.object({
  article: z.custom<Article>(),
  score: z.number(),
  explanation: z.string(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResponseSchema = z.object({
  results: z.array(searchResultSchema),
  metrics: z.object({
    retrievalAccuracy: z.number(),
    queryTimeMs: z.number(),
  }),
  logs: z.array(z.string()).optional(),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

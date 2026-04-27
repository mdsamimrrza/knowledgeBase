import { z } from "zod";

// ---------- Article ----------
export const insertArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;

export interface Article {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
  source: string;
  createdAt: Date | string;
}

// ---------- State Machine ----------
export const AgentState = {
  IDLE: "IDLE",
  RECEIVING_QUERY: "RECEIVING_QUERY",
  FETCHING_ARTICLES: "FETCHING_ARTICLES",
  RANKING: "RANKING",
  RESPONDING: "RESPONDING",
  DONE: "DONE",
  ERROR: "ERROR",
} as const;
export type AgentStateType = (typeof AgentState)[keyof typeof AgentState];

export const stateTransitionSchema = z.object({
  from: z.string(),
  event: z.string(),
  to: z.string(),
  timestamp: z.string(),
});
export type StateTransition = z.infer<typeof stateTransitionSchema>;

// ---------- Tool Call ----------
export const toolCallSchema = z.object({
  tool: z.string(),
  input: z.unknown(),
  output: z.unknown(),
  durationMs: z.number(),
});
export type ToolCall = z.infer<typeof toolCallSchema>;

// ---------- Search Request (with seed) ----------
export const searchSchema = z.object({
  query: z.string(),
  seed: z.number().optional(),
});
export type SearchRequest = z.infer<typeof searchSchema>;

export const searchResultSchema = z.object({
  article: z.custom<Article>(),
  score: z.number().nullable().optional(),
  explanation: z.string().nullable().optional(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

const searchMetricsSchema = z
  .object({
    retrievalAccuracy: z.coerce.number(),
    queryTimeMs: z.coerce.number(),
    articlesScanned: z.coerce.number(),
  })
  .catch({
    retrievalAccuracy: 0,
    queryTimeMs: 0,
    articlesScanned: 0,
  });

export const searchResponseSchema = z.object({
  runId: z.string(),
  results: z.array(searchResultSchema),
  metrics: searchMetricsSchema,
  stateTransitions: z.array(stateTransitionSchema).catch([]),
  toolCalls: z.array(toolCallSchema).catch([]),
  currentState: z.string(),
  seed: z.number().nullable().optional(),
  logs: z.array(z.string()).optional(),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

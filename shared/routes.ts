import { z } from 'zod';
import { type Article, insertArticleSchema, searchSchema, searchResponseSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const evalSummarySchema = z.object({
  scenarios: z.array(z.object({
    scenarioId: z.number(),
    query: z.string(),
    matchedTitle: z.string().nullable(),
    score: z.number(),
    hit: z.boolean(),
    queryTimeMs: z.number(),
    runId: z.string(),
  })),
  summary: z.object({
    total: z.number(),
    hits: z.number(),
    accuracy: z.string(),
    avgLatencyMs: z.number(),
  }),
});

export const api = {
  articles: {
    list: {
      method: 'GET' as const,
      path: '/api/articles' as const,
      responses: {
        200: z.array(z.custom<Article>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/articles' as const,
      input: insertArticleSchema,
      responses: {
        201: z.custom<Article>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/articles/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  agent: {
    search: {
      method: 'POST' as const,
      path: '/api/agent/search' as const,
      input: searchSchema,
      responses: {
        200: searchResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      }
    },
    evaluate: {
      method: 'POST' as const,
      path: '/api/agent/evaluate' as const,
      responses: {
        200: evalSummarySchema,
        500: errorSchemas.internal,
      }
    },
    logs: {
      method: 'GET' as const,
      path: '/api/agent/logs' as const,
      responses: {
        200: z.array(z.record(z.unknown())),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type SearchRequest = z.infer<typeof searchSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type ArticleResponse = Article;

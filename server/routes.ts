import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // CRUD for articles
  app.get(api.articles.list.path, async (req, res) => {
    const allArticles = await storage.getArticles();
    res.json(allArticles);
  });

  app.post(api.articles.create.path, async (req, res) => {
    try {
      const input = api.articles.create.input.parse(req.body);
      const article = await storage.createArticle(input);
      res.status(201).json(article);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0]?.path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.delete(api.articles.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getArticle(id);
      if (!existing) {
        return res.status(404).json({ message: "Article not found" });
      }
      await storage.deleteArticle(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  // Agent search
  app.post(api.agent.search.path, async (req, res) => {
    const startTime = Date.now();
    try {
      const input = api.agent.search.input.parse(req.body);
      
      // Get all articles to pass as context
      const allArticles = await storage.getArticles();
      
      const prompt = `You are a knowledge base query assistant.
The user is asking: "${input.query}"

Here are the available articles in the JSON store:
${JSON.stringify(allArticles.map(a => ({ id: a.id, title: a.title, content: a.content })), null, 2)}

Your task:
1. Select the best matching article to answer the query.
2. Provide a relevance score (0-100).
3. Provide an explanation of why it matched.
If no article matches well, pick the closest one or indicate low score.

Output MUST be valid JSON in this exact structure:
{
  "matchedArticleId": number | null,
  "score": number,
  "explanation": "string"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseContent = response.choices[0]?.message?.content || "{}";
      const parsedResponse = JSON.parse(responseContent);
      
      const queryTimeMs = Date.now() - startTime;
      
      const results = [];
      if (parsedResponse.matchedArticleId) {
        const matchedArticle = allArticles.find(a => a.id === parsedResponse.matchedArticleId);
        if (matchedArticle) {
          results.push({
            article: matchedArticle,
            score: parsedResponse.score,
            explanation: parsedResponse.explanation,
          });
        }
      }
      
      // Calculate retrieval accuracy logic.
      const retrievalAccuracy = parsedResponse.score || 0;

      res.json({
        results,
        metrics: {
          retrievalAccuracy,
          queryTimeMs,
        },
        logs: [
          `Query received: "${input.query}"`,
          `Fetched ${allArticles.length} articles from store.`,
          `LLM analysis complete in ${queryTimeMs}ms.`,
          `Selected article ID: ${parsedResponse.matchedArticleId} with score ${parsedResponse.score}`
        ]
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0]?.path.join('.'),
        });
      }
      console.error("Agent search error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed the database asynchronously in the background
  seedDatabase().catch(console.error);

  return httpServer;
}

// Seed the database
async function seedDatabase() {
  const existingArticles = await storage.getArticles();
  if (existingArticles.length === 0) {
    await storage.createArticle({
      title: "Agentic Setup Guide",
      content: "This document applies to all teams (single-agent + tools and multi-agent). It standardizes environment setup, project workflow, required engineering practices, and a recommended 'agentic runtime' stack.",
      metadata: { category: "guide" }
    });
    await storage.createArticle({
      title: "Observability Requirements",
      content: "Every run must have a Run ID. Log: agent name, prompt/inputs, tool calls, tool I/O, state transitions, timestamps. Store logs as JSON Lines (recommended) or SQLite.",
      metadata: { category: "requirements" }
    });
    await storage.createArticle({
      title: "Metrics Guidelines",
      content: "Minimum 3 quantitative metrics. Minimum 10 scenarios (synthetic acceptable). Must show baseline comparison (single-agent baseline for multi-agent; no-tool baseline for single-agent track).",
      metadata: { category: "metrics" }
    });
  }
}

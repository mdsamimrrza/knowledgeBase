import { db } from "./db";
import { articles, type Article, type InsertArticle } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getArticles(): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles);
  }

  async getArticle(id: number): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article;
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db.insert(articles).values(insertArticle).returning();
    return article;
  }

  async deleteArticle(id: number): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }
}

export const storage = new DatabaseStorage();

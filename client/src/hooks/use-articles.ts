import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Article, type InsertArticle } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useArticles() {
  return useQuery({
    queryKey: [api.articles.list.path],
    queryFn: async () => {
      const res = await fetch(api.articles.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch articles");
      const data = await res.json();
      return parseWithLogging(api.articles.list.responses[200], data, "articles.list");
    },
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertArticle) => {
      const validated = api.articles.create.input.parse(data);
      const res = await fetch(api.articles.create.path, {
        method: api.articles.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Validation failed");
        }
        throw new Error("Failed to create article");
      }

      const responseData = await res.json();
      return parseWithLogging(api.articles.create.responses[201], responseData, "articles.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
      toast({
        title: "Article created",
        description: "The article was successfully added to the knowledge base.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.articles.delete.path, { id });
      const res = await fetch(url, {
        method: api.articles.delete.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Article not found");
        throw new Error("Failed to delete article");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
      toast({
        title: "Article deleted",
        description: "The article has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

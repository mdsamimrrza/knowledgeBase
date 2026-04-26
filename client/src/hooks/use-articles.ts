import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useArticles(limit = 10) {
  return useInfiniteQuery({
    queryKey: [api.articles.list.path, limit],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const url = new URL(api.articles.list.path, window.location.origin);
      url.searchParams.set("limit", limit.toString());
      url.searchParams.set("offset", pageParam.toString());
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch articles");
      const data = await res.json();
      return parseWithLogging(api.articles.list.responses[200], data, "articles.list");
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) return undefined;
      return allPages.length * limit;
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
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin_token") || ""}`
        },
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
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("admin_token") || ""}`
        },
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

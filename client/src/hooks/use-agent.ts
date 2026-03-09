import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type SearchRequest, type SearchResponse } from "@shared/schema";
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

export function useAgentSearch() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SearchRequest) => {
      const validated = api.agent.search.input.parse(data);
      
      const res = await fetch(api.agent.search.path, {
        method: api.agent.search.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Invalid search request");
        }
        throw new Error("An error occurred while searching");
      }

      const responseData = await res.json();
      return parseWithLogging(api.agent.search.responses[200], responseData, "agent.search");
    },
    onError: (error) => {
      toast({
        title: "Agent Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

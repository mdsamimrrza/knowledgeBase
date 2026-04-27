import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type SearchRequest, type SearchResponse } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

/**
 * Validates data against a Zod schema and logs errors for observability.
 */
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

/**
 * Hook for executing the agentic search pipeline.
 * Complies with strict public response schema.
 */
export function useAgentSearch() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SearchRequest): Promise<SearchResponse> => {
      const validated = api.agent.search.input.parse(data);
      
      const res = await fetch(api.agent.search.path, {
        method: api.agent.search.method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin_token") || ""}`
        },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 403) {
          const err = await res.json();
          if (err.detail === "FREE_LIMIT_REACHED") {
            throw new Error("FREE_LIMIT_REACHED");
          }
          throw new Error(err.detail || "Access denied");
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

/**
 * Hook for running accuracy evaluation.
 * Requires X-Admin-Key header as per security standards.
 */
export function useEvaluate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.agent.evaluate.path, {
        method: api.agent.evaluate.method,
        headers: {
          "X-Admin-Key": localStorage.getItem("admin_key") || ""
        },
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Invalid Admin Key");
        }
        throw new Error("Evaluation failed");
      }

      return await res.json();
    },
    onError: (error) => {
      toast({
        title: "Evaluation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

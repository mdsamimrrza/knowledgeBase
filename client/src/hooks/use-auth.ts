import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  email: string;
  plan: "free" | "premium";
  createdAt?: string;
}

export function useUser() {
  return useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) return null;
      
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        return null;
      }
      
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    localStorage.removeItem("admin_token");
    queryClient.setQueryData(["/api/auth/me"], null);
    window.location.reload(); // Hard refresh to clear all states
  };
}

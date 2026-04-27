import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Search,
  Activity,
  Zap,
  ArrowRight,
  FileSearch,
  Sparkles,
  RotateCcw,
  LogIn,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

import { useAgentSearch } from "@/hooks/use-agent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const KNOWLEDGE_VAULT_URL = "https://knowledge-vault.up.railway.app";

function intToHex(id: number | string | undefined | null): string {
  if (!id) return "0".repeat(24);
  if (typeof id === "string" && !/^\d+$/.test(id)) return id;
  try {
    const num = typeof id === "string" ? BigInt(id) : BigInt(id as number);
    return num.toString(16).padStart(24, "0");
  } catch (e) {
    return String(id);
  }
}

function normalizePercent(score: number | string | null | undefined): number {
  if (score === null || score === undefined) return 0;
  const safe = typeof score === "string" ? parseFloat(score) : score;
  if (!Number.isFinite(safe)) return 0;
  return safe > 100 ? safe / 100 : safe;
}

function cleanLogLine(line: string): string {
  return line.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function formatWikiLinks(text: string): string {
  // Convert [[Link]] to bold text for cleaner look in results
  return text.replace(/\[\[([^\]]+)\]\]/g, "**$1**");
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [, setLocation] = useLocation();

  const { mutate: search, data, isPending, reset, error } = useAgentSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    search({ query });
  };

  const handleReset = () => {
    setQuery("");
    reset();
  };

  if (error?.message === "FREE_LIMIT_REACHED" && !showLimitDialog) {
    setShowLimitDialog(true);
  }

  const renderAccuracyColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-red-500 bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center pt-12 pb-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
          <Sparkles className="w-4 h-4" />
          Neural Agent Active
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight mb-4 text-balance">
          Query the Knowledge Base
        </h1>
        <p className="text-muted-foreground text-base mb-8 max-w-2xl text-balance">
          Ask complex questions. The intelligent agent will retrieve, rank, and explain the most relevant documents.
        </p>

        <form onSubmit={handleSearch} className="w-full max-w-3xl relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search className="w-6 h-6" />
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="E.g., What are our security compliance guidelines?"
            aria-label="Search query"
            maxLength={500}
            className="w-full pl-16 pr-32 py-8 text-base rounded-2xl bg-card border-2 border-border shadow-xl shadow-black/5 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary transition-all duration-300"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Button
              type="submit"
              size="lg"
              disabled={isPending || !query.trim()}
              aria-label="Submit search query"
              className="rounded-xl px-6 font-semibold shadow-md"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Searching
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Query <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </form>

        <div className="flex items-center gap-4 mt-4 w-full max-w-3xl">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isPending ? (
          <div className="space-y-4 pb-12">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-12"
          >
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" /> ACCURACY
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-display font-bold tracking-tight">
                        {normalizePercent(data.metrics.retrievalAccuracy).toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> LATENCY
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-display font-bold tracking-tight">
                        {data.metrics.queryTimeMs}ms
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-700 bg-slate-950 text-emerald-300">
                  <CardHeader className="pb-3 border-b border-slate-800">
                    <CardTitle className="text-sm font-mono text-slate-200">Agent Execution Logs</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="max-h-[360px] overflow-auto space-y-2 pr-1">
                      {(Array.isArray(data.logs) ? data.logs : ["No logs available for this run."]).map((line: string, idx: number) => (
                        <p key={`${idx}-${line.slice(0, 16)}`} className="font-mono text-[10px] leading-5 break-words">
                          [{String(idx + 1).padStart(2, "0")}] {cleanLogLine(line)}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl flex items-center gap-3">
                  Semantic Matches
                  <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5 rounded-md">
                    {data.results.length}
                  </Badge>
                </h3>

                {data.results.length === 0 ? (
                  <Card className="p-12 text-center border-dashed">
                    <h4 className="text-xl font-semibold mb-1">No relevant documents found</h4>
                    <p className="text-muted-foreground">Try rephrasing your query.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {data.results.map((result: any, index: number) => (
                      <motion.div
                        key={result.article.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Card className="border-border/70 hover:border-primary/30 transition-colors">
                          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                            <div className="space-y-2">
                              <a
                                href={`${KNOWLEDGE_VAULT_URL}/article/${intToHex(result.article.id)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group/link"
                              >
                                <CardTitle className="text-xl font-display group-hover/link:text-primary transition-colors flex items-center gap-2">
                                  {result.article.title}
                                  <ExternalLink className="w-5 h-5 opacity-0 group-hover/link:opacity-60 transition-opacity" />
                                </CardTitle>
                              </a>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                ID: {result.article.id} | Indexed: {new Date(result.article.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`font-mono text-xs px-2 py-1 ${renderAccuracyColor(normalizePercent(result.score))}`}
                            >
                              Match: {normalizePercent(result.score).toFixed(1)}%
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="bg-secondary/50 p-4 rounded-xl text-xs leading-relaxed border border-border/50 text-foreground/95">
                              <span className="font-semibold text-primary mb-2 flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4" /> Agent Reasoning:
                              </span>
                              {result.explanation}
                            </div>
                            <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {formatWikiLinks(result.article.content)}
                              </ReactMarkdown>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center text-center">
            <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
            <DialogTitle className="text-2xl font-bold">Limit Reached</DialogTitle>
            <DialogDescription>
              Please sign in to unlock unlimited queries and full knowledge management.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowLimitDialog(false)}>Later</Button>
            <Button className="gap-2" onClick={() => setLocation("/auth")}>
              <LogIn className="w-4 h-4" /> Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

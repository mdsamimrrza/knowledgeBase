import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Activity, Zap, Cpu, ArrowRight, Sparkles,
  RotateCcw, Hash, Play, CheckCircle2, XCircle,
  Layers, LogIn, ShieldAlert, ExternalLink
} from "lucide-react";

import { useAgentSearch, useEvaluate } from "@/hooks/use-agent";
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

/**
 * Reverses the secure integer mapping to the original hex ObjectId
 * for external Knowledge-Vault links.
 */
function intToHex(id: number | string): string {
  if (typeof id === "string" && !/^\d+$/.test(id)) return id;
  const num = typeof id === "string" ? BigInt(id) : BigInt(id);
  return num.toString(16).padStart(24, "0");
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [seed, setSeed] = useState("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [, setLocation] = useLocation();
  
  const { mutate: search, data, isPending, reset, error } = useAgentSearch();
  const { mutate: runEval, data: evalData, isPending: evalPending } = useEvaluate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const seedNum = seed ? parseInt(seed) : undefined;
    search({ query, seed: seedNum });
  };

  const handleReset = () => {
    setQuery("");
    setSeed("");
    reset();
  };

  const handleSearchError = useCallback(() => {
    if (error?.message === "FREE_LIMIT_REACHED") {
      setShowLimitDialog(true);
    }
  }, [error]);

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
      {/* Hero Search Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center pt-12 pb-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
          <Cpu className="w-4 h-4" />
          Neural Agent Active
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-4 text-balance">
          Query the Knowledge Base
        </h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-2xl text-balance">
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
            className="w-full pl-16 pr-32 py-8 text-lg rounded-2xl bg-card border-2 border-border shadow-xl shadow-black/5 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary transition-all duration-300"
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
          <div className="flex items-center gap-2 flex-1">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <Input
              value={seed}
              onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
              placeholder="Seed (optional)"
              className="max-w-[200px] h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => runEval()}
            disabled={evalPending}
            className="gap-2"
          >
            <Play className="w-4 h-4" /> {evalPending ? "Running…" : "Run Eval"}
          </Button>
        </div>
      </motion.div>

      {/* Evaluation Results */}
      <AnimatePresence>
        {evalData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Evaluation Harness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Hits:</span>{" "}
                    <span className="font-bold">{evalData.summary.hits}/{evalData.summary.total}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accuracy:</span>{" "}
                    <span className="font-bold">{evalData.summary.accuracy}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Latency:</span>{" "}
                    <span className="font-bold">{evalData.summary.avgLatencyMs}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Area */}
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
            className="flex flex-col gap-6 pb-12"
          >
            {/* Header: Run Info + Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-4">
               <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2 border border-border/50">
                <span>Run: <span className="text-foreground font-semibold">{data.runId.slice(0, 8)}…</span></span>
                <Separator orientation="vertical" className="h-4" />
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  Accuracy: <span className="text-foreground font-semibold">{data.metrics.retrievalAccuracy}%</span>
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Latency: <span className="text-foreground font-semibold">{data.metrics.queryTimeMs}ms</span>
                </span>
              </div>
            </div>

            {/* Semantic Matches */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-xl flex items-center gap-2">
                Semantic Matches{" "}
                <Badge variant="secondary" className="ml-2 font-mono">
                  {data.results.length}
                </Badge>
              </h3>

              {data.results.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <h4 className="text-lg font-semibold mb-1">No relevant documents found</h4>
                  <p className="text-muted-foreground">Try rephrasing your query.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {data.results.map((result: any, index: number) => (
                    <motion.div
                      key={result.article.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/30 group">
                        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <a 
                              href={`${KNOWLEDGE_VAULT_URL}/article/${intToHex(result.article.id)}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block group/link"
                            >
                              <CardTitle className="text-xl font-display group-hover/link:text-primary transition-colors flex items-center gap-2">
                                {result.article.title}
                                <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-50 transition-opacity" />
                              </CardTitle>
                            </a>
                            <div className="text-xs text-muted-foreground font-mono">
                              Indexed: {new Date(result.article.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`font-mono px-2.5 py-1 ${renderAccuracyColor(result.score)}`}
                          >
                            {result.score}% Match
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-secondary/40 p-4 rounded-xl text-sm leading-relaxed border border-border/50 text-foreground/90">
                            <span className="font-semibold text-primary mb-1 flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5" /> Agent Reasoning:
                            </span>
                            {result.explanation}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {result.article.content}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free Limit Dialog */}
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

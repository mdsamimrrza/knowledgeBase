import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Terminal, Activity, Zap, Cpu, ArrowRight, Sparkles,
  RotateCcw, Hash, Database, Play, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Layers, LogIn, ShieldAlert, ExternalLink
} from "lucide-react";

import { useAgentSearch, useEvaluate } from "@/hooks/use-agent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  IDLE: { label: "Idle", color: "bg-slate-400" },
  RECEIVING_QUERY: { label: "Receiving Query", color: "bg-blue-500" },
  FETCHING_ARTICLES: { label: "Fetching Articles", color: "bg-amber-500" },
  RANKING: { label: "Ranking", color: "bg-purple-500" },
  RESPONDING: { label: "Responding", color: "bg-cyan-500" },
  DONE: { label: "Done", color: "bg-emerald-500" },
  ERROR: { label: "Error", color: "bg-red-500" },
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [seed, setSeed] = useState("");
  const [toolsExpanded, setToolsExpanded] = useState(false);
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

  // Handle errors automatically
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

        {/* Run Controls: Seed + Reset */}
        <div className="flex items-center gap-4 mt-4 w-full max-w-3xl">
          <div className="flex items-center gap-2 flex-1">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <Input
              value={seed}
              onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
              placeholder="Seed (optional, for reproducibility)"
              aria-label="Random seed for reproducibility"
              className="max-w-[260px] h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} aria-label="Reset search" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => runEval()}
            disabled={evalPending}
            className="gap-2"
          >
            <Play className="w-4 h-4" /> {evalPending ? "Running…" : "Run Eval (10 scenarios)"}
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
                  Evaluation Harness — {evalData.summary.total} Scenarios
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {evalData.scenarios.map((s: any) => (
                    <div key={s.scenarioId} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-secondary/40 border border-border/50">
                      {s.hit ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="truncate flex-1">{s.query}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{s.score}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {isPending && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
          <div className="lg:col-span-5 flex flex-col gap-5">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      )}

      {/* Results & Analytics Area */}
      <AnimatePresence mode="wait">
        {data && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12"
          >
            {/* Left Column: Run Info + Metrics + State Machine + Tool Calls + Logs */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Run ID + Seed */}
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2 border border-border/50">
                <span>Run: <span className="text-foreground font-semibold">{data.runId.slice(0, 8)}…</span></span>
                <Separator orientation="vertical" className="h-4" />
                <span>Seed: <span className="text-foreground font-semibold">{data.seed ?? "—"}</span></span>
                <Separator orientation="vertical" className="h-4" />
                <span>State: <span className="text-foreground font-semibold">{data.currentState}</span></span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="glass-panel overflow-hidden border-border/50">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" /> Accuracy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-display font-bold text-foreground">
                      {data.metrics.retrievalAccuracy.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-panel overflow-hidden border-border/50">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> Latency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-display font-bold text-foreground">
                      {data.metrics.queryTimeMs}ms
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-panel overflow-hidden border-border/50">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-cyan-500" /> Scanned
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-2xl font-display font-bold text-foreground">
                      {data.metrics.articlesScanned}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* State Transition History */}
              {data.stateTransitions && data.stateTransitions.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      State Transitions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex flex-col gap-1.5">
                      {data.stateTransitions.map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono">
                          <div className={`w-2 h-2 rounded-full ${STATE_LABELS[t.from]?.color ?? "bg-gray-400"}`} />
                          <span className="text-muted-foreground">{STATE_LABELS[t.from]?.label ?? t.from}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                          <div className={`w-2 h-2 rounded-full ${STATE_LABELS[t.to]?.color ?? "bg-gray-400"}`} />
                          <span className="text-foreground font-medium">{STATE_LABELS[t.to]?.label ?? t.to}</span>
                          <span className="text-muted-foreground/60 ml-auto text-[10px]">
                            {t.event}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tool Calls */}
              {data.toolCalls && data.toolCalls.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader
                    className="p-3 pb-2 cursor-pointer select-none"
                    onClick={() => setToolsExpanded(!toolsExpanded)}
                  >
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      {toolsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Tool Calls ({data.toolCalls.length})
                    </CardTitle>
                  </CardHeader>
                  {toolsExpanded && (
                    <CardContent className="p-3 pt-0 space-y-3">
                      {data.toolCalls.map((tc: any, i: number) => (
                        <div key={i} className="bg-secondary/40 rounded-lg p-3 border border-border/50 text-xs font-mono space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="font-mono text-[10px]">{tc.tool}</Badge>
                            <span className="text-muted-foreground">{tc.durationMs}ms</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Input:</span>
                            <pre className="mt-1 text-[11px] text-foreground/80 whitespace-pre-wrap break-words bg-background/50 rounded p-2">
                              {JSON.stringify(tc.input, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Output:</span>
                            <pre className="mt-1 text-[11px] text-foreground/80 whitespace-pre-wrap break-words bg-background/50 rounded p-2">
                              {JSON.stringify(tc.output, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Execution Logs */}
              {data.logs && data.logs.length > 0 && (
                <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden flex-1 min-h-[200px] flex flex-col">
                  <CardHeader className="bg-slate-900 border-b border-slate-800 p-3">
                    <CardTitle className="text-xs font-mono text-slate-400 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> Agent Execution Logs
                    </CardTitle>
                  </CardHeader>
                  <ScrollArea className="flex-1 p-4 terminal-scroll">
                    <div className="font-mono text-[13px] leading-relaxed text-emerald-400/90 space-y-2">
                      {data.logs.map((log: string, i: number) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-slate-600 select-none">[{String(i + 1).padStart(2, "0")}]</span>
                          <span className="break-words">{log}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>

            {/* Right Column: Semantic Results */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <h3 className="font-display font-bold text-xl flex items-center gap-2">
                Semantic Matches{" "}
                <Badge variant="secondary" className="ml-2 font-mono">
                  {data.results.length}
                </Badge>
              </h3>

              {data.results.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-secondary/20">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold mb-1">No relevant documents found</h4>
                  <p className="text-muted-foreground">
                    The agent couldn't find any articles matching your query context.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
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
                              href={`${KNOWLEDGE_VAULT_URL}/article/${result.article.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block group/link"
                            >
                              <CardTitle className="text-xl font-display group-hover/link:text-primary transition-colors flex items-center gap-2">
                                {result.article.title}
                                <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-50 transition-opacity" />
                              </CardTitle>
                            </a>
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                              Indexed:{" "}
                              {new Date(result.article.createdAt!).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`font-mono px-2.5 py-1 ${renderAccuracyColor(result.score)}`}
                          >
                            Match: {result.score.toFixed(1)}%
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-secondary/40 p-4 rounded-xl text-sm leading-relaxed border border-border/50 text-foreground/90">
                            <span className="font-semibold text-primary mb-1 flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5" /> Agent Reasoning:
                            </span>
                            {result.explanation}
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card z-10 pointer-events-none" />
                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                              {result.article.content}
                            </p>
                          </div>
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

      {/* Free Limit Reached Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-md glass-card border-amber-500/20 shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
            </div>
            <DialogTitle className="text-2xl font-display font-bold">
              Free Search Limit Reached
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              You've used all 4 of your free daily searches. 
              Sign in to unlock unlimited queries and build your knowledge base.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => setShowLimitDialog(false)}
            >
              Later
            </Button>
            <Button 
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              onClick={() => setLocation("/auth")}
            >
              <LogIn className="w-4 h-4" />
              Sign In Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

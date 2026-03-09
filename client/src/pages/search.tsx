import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Terminal, Activity, Zap, Cpu, ArrowRight } from "lucide-react";
import { useAgentSearch } from "@/hooks/use-agent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { mutate: search, data, isPending } = useAgentSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    search({ query });
  };

  const renderAccuracyColor = (score: number) => {
    if (score >= 0.8) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 0.5) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
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
            className="w-full pl-16 pr-32 py-8 text-lg rounded-2xl bg-card border-2 border-border shadow-xl shadow-black/5 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary transition-all duration-300"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Button 
              type="submit" 
              size="lg" 
              disabled={isPending || !query.trim()}
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
      </motion.div>

      {/* Results & Analytics Area */}
      <AnimatePresence mode="wait">
        {data && !isPending && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12"
          >
            {/* Left Column: Metrics & Logs */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-panel overflow-hidden border-border/50">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Accuracy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-display font-bold text-foreground">
                      {(data.metrics.retrievalAccuracy * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-panel overflow-hidden border-border/50">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> Latency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-display font-bold text-foreground">
                      {data.metrics.queryTimeMs}ms
                    </div>
                  </CardContent>
                </Card>
              </div>

              {data.logs && data.logs.length > 0 && (
                <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden flex-1 min-h-[300px] flex flex-col">
                  <CardHeader className="bg-slate-900 border-b border-slate-800 p-3">
                    <CardTitle className="text-xs font-mono text-slate-400 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> Agent Execution Logs
                    </CardTitle>
                  </CardHeader>
                  <ScrollArea className="flex-1 p-4 terminal-scroll">
                    <div className="font-mono text-[13px] leading-relaxed text-emerald-400/90 space-y-2">
                      {data.logs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-slate-600 select-none">[{String(i+1).padStart(2, '0')}]</span>
                          <span className="break-words">{log}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>

            {/* Right Column: Semantic Results */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <h3 className="font-display font-bold text-xl flex items-center gap-2">
                Semantic Matches <Badge variant="secondary" className="ml-2 font-mono">{data.results.length}</Badge>
              </h3>
              
              {data.results.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-secondary/20">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold mb-1">No relevant documents found</h4>
                  <p className="text-muted-foreground">The agent couldn't find any articles matching your query context.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.results.map((result, index) => (
                    <motion.div
                      key={result.article.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/30 group">
                        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <CardTitle className="text-xl font-display group-hover:text-primary transition-colors">
                              {result.article.title}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                              ID: {result.article.id} 
                              <Separator orientation="vertical" className="h-3" />
                              Indexed: {new Date(result.article.createdAt!).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant="outline" className={`font-mono px-2.5 py-1 ${renderAccuracyColor(result.score)}`}>
                            Match: {(result.score * 100).toFixed(1)}%
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-secondary/40 p-4 rounded-xl text-sm leading-relaxed border border-border/50 text-foreground/90">
                            <span className="font-semibold text-primary block mb-1 flex items-center gap-2">
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
    </div>
  );
}

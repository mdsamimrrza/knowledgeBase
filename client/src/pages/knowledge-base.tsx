import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { FileText, Trash2, Database, AlertCircle, ShieldCheck, LogIn, ExternalLink, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useArticles, useDeleteArticle } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { ArticleFormDialog } from "@/components/article-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const KNOWLEDGE_VAULT_URL = "https://knowledge-vault.up.railway.app";

export default function KnowledgeBasePage() {
  const { data: user } = useUser();
  const isAdmin = user?.isAdmin;
  const [, setLocation] = useLocation();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useArticles(10);
  const articles = data?.pages.flat() || [];
  const { mutate: deleteArticle, isPending: isDeleting } = useDeleteArticle();

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage the documents the agent uses for semantic search.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Knowledge Vault Redirection */}
          <a href={KNOWLEDGE_VAULT_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
              <ExternalLink className="w-4 h-4" />
              Knowledge Vault
            </Button>
          </a>

          {!user ? (
            <Button 
              variant="outline" 
              className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setLocation("/auth")}
            >
              <LogIn className="w-4 h-4" />
              Sign In to Manage
            </Button>
          ) : !isAdmin ? (
            <Badge variant="outline" className="h-10 px-4 gap-2 border-amber-500/30 text-amber-500 bg-amber-500/5">
              Read-Only Access
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="h-10 px-4 gap-2 border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                <ShieldCheck className="w-4 h-4" />
                Admin Access
              </Badge>
              <a href={`${KNOWLEDGE_VAULT_URL}/new`} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <PlusCircle className="w-4 h-4" />
                  New Article
                </Button>
              </a>
              <ArticleFormDialog />
            </>
          )}
        </div>
      </div>

      <Card className="shadow-lg border-border/60 overflow-hidden glass-panel">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-destructive flex flex-col items-center">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Failed to load articles</h3>
            <p className="opacity-80">Please check your connection and try again.</p>
          </div>
        ) : articles?.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">No documents found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your knowledge base is empty. Add articles in the Knowledge Vault to allow the agent to start answering queries.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[300px] font-semibold">Document Title</TableHead>
                    <TableHead className="font-semibold">Snippet</TableHead>
                    <TableHead className="w-[150px] font-semibold">Date Added</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles?.map((article) => (
                    <TableRow key={article.id} className="group transition-colors">
                      <TableCell className="font-medium align-top pt-4">
                        <div className="flex flex-col gap-1">
                          <a 
                            href={`${KNOWLEDGE_VAULT_URL}/article/${article.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-display text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group/link"
                          >
                            {article.title}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-50 transition-opacity" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="align-top pt-4">
                        <p className="text-sm text-muted-foreground line-clamp-2 max-w-md pr-4">
                          {article.content}
                        </p>
                      </TableCell>
                      <TableCell className="align-top pt-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground font-medium">
                          {article.createdAt ? format(new Date(article.createdAt), "MMM d, yyyy") : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="align-top pt-4 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-2">
                            <a href={`${KNOWLEDGE_VAULT_URL}/edit/${article.id}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                            <DeleteDialog article={article} onDelete={deleteArticle} isDeleting={isDeleting} />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View List */}
            <div className="md:hidden divide-y divide-border/50">
              {articles?.map((article) => (
                <div key={article.id} className="p-4 flex flex-col gap-3 hover:bg-secondary/20 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <a 
                      href={`${KNOWLEDGE_VAULT_URL}/article/${article.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-display font-bold text-foreground leading-tight hover:text-primary"
                    >
                      {article.title}
                    </a>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <a href={`${KNOWLEDGE_VAULT_URL}/edit/${article.id}`} target="_blank" rel="noopener noreferrer">
                           <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                        <DeleteDialog article={article} onDelete={deleteArticle} isDeleting={isDeleting} />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {article.content}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      Added: {article.createdAt ? format(new Date(article.createdAt), "MMM d, yyyy") : "N/A"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono h-5">
                      Manual
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="p-4 flex justify-center border-t border-border/40">
                <Button 
                  variant="outline" 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  className="w-full sm:w-auto"
                >
                  {isFetchingNextPage ? "Loading..." : "Load More Documents"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function DeleteDialog({ article, onDelete, isDeleting }: { article: any, onDelete: any, isDeleting: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border/50 shadow-xl glass-panel w-[90vw] max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Knowledge Document?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete 
            <strong className="text-foreground ml-1">"{article.title}"</strong> and remove its data from the agent's index.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onDelete(article.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            Delete Document
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

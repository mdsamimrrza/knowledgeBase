import { format } from "date-fns";
import { FileText, Trash2, Database, AlertCircle } from "lucide-react";
import { useArticles, useDeleteArticle } from "@/hooks/use-articles";
import { ArticleFormDialog } from "@/components/article-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  Body,
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

export default function KnowledgeBasePage() {
  const { data: articles, isLoading, error } = useArticles();
  const { mutate: deleteArticle, isPending: isDeleting } = useDeleteArticle();

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage the documents the agent uses for semantic search.
          </p>
        </div>
        <ArticleFormDialog />
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
              Your knowledge base is empty. Add articles to allow the agent to start answering queries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                        <span className="font-display text-foreground group-hover:text-primary transition-colors">
                          {article.title}
                        </span>
                        <Badge variant="outline" className="w-fit font-mono text-[10px] text-muted-foreground">
                          ID: {article.id}
                        </Badge>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-border/50 shadow-xl glass-panel">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Knowledge Document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the article 
                              <strong className="text-foreground ml-1">"{article.title}"</strong> and remove its data from the agent's index.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteArticle(article.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={isDeleting}
                            >
                              Delete Document
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

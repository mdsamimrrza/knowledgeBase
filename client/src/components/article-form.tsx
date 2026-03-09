import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertArticleSchema, type InsertArticle } from "@shared/schema";
import { useCreateArticle } from "@/hooks/use-articles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";

export function ArticleFormDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: createArticle, isPending } = useCreateArticle();

  const form = useForm<InsertArticle>({
    resolver: zodResolver(insertArticleSchema),
    defaultValues: {
      title: "",
      content: "",
      metadata: {},
    },
  });

  const onSubmit = (data: InsertArticle) => {
    createArticle(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Add Article
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-border/50 shadow-2xl glass-panel">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">New Knowledge Entry</DialogTitle>
          <DialogDescription>
            Add a new document to the agent's knowledge base. The agent will index this immediately.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. System Architecture Guidelines" 
                      className="bg-secondary/50 focus-visible:ring-primary/20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write the full knowledge base content here..."
                      className="min-h-[200px] bg-secondary/50 resize-none focus-visible:ring-primary/20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isPending}
                className="min-w-[140px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  "Save Document"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

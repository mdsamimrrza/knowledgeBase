import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Database, ShieldCheck, ArrowRight, Loader2, Mail, Lock, ArrowLeft, Cpu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: AuthValues) => {
    setIsLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Authentication failed");
      }

      const data = await res.json();
      localStorage.setItem("admin_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: isLogin ? "Session Established" : "Profile Synced",
        description: "Neural access granted to your workspace.",
      });

      setLocation("/search");
    } catch (error: any) {
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-y-auto lg:overflow-hidden flex flex-col bg-background agentic-gradient relative selection:bg-primary/20">
      {/* Navigation Header */}
      <header className="absolute top-0 w-full p-4 md:p-6 flex justify-between items-center z-50">
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground transition-all px-2 md:px-4"
          onClick={() => setLocation("/search")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Search</span>
          <span className="sm:hidden">Back</span>
        </Button>
        
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Database className="w-5 h-5" />
          <span className="tracking-tight text-foreground font-display hidden xs:inline">NeuralQuery</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative pt-20 pb-10 lg:pt-0 lg:pb-0">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[80px] lg:blur-[100px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-accent/30 rounded-full blur-[80px] lg:blur-[100px] animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px] relative z-10"
        >
          {/* Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider border border-primary/20 shadow-sm shadow-primary/5">
              <Cpu className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Secure Identity Module
            </div>
          </div>

          <Card className="rounded-2xl md:rounded-3xl border-2 border-border/60 bg-card/80 backdrop-blur-2xl shadow-2xl shadow-primary/5 overflow-hidden glass-panel">
            <div className="h-1.5 md:h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
            <CardHeader className="pt-8 md:pt-10 pb-6 md:pb-8 text-center px-6 md:px-8">
              <CardTitle className="text-3xl md:text-4xl font-display font-extrabold tracking-tight mb-2 md:mb-3">
                {isLogin ? "Welcome Back" : "Initialize Account"}
              </CardTitle>
              <CardDescription className="text-sm md:text-base text-muted-foreground">
                {isLogin 
                  ? "Re-establish your neural connection." 
                  : "Start indexing your intelligence today."}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-6 md:px-10 pb-10 md:pb-12">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Identity (Email)</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input 
                              placeholder="admin@neuralquery.io" 
                              className="h-12 md:h-14 pl-11 md:pl-12 rounded-xl md:rounded-2xl bg-background/50 border-2 border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/10 transition-all text-sm md:text-base" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Secret Key</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              className="h-12 md:h-14 pl-11 md:pl-12 rounded-xl md:rounded-2xl bg-background/50 border-2 border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/10 transition-all text-sm md:text-base" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 md:h-14 mt-4 rounded-xl md:rounded-2xl text-base md:text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98] group"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2 md:gap-3">
                        {isLogin ? "Authenticate" : "Create Profile"}
                        <ArrowRight className="w-4 md:w-5 h-4 md:h-5 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-8 md:mt-10 flex flex-col items-center gap-4 md:gap-6">
                <div className="flex items-center gap-3 md:gap-4 w-full">
                  <div className="h-px bg-border/50 flex-1" />
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Module Select</span>
                  <div className="h-px bg-border/50 flex-1" />
                </div>
                
                <div className="text-xs md:text-sm text-muted-foreground">
                  {isLogin ? "Not yet registered?" : "Profile already exists?"}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-2 text-primary font-bold hover:underline underline-offset-4"
                  >
                    {isLogin ? "Create Local Account" : "Login to Workspace"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Branding */}
          <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" />
              RSA-256 Encrypted
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Agentic Sync Active
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

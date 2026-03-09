import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Sparkles } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background agentic-gradient">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full overflow-hidden relative">
          <header className="flex items-center justify-between p-4 md:px-6 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover-elevate active-elevate-2" />
              <div className="flex items-center gap-2 text-primary font-semibold hidden sm:flex">
                <Sparkles className="w-5 h-5" />
                <span className="tracking-tight text-foreground font-display">NeuralQuery</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                System Online
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

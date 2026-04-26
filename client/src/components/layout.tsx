import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Sparkles, LogOut, LogIn, ShieldCheck, CalendarDays } from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="hover-elevate active-elevate-2 shrink-0" />
              <Link href="/search" className="flex md:hidden items-center gap-2 text-primary font-semibold min-w-0">
                <Sparkles className="w-5 h-5" />
                <span className="truncate tracking-tight text-foreground font-display text-lg sm:text-base">
                  NeuralQuery
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden md:flex items-center gap-4 mr-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  System Online
                </div>
              </div>
              <div className="md:hidden">
                <AuthProfile />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto h-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthProfile() {
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return (
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => setLocation("/auth")}>
        <LogIn className="w-4 h-4" />
        Login
      </Button>
    );
  }

  const displayName = user.username || user.email.split("@")[0];
  const initial = (user.username?.[0] || user.email[0]).toUpperCase();
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Unavailable";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-transparent p-0 hover:bg-transparent"
        >
          <Avatar className="h-10 w-10 sm:h-10 sm:w-10">
            <AvatarFallback className="bg-primary text-primary-foreground uppercase">
              {initial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[232px] sm:w-[248px] md:w-72 rounded-[26px] sm:rounded-3xl border border-border/70 bg-background/95 p-0 shadow-2xl"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <Avatar className="h-9 w-9 sm:h-11 sm:w-11">
                <AvatarFallback className="bg-primary text-primary-foreground uppercase">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm sm:text-base font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-[11px] sm:text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 rounded-2xl bg-muted/60 px-3 py-3 sm:px-4">
              <div className="mb-2.5 sm:mb-3 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Account Details
              </div>
              <div className="rounded-2xl bg-background/80 px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm">
                <p className="text-xs sm:text-sm text-muted-foreground">Member since:</p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-foreground">{memberSince}</p>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center gap-2 text-[11px] sm:text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {user.isAdmin ? "Administrator" : "Verified Member"}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <DropdownMenuItem
            onClick={logout}
            className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary focus:bg-primary/15 focus:text-primary sm:px-4 sm:py-3 sm:text-sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out Securely</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { CalendarDays, Database, Library, LogIn, LogOut, Mail, Search, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { title: "Agent Search", url: "/search", icon: Search },
  { title: "Knowledge Base", url: "/knowledge-base", icon: Database },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();

  const displayName = user?.username || user?.email?.split("@")[0] || "Guest";
  const initial = (user?.username?.[0] || user?.email?.[0] || "N").toUpperCase();
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar variant="sidebar" className="border-r border-border/50">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 md:hidden">
        <Link href="/search" className="flex items-center gap-2" onClick={handleNavClick}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">NeuralQuery</span>
        </Link>
      </SidebarHeader>

      <SidebarHeader className="hidden md:flex px-5 pt-5 pb-3">
        <Link href="/search" className="flex items-center gap-3" onClick={handleNavClick}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold tracking-tight text-foreground">
              NeuralQuery
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Workspace
            </p>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-3 pb-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (location === "/" && item.url === "/search");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                      className={`
                        mb-1 transition-all duration-200
                        ${isActive ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/10" : "text-muted-foreground hover:text-foreground"}
                      `}
                    >
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-3 py-2 rounded-md"
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="hidden md:block px-4 pb-5 pt-2">
        {isLoading ? (
          <div className="h-40 rounded-[28px] bg-background/70 animate-pulse" />
        ) : user ? (
          <div className="rounded-[28px] border border-border/60 bg-background/90 p-4 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/12 text-primary text-lg font-bold uppercase">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1.05rem] font-semibold text-foreground">{displayName}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {user.isAdmin ? "Administrator" : "Verified Member"}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-border/60 pt-3 space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary/80" />
                <span className="truncate">{user.email}</span>
              </div>
              {memberSince ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-primary/80" />
                  <span>Since {memberSince}</span>
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="mt-4 h-11 w-full justify-start rounded-2xl border-primary/20 bg-primary/10 px-4 text-sm font-semibold text-primary hover:bg-primary/15 hover:text-primary"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Button asChild className="h-12 w-full rounded-2xl">
            <Link href="/auth" onClick={handleNavClick} className="flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

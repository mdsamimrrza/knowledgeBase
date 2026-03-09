import { Database, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Agent Search", url: "/search", icon: Search },
  { title: "Knowledge Base", url: "/knowledge-base", icon: Database },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar variant="sidebar" className="border-r border-border/50">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 sm:hidden">
        {/* Mobile only branding */}
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Search className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight">NeuralQuery</span>
      </SidebarHeader>
      
      <SidebarContent>
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
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-md">
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
    </Sidebar>
  );
}

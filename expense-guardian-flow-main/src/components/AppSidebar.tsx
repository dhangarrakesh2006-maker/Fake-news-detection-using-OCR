import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Newspaper, Search, History, Settings, BarChart3, LogOut, ChevronLeft, ShieldCheck, UserRound, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type AppRole = "employee" | "manager" | "admin" | "ceo";

const navItems: { icon: any; label: string; path: string; allowedRoles: AppRole[] }[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", allowedRoles: ["employee", "manager", "admin", "ceo"] },
  { icon: UserRound, label: "User panel", path: "/user-panel", allowedRoles: ["employee", "manager", "admin", "ceo"] },
  { icon: Search, label: "Analyze story", path: "/analyze", allowedRoles: ["employee", "manager", "admin", "ceo"] },
  { icon: History, label: "Scan history", path: "/history", allowedRoles: ["employee", "manager", "admin", "ceo"] },
  { icon: BarChart3, label: "Reports", path: "/reports", allowedRoles: ["manager", "admin", "ceo"] },
  { icon: ShieldCheck, label: "Source guide", path: "/sources", allowedRoles: ["employee", "manager", "admin", "ceo"] },
  { icon: SlidersHorizontal, label: "Admin panel", path: "/admin-panel", allowedRoles: ["admin", "ceo"] },
  { icon: Settings, label: "Settings", path: "/settings", allowedRoles: ["employee", "manager", "admin", "ceo"] },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roles, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const primaryRole = roles.includes("ceo") ? "ceo" : roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : "employee";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar sidebar-glow flex flex-col transition-all duration-300 z-50",
      collapsed || isMobile ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <Newspaper className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && !isMobile && (
          <span className="font-display font-bold text-sidebar-foreground text-lg tracking-tight">
            Fake News Detection
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto p-1 rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            collapsed && "ml-0"
          )}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems
          .filter((item) => item.allowedRoles.some(r => roles.includes(r)))
          .map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && !isMobile && <span>{item.label}</span>}
                {active && !collapsed && !isMobile && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                )}
              </Link>
            );
          })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg",
          collapsed && "justify-center px-0"
        )}>
          <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 text-sidebar-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
            U
          </div>
          {!collapsed && !isMobile && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                User
              </p>
              <p className="text-xs text-sidebar-muted capitalize">{primaryRole}</p>
            </div>
          )}
          {!collapsed && !isMobile && (
            <button onClick={handleSignOut} className="p-1 text-sidebar-muted hover:text-sidebar-foreground transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

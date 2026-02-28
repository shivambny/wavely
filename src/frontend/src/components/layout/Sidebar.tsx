import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Library, LogIn, LogOut, Search, User } from "lucide-react";
import { motion } from "motion/react";

const navItems = [
  { to: "/" as const, icon: Home, label: "Home" },
  { to: "/search" as const, icon: Search, label: "Search" },
  { to: "/library" as const, icon: Library, label: "Library" },
];

export function Sidebar() {
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-4)}`
    : null;

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 h-full bg-sidebar border-r border-sidebar-border flex-shrink-0">
      {/* Logo */}
      <div className="p-6 pb-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <img
            src="/assets/generated/wavely-logo-transparent.dim_120x120.png"
            alt="Wavely"
            className="w-8 h-8"
          />
          <span className="text-xl font-bold font-display gradient-text tracking-tight">
            Wavely
          </span>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }, i) => {
          const isActive =
            to === "/" ? currentPath === "/" : currentPath.startsWith(to);
          return (
            <motion.div
              key={to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 + 0.1 }}
            >
              <Link
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "sidebar-active text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Auth section */}
      <div className="p-4 border-t border-sidebar-border">
        {isLoggedIn ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full btn-gradient flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {shortPrincipal}
              </span>
            </div>
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={login}
            disabled={isLoggingIn}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium btn-gradient text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            <LogIn size={16} />
            {isLoggingIn ? "Signing in..." : "Sign in"}
          </button>
        )}
      </div>
    </aside>
  );
}

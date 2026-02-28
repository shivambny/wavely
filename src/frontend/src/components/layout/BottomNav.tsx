import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Library, Search } from "lucide-react";

const navItems = [
  { to: "/" as const, icon: Home, label: "Home" },
  { to: "/search" as const, icon: Search, label: "Search" },
  { to: "/library" as const, icon: Library, label: "Library" },
];

export function BottomNav() {
  const { currentTrack } = usePlayer();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border",
        currentTrack && "bottom-[73px]",
      )}
    >
      <div className="flex items-center justify-around h-14 px-4">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === "/" ? currentPath === "/" : currentPath.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all",
                isActive
                  ? "text-wavely-violet"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

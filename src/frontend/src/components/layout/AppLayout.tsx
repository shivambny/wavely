import { PlayerBar } from "@/components/player/PlayerBar";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentTrack } = usePlayer();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      {/* Main content area */}
      <main
        className={cn(
          "flex-1 overflow-y-auto min-w-0",
          // Account for player bar height + mobile nav
          currentTrack ? "pb-[calc(73px+56px)] md:pb-20" : "pb-16 md:pb-0",
        )}
      >
        {children}
      </main>

      {/* Player bar */}
      <PlayerBar />

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

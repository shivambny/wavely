import { TrackCard } from "@/components/track/TrackCard";
import { TrackListSkeleton } from "@/components/track/TrackSkeleton";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/context/PlayerContext";
import {
  useDeletePlaylist,
  useFeaturedTracks,
  usePlaylist,
} from "@/hooks/useQueries";
import type { Track } from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ListMusic, Play, Shuffle, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export function PlaylistPage() {
  const { id } = useParams({ from: "/playlist/$id" });
  const navigate = useNavigate();
  const { playTrack, toggleShuffle } = usePlayer();

  const playlist = usePlaylist(id ?? "");
  const deletePlaylist = useDeletePlaylist();
  const featured = useFeaturedTracks();

  // Resolve track IDs to Track objects
  const featuredMap = new Map((featured.data ?? []).map((t) => [t.id, t]));
  const tracks: Track[] = (playlist.data?.trackIds ?? [])
    .map((tid) => featuredMap.get(tid))
    .filter(Boolean) as Track[];

  const handlePlay = () => {
    if (tracks.length > 0 && tracks[0]) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      toggleShuffle();
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      if (randomTrack) playTrack(randomTrack, tracks);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    deletePlaylist.mutate(id, {
      onSuccess: () => {
        toast.success("Playlist deleted");
        void navigate({ to: "/library" });
      },
      onError: () => toast.error("Failed to delete playlist"),
    });
  };

  if (playlist.isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 bg-white/5 rounded-full animate-pulse mb-8" />
        <TrackListSkeleton count={8} />
      </div>
    );
  }

  if (playlist.error || !playlist.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-8 text-center">
        <p className="text-lg font-semibold mb-2">Playlist not found</p>
        <Button
          variant="ghost"
          onClick={() => void navigate({ to: "/library" })}
          className="rounded-full"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-mesh min-h-full">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-wavely-violet/20 to-background pointer-events-none" />
        <div className="relative p-4 md:p-8 pb-6">
          <button
            type="button"
            onClick={() => void navigate({ to: "/library" })}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-6"
          >
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl btn-gradient flex items-center justify-center shadow-glow flex-shrink-0">
              <ListMusic size={48} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Playlist
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-2 truncate">
                {playlist.data.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {tracks.length} track{tracks.length !== 1 ? "s" : ""}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={tracks.length === 0}
                  className="w-12 h-12 rounded-full btn-gradient flex items-center justify-center shadow-glow hover:scale-105 transition-transform disabled:opacity-50"
                >
                  <Play size={20} fill="white" className="text-white ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={handleShuffle}
                  disabled={tracks.length === 0}
                  className="p-3 rounded-full bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <Shuffle size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-3 rounded-full bg-white/5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tracks */}
      <div className="p-4 md:p-8 pt-0">
        {tracks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tracks.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                queue={tracks}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ListMusic size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No tracks in this playlist</p>
            <p className="text-sm mt-1 opacity-70">
              Browse music and add tracks from the context menu
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

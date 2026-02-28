import type { OfflineTrack } from "@/backend";
import { TrackCard } from "@/components/track/TrackCard";
import { TrackListSkeleton } from "@/components/track/TrackSkeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlayer } from "@/context/PlayerContext";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useCreatePlaylist,
  useDeletePlaylist,
  useFeaturedTracks,
  useLikedTracks,
  useMyPlaylists,
  useOfflineTracks,
} from "@/hooks/useQueries";
import type { Track } from "@/types";
import { formatBigIntDuration } from "@/utils/format";
import { useNavigate } from "@tanstack/react-router";
import {
  Download,
  Heart,
  ListMusic,
  Loader2,
  LogIn,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

function offlineToTrack(t: OfflineTrack): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    albumArt: t.albumArt,
    audioUrl: t.audioUrl,
    genre: t.genre,
    duration: Number(t.duration),
  };
}

export function LibraryPage() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const navigate = useNavigate();

  const likedTrackIds = useLikedTracks();
  const playlists = useMyPlaylists();
  const offlineTracks = useOfflineTracks();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const featured = useFeaturedTracks();
  const { playTrack } = usePlayer();

  // Resolve liked track IDs to Track objects using featured tracks as a pool
  const featuredMap = new Map((featured.data ?? []).map((t) => [t.id, t]));
  const likedTracksResolved: Track[] = (likedTrackIds.data ?? [])
    .map((id) => featuredMap.get(id))
    .filter(Boolean) as Track[];

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist.mutate(newPlaylistName, {
      onSuccess: () => {
        toast.success(`Playlist "${newPlaylistName}" created`);
        setNewPlaylistName("");
        setCreateOpen(false);
      },
      onError: () => toast.error("Failed to create playlist"),
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-gradient-mesh min-h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm"
        >
          <div className="w-20 h-20 rounded-full btn-gradient flex items-center justify-center mx-auto mb-6 shadow-glow">
            <ListMusic size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-2">Your Library</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Sign in to access your liked songs, playlists, and offline tracks
          </p>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="btn-gradient text-white border-0 px-8 rounded-full hover:opacity-90"
          >
            {isLoggingIn ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <LogIn size={16} className="mr-2" />
            )}
            {isLoggingIn ? "Signing in..." : "Sign in"}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-mesh min-h-full p-4 md:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-2 mb-6"
      >
        <h1 className="text-3xl font-bold font-display gradient-text">
          Your Library
        </h1>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="btn-gradient text-white border-0 rounded-full hover:opacity-90"
            >
              <Plus size={16} className="mr-1" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Create Playlist</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="My awesome playlist..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              className="bg-secondary border-border"
              autoFocus
            />
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || createPlaylist.isPending}
                className="btn-gradient text-white border-0 rounded-full"
              >
                {createPlaylist.isPending ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs defaultValue="liked" className="w-full">
        <TabsList className="bg-secondary/50 rounded-full mb-6 p-1 h-auto">
          <TabsTrigger
            value="liked"
            className="rounded-full data-[state=active]:btn-gradient data-[state=active]:text-white text-muted-foreground px-3 py-1.5 text-sm"
          >
            <Heart size={14} className="mr-1.5" />
            Liked Songs
            {(likedTrackIds.data?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                {likedTrackIds.data?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="playlists"
            className="rounded-full data-[state=active]:btn-gradient data-[state=active]:text-white text-muted-foreground px-3 py-1.5 text-sm"
          >
            <ListMusic size={14} className="mr-1.5" />
            Playlists
            {(playlists.data?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                {playlists.data?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="offline"
            className="rounded-full data-[state=active]:btn-gradient data-[state=active]:text-white text-muted-foreground px-3 py-1.5 text-sm"
          >
            <Download size={14} className="mr-1.5" />
            Offline
            {(offlineTracks.data?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                {offlineTracks.data?.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Liked Songs */}
        <TabsContent value="liked">
          <AnimatePresence mode="wait">
            {likedTrackIds.isLoading ? (
              <TrackListSkeleton count={6} />
            ) : likedTracksResolved.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              >
                {likedTracksResolved.map((track, i) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    queue={likedTracksResolved}
                    index={i}
                  />
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={<Heart size={40} className="text-muted-foreground/50" />}
                title="No liked songs yet"
                description="Songs you like will appear here"
              />
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Playlists */}
        <TabsContent value="playlists">
          <AnimatePresence mode="wait">
            {playlists.isLoading ? (
              <TrackListSkeleton count={4} />
            ) : (playlists.data?.length ?? 0) > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {(playlists.data ?? []).map((pl, i) => (
                  <motion.div
                    key={pl.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card glass-card-hover rounded-2xl p-4 cursor-pointer group"
                    onClick={() =>
                      void navigate({
                        to: "/playlist/$id",
                        params: { id: pl.id },
                      })
                    }
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl btn-gradient flex items-center justify-center shadow-glow">
                        <ListMusic size={20} className="text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist.mutate(pl.id, {
                            onSuccess: () => toast.success("Playlist deleted"),
                          });
                        }}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="font-semibold text-sm truncate">{pl.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pl.trackIds.length} track
                      {pl.trackIds.length !== 1 ? "s" : ""}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={
                  <ListMusic size={40} className="text-muted-foreground/50" />
                }
                title="No playlists yet"
                description="Create a playlist to organize your music"
                action={
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="btn-gradient text-white border-0 rounded-full"
                  >
                    <Plus size={14} className="mr-1" />
                    Create Playlist
                  </Button>
                }
              />
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Offline Tracks */}
        <TabsContent value="offline">
          <AnimatePresence mode="wait">
            {offlineTracks.isLoading ? (
              <TrackListSkeleton count={5} />
            ) : (offlineTracks.data?.length ?? 0) > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1"
              >
                {(offlineTracks.data ?? []).map((t, i) => {
                  const track = offlineToTrack(t);
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => playTrack(track)}
                    >
                      <img
                        src={t.albumArt}
                        alt={t.title}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://api.dicebear.com/7.x/shapes/svg?seed=${t.id}`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.artist}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(track);
                          }}
                          className="p-1.5 rounded-full btn-gradient text-white"
                        >
                          <Play size={12} fill="currentColor" />
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                        {formatBigIntDuration(t.duration)}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <EmptyState
                icon={
                  <Download size={40} className="text-muted-foreground/50" />
                }
                title="No offline tracks"
                description="Save tracks to listen without internet"
              />
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-4 opacity-60">{icon}</div>
      <p className="font-semibold text-base mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {action}
    </motion.div>
  );
}

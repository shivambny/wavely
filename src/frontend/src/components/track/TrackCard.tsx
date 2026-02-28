import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlayer } from "@/context/PlayerContext";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useAddTrackToPlaylist,
  useLikeTrack,
  useLikedTracks,
  useMyPlaylists,
  useSaveOfflineTrack,
  useUnlikeTrack,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import type { Track } from "@/types";
import { formatDuration } from "@/utils/format";
import { Download, Heart, MoreVertical, Pause, Play, Plus } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface TrackCardProps {
  track: Track;
  queue?: Track[];
  index?: number;
  variant?: "grid" | "list";
  showIndex?: boolean;
}

export function TrackCard({
  track,
  queue,
  index,
  variant = "grid",
  showIndex = false,
}: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: likedTracks = [] } = useLikedTracks();
  const likeTrack = useLikeTrack();
  const unlikeTrack = useUnlikeTrack();
  const saveOffline = useSaveOfflineTrack();
  const { data: playlists = [] } = useMyPlaylists();
  const addToPlaylist = useAddTrackToPlaylist();

  const isCurrentTrack = currentTrack?.id === track.id;
  const isActive = isCurrentTrack && isPlaying;
  const isLiked = likedTracks.includes(track.id);

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(track, queue ?? [track]);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      toast.error("Sign in to like tracks");
      return;
    }
    if (isLiked) {
      unlikeTrack.mutate(track.id);
    } else {
      likeTrack.mutate(track.id);
    }
  };

  const handleSaveOffline = () => {
    if (!isLoggedIn) {
      toast.error("Sign in to save tracks offline");
      return;
    }
    saveOffline.mutate(track, {
      onSuccess: () => toast.success(`"${track.title}" saved offline`),
      onError: () => toast.error("Failed to save offline"),
    });
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addToPlaylist.mutate(
      { playlistId, trackId: track.id },
      {
        onSuccess: () => toast.success("Added to playlist"),
        onError: () => toast.error("Failed to add to playlist"),
      },
    );
  };

  if (variant === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: (index ?? 0) * 0.04 }}
        onClick={handlePlay}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer group",
          "hover:bg-white/5 transition-all duration-200",
          isCurrentTrack && "bg-white/5",
        )}
      >
        {showIndex && (
          <div className="w-6 text-center flex-shrink-0">
            {isActive ? (
              <div className="flex gap-px items-end justify-center">
                <div className="w-0.5 h-3 bg-wavely-violet rounded-full animate-eq-bar-1" />
                <div className="w-0.5 h-3 bg-wavely-pink rounded-full animate-eq-bar-2" />
                <div className="w-0.5 h-3 bg-wavely-violet rounded-full animate-eq-bar-3" />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground group-hover:hidden">
                {(index ?? 0) + 1}
              </span>
            )}
            <button
              type="button"
              className="hidden group-hover:flex items-center justify-center"
            >
              <Play size={12} fill="currentColor" className="text-foreground" />
            </button>
          </div>
        )}

        <img
          src={track.albumArt}
          alt={track.title}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://api.dicebear.com/7.x/shapes/svg?seed=${track.id}`;
          }}
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isCurrentTrack ? "gradient-text-soft" : "text-foreground",
            )}
          >
            {track.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {track.artist}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            type="button"
            onClick={handleLike}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              isLiked
                ? "text-wavely-pink"
                : "text-muted-foreground hover:text-wavely-pink",
            )}
          >
            <Heart
              size={13}
              fill={isLiked ? "currentColor" : "none"}
              strokeWidth={isLiked ? 0 : 2}
            />
          </motion.button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-popover border-border"
            >
              <DropdownMenuItem onClick={handleSaveOffline}>
                <Download size={14} className="mr-2" />
                Save Offline
              </DropdownMenuItem>
              {playlists.map((pl) => (
                <DropdownMenuItem
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id)}
                >
                  <Plus size={14} className="mr-2" />
                  Add to {pl.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
          {formatDuration(track.duration)}
        </span>
      </motion.div>
    );
  }

  // ── Grid variant ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min((index ?? 0) * 0.04, 0.5),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -5 }}
      className="group cursor-pointer"
      onClick={handlePlay}
    >
      {/* Album art container */}
      <div
        className={cn(
          "relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-card transition-shadow duration-300",
          isCurrentTrack && "track-card-active-ring",
        )}
      >
        <img
          src={track.albumArt}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://api.dicebear.com/7.x/shapes/svg?seed=${track.id}`;
          }}
          style={{ transform: undefined }}
        />

        {/* Persistent bottom gradient */}
        <div className="track-card-overlay absolute inset-0 pointer-events-none" />

        {/* Hover: spotlight overlay (radial, not flat darkening) */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 track-card-play-spotlight" />

        {/* Play button — scales in on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <motion.div
            initial={false}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="w-11 h-11 rounded-full btn-gradient flex items-center justify-center shadow-glow"
          >
            {isCurrentTrack && isPlaying ? (
              <Pause size={18} fill="white" className="text-white" />
            ) : (
              <Play size={18} fill="white" className="text-white ml-0.5" />
            )}
          </motion.div>
        </div>

        {/* Currently playing EQ indicator */}
        {isActive && (
          <div className="absolute top-2 right-2 flex gap-px items-end bg-black/40 backdrop-blur-sm rounded-sm px-1 py-0.5">
            <div
              className="w-0.5 bg-wavely-violet rounded-full animate-eq-bar-1"
              style={{ height: "8px" }}
            />
            <div
              className="w-0.5 bg-wavely-pink rounded-full animate-eq-bar-2"
              style={{ height: "8px" }}
            />
            <div
              className="w-0.5 bg-wavely-violet rounded-full animate-eq-bar-3"
              style={{ height: "8px" }}
            />
          </div>
        )}

        {/* Like button — persistent if liked, appears on hover otherwise */}
        <div
          className={cn(
            "absolute bottom-2 left-2 transition-opacity duration-200",
            isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <motion.button
            type="button"
            onClick={handleLike}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition-colors",
              isLiked
                ? "bg-wavely-pink/25 text-wavely-pink"
                : "bg-black/45 text-white/70 hover:text-wavely-pink",
            )}
          >
            <Heart
              size={12}
              fill={isLiked ? "currentColor" : "none"}
              strokeWidth={isLiked ? 0 : 2}
            />
          </motion.button>
        </div>

        {/* Context menu */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-full bg-black/45 backdrop-blur-sm text-white/70 hover:text-foreground transition-colors"
              >
                <MoreVertical size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-popover border-border"
            >
              <DropdownMenuItem onClick={handleSaveOffline}>
                <Download size={14} className="mr-2" />
                Save Offline
              </DropdownMenuItem>
              {playlists.map((pl) => (
                <DropdownMenuItem
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id)}
                >
                  <Plus size={14} className="mr-2" />
                  Add to {pl.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Track metadata */}
      <div className="px-0.5">
        <p
          className={cn(
            "text-[13px] font-semibold truncate leading-snug",
            isCurrentTrack ? "gradient-text-soft" : "text-foreground",
          )}
        >
          {track.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug">
          {track.artist}
        </p>
      </div>
    </motion.div>
  );
}

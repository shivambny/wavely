import { usePlayer } from "@/context/PlayerContext";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useAddRecentlyPlayed,
  useLikeTrack,
  useLikedTracks,
  useSaveOfflineTrack,
  useUnlikeTrack,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/format";
import {
  Download,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isLoading,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    queue,
  } = usePlayer();

  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: likedTracks = [] } = useLikedTracks();
  const likeTrack = useLikeTrack();
  const unlikeTrack = useUnlikeTrack();
  const saveOffline = useSaveOfflineTrack();
  const addRecentlyPlayed = useAddRecentlyPlayed();

  const isLiked = currentTrack ? likedTracks.includes(currentTrack.id) : false;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLike = () => {
    if (!currentTrack) return;
    if (!isLoggedIn) {
      toast.error("Sign in to like tracks");
      return;
    }
    if (isLiked) {
      unlikeTrack.mutate(currentTrack.id);
    } else {
      likeTrack.mutate(currentTrack.id);
      addRecentlyPlayed.mutate(currentTrack.id);
    }
  };

  const handleSaveOffline = () => {
    if (!currentTrack) return;
    if (!isLoggedIn) {
      toast.error("Sign in to save tracks offline");
      return;
    }
    saveOffline.mutate(currentTrack, {
      onSuccess: () => toast.success(`"${currentTrack.title}" saved offline`),
      onError: () => toast.error("Failed to save offline"),
    });
  };

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-50 player-gradient"
        >
          {/* ── Seek bar (full-width, interactive, larger hit area) ── */}
          <div className="player-seek relative group cursor-pointer px-0">
            {/* Track */}
            <div className="relative h-1 group-hover:h-1.5 transition-all duration-150 bg-white/8 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full seek-bar-filled transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Invisible range for interaction — tall hit target */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              step={0.1}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="absolute inset-0 w-full h-5 -top-2 opacity-0 cursor-pointer"
              aria-label="Seek"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-4 px-3 md:px-5 py-3">
            {/* ── Track Info ── */}
            <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none md:w-60">
              <div className="relative flex-shrink-0">
                <motion.div
                  animate={
                    isPlaying
                      ? {
                          boxShadow: [
                            "0 0 0px oklch(0.62 0.22 295 / 0)",
                            "0 0 18px oklch(0.62 0.22 295 / 0.55)",
                            "0 0 0px oklch(0.62 0.22 295 / 0)",
                          ],
                        }
                      : { boxShadow: "0 0 0px transparent" }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="rounded-xl"
                >
                  <img
                    src={currentTrack.albumArt}
                    alt={currentTrack.title}
                    className="w-11 h-11 rounded-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/shapes/svg?seed=${currentTrack.id}`;
                    }}
                  />
                </motion.div>
                {isPlaying && (
                  <div className="absolute -bottom-1 -right-1 flex gap-px items-end bg-background rounded-sm px-0.5 py-px">
                    <div
                      className="w-0.5 bg-wavely-violet rounded-full animate-eq-bar-1"
                      style={{ height: "6px" }}
                    />
                    <div
                      className="w-0.5 bg-wavely-pink rounded-full animate-eq-bar-2"
                      style={{ height: "6px" }}
                    />
                    <div
                      className="w-0.5 bg-wavely-violet rounded-full animate-eq-bar-3"
                      style={{ height: "6px" }}
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-snug text-foreground">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-muted-foreground truncate leading-snug">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* ── Center Controls ── */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="flex items-center gap-1 md:gap-3">
                {/* Shuffle */}
                <motion.button
                  type="button"
                  onClick={toggleShuffle}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "hidden sm:flex p-2 rounded-full transition-colors",
                    shuffle
                      ? "text-wavely-violet"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Shuffle"
                >
                  <Shuffle size={14} />
                </motion.button>

                {/* Prev */}
                <motion.button
                  type="button"
                  onClick={playPrev}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
                  aria-label="Previous"
                >
                  <SkipBack size={19} fill="currentColor" />
                </motion.button>

                {/* Play/Pause — primary CTA */}
                <motion.button
                  type="button"
                  onClick={togglePlay}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className="w-11 h-11 md:w-13 md:h-13 rounded-full btn-gradient flex items-center justify-center shadow-glow relative overflow-hidden"
                  style={{ width: "2.75rem", height: "2.75rem" }}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {/* inner highlight */}
                  <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause
                      size={18}
                      fill="white"
                      className="text-white relative z-10"
                    />
                  ) : (
                    <Play
                      size={18}
                      fill="white"
                      className="text-white ml-0.5 relative z-10"
                    />
                  )}
                </motion.button>

                {/* Next */}
                <motion.button
                  type="button"
                  onClick={playNext}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
                  aria-label="Next"
                >
                  <SkipForward size={19} fill="currentColor" />
                </motion.button>

                {/* Repeat */}
                <motion.button
                  type="button"
                  onClick={toggleRepeat}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "hidden sm:flex p-2 rounded-full transition-colors",
                    repeat !== "none"
                      ? "text-wavely-violet"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Repeat"
                >
                  {repeat === "one" ? (
                    <Repeat1 size={14} />
                  ) : (
                    <Repeat size={14} />
                  )}
                </motion.button>
              </div>

              {/* Time + seek — desktop only */}
              <div className="hidden md:flex items-center gap-2 w-full max-w-sm">
                <span className="text-[11px] text-muted-foreground w-8 text-right tabular-nums shrink-0">
                  {formatDuration(currentTime)}
                </span>
                <div className="player-seek relative flex-1 group cursor-pointer">
                  <div className="relative h-0.5 group-hover:h-1 transition-all duration-150 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full seek-bar-filled rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    step={0.1}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="absolute inset-0 w-full h-6 -top-2.5 opacity-0 cursor-pointer"
                    aria-label="Seek track"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground w-8 tabular-nums shrink-0">
                  {formatDuration(duration)}
                </span>
              </div>
            </div>

            {/* ── Right Controls ── */}
            <div className="flex items-center gap-0.5 md:gap-1.5 flex-none md:w-60 justify-end">
              {/* Like */}
              <motion.button
                type="button"
                onClick={handleLike}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isLiked
                    ? "text-wavely-pink"
                    : "text-muted-foreground hover:text-wavely-pink",
                )}
                aria-label={isLiked ? "Unlike" : "Like"}
              >
                <Heart
                  size={15}
                  fill={isLiked ? "currentColor" : "none"}
                  strokeWidth={isLiked ? 0 : 2}
                />
              </motion.button>

              {/* Download */}
              <motion.button
                type="button"
                onClick={handleSaveOffline}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                className="hidden md:flex p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Save offline"
              >
                <Download size={15} />
              </motion.button>

              {/* Volume */}
              <div className="hidden md:flex items-center gap-1.5">
                <motion.button
                  type="button"
                  onClick={toggleMute}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={15} />
                  ) : (
                    <Volume2 size={15} />
                  )}
                </motion.button>
                <div className="player-seek relative w-[72px]">
                  <div className="relative h-0.5 rounded-full bg-white/10 overflow-hidden pointer-events-none">
                    <div
                      className="absolute left-0 top-0 h-full seek-bar-filled rounded-full"
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="absolute inset-0 w-full h-5 -top-2 opacity-0 cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Queue count */}
              {queue.length > 1 && (
                <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-full chip-default">
                  <ListMusic size={11} />
                  <span>{queue.length}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

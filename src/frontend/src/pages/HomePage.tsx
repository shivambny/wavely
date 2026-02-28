import { TrackCard } from "@/components/track/TrackCard";
import { GridSkeleton } from "@/components/track/TrackSkeleton";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useFeaturedTracks,
  useGenreTracks,
  useNewReleases,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { GENRES } from "@/lib/youtube";
import { motion } from "motion/react";
import { useState } from "react";

const GREETING_TIMES = ["morning", "afternoon", "evening"] as const;
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return GREETING_TIMES[0];
  if (hour < 18) return GREETING_TIMES[1];
  return GREETING_TIMES[2];
}

export function HomePage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { identity } = useInternetIdentity();
  const greeting = getGreeting();

  const featured = useFeaturedTracks();
  const newReleases = useNewReleases();
  const genreTracks = useGenreTracks(selectedGenre ?? "", !!selectedGenre);

  return (
    <div className="bg-gradient-mesh min-h-full p-4 md:p-6 lg:p-8 space-y-10">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: [0.22, 1, 0.36, 1] }}
        className="pt-2"
      >
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mb-1.5">
          Good {greeting}
          {identity && " 👋"}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold font-display gradient-text leading-none">
          Discover Music
        </h1>
      </motion.div>

      {/* ── Genre chips ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedGenre(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
              selectedGenre === null
                ? "btn-gradient text-white shadow-glow"
                : "chip-default text-muted-foreground",
            )}
          >
            All
          </motion.button>
          {GENRES.map((genre) => (
            <motion.button
              type="button"
              key={genre.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() =>
                setSelectedGenre(selectedGenre === genre.id ? null : genre.id)
              }
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                selectedGenre === genre.id
                  ? "text-white shadow-md"
                  : "chip-default text-muted-foreground",
              )}
              style={
                selectedGenre === genre.id
                  ? { background: genre.color }
                  : undefined
              }
            >
              {genre.label}
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Genre tracks ── */}
      {selectedGenre && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          key={selectedGenre}
          transition={{ ease: [0.22, 1, 0.36, 1] }}
        >
          <SectionHeader
            title={`${GENRES.find((g) => g.id === selectedGenre)?.label ?? selectedGenre} Tracks`}
          />
          {genreTracks.isLoading ? (
            <GridSkeleton count={8} />
          ) : genreTracks.data && genreTracks.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {genreTracks.data.map((track, i) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  queue={genreTracks.data}
                  index={i}
                />
              ))}
            </div>
          ) : genreTracks.isError ? (
            <ErrorState message="Couldn't load tracks for this genre" />
          ) : (
            <EmptyState message="No tracks found for this genre" />
          )}
        </motion.section>
      )}

      {/* ── Featured / Trending ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeader title="Trending Now" />
        {featured.isLoading ? (
          <GridSkeleton count={10} />
        ) : featured.error ? (
          <ErrorState message="Couldn't load trending tracks" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {(featured.data ?? []).map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                queue={featured.data}
                index={i}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* ── New Releases ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeader title="New Releases" />
        {newReleases.isLoading ? (
          <GridSkeleton count={8} />
        ) : newReleases.error ? (
          <ErrorState message="Couldn't load new releases" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {(newReleases.data ?? []).slice(0, 12).map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                queue={newReleases.data}
                index={i}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Footer ── */}
      <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border/30">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors underline underline-offset-2"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold font-display text-foreground section-header-accent">
        {title}
      </h2>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Check your connection and try again
      </p>
    </div>
  );
}

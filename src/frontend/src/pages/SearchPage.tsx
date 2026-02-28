import { TrackCard } from "@/components/track/TrackCard";
import { GridSkeleton } from "@/components/track/TrackSkeleton";
import { useGenreTracks, useSearchTracks } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { GENRES } from "@/lib/youtube";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);

  const searchResults = useSearchTracks(debouncedQuery);
  const genreResults = useGenreTracks(
    selectedGenre ?? "",
    !!selectedGenre && !debouncedQuery,
  );

  const hasQuery = debouncedQuery.trim().length > 0;
  const showGenre = !hasQuery && !!selectedGenre;

  return (
    <div className="bg-gradient-mesh min-h-full p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2 mb-6"
      >
        <h1 className="text-4xl md:text-5xl font-bold font-display gradient-text leading-none mb-4">
          Search
        </h1>

        {/* Search input */}
        <div className="relative max-w-xl">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Artists, songs, podcasts..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setSelectedGenre(null);
            }}
            className="w-full bg-card border border-border rounded-2xl pl-11 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Genre Browse (shown when no query) */}
      <AnimatePresence mode="wait">
        {!hasQuery && (
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Browse Genres
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
              {GENRES.map((genre, i) => (
                <motion.button
                  key={genre.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() =>
                    setSelectedGenre(
                      selectedGenre === genre.id ? null : genre.id,
                    )
                  }
                  className={cn(
                    "relative overflow-hidden rounded-2xl py-6 px-4 text-left transition-all hover:scale-105 active:scale-95",
                    selectedGenre === genre.id
                      ? "ring-2 ring-white/50"
                      : "ring-0",
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${genre.color} 0%, oklch(0.4 0.18 ${genre.id === "pop" ? "330" : genre.id === "electronic" ? "295" : genre.id === "rock" ? "30" : "270"}) 100%)`,
                  }}
                >
                  <span className="font-bold text-white text-sm md:text-base drop-shadow">
                    {genre.label}
                  </span>
                  <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full opacity-30 transform translate-x-4 translate-y-4 bg-white/30" />
                </motion.button>
              ))}
            </div>

            {/* Genre results */}
            <AnimatePresence>
              {showGenre && (
                <motion.div
                  key={selectedGenre}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <h2 className="text-lg font-bold font-display mb-4">
                    {GENRES.find((g) => g.id === selectedGenre)?.label} Music
                  </h2>
                  {genreResults.isLoading ? (
                    <GridSkeleton count={8} />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {(genreResults.data ?? []).map((track, i) => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          queue={genreResults.data}
                          index={i}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Search Results */}
        {hasQuery && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {searchResults.isLoading ? (
              <>
                <div className="h-4 w-32 bg-white/5 rounded-full mb-4 animate-pulse" />
                <GridSkeleton count={12} />
              </>
            ) : searchResults.data && searchResults.data.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchResults.data.length} results for &ldquo;
                  {debouncedQuery}&rdquo;
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {searchResults.data.map((track, i) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      queue={searchResults.data}
                      index={i}
                    />
                  ))}
                </div>
              </>
            ) : searchResults.data?.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg font-semibold mb-2">No results found</p>
                <p className="text-sm text-muted-foreground">
                  Try a different search term
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import type { Track } from "@/types";

// ─── Music Search Strategy ────────────────────────────────────────────────────
//
// Primary:  Invidious API (YouTube proxy, no key, CORS-friendly)
//           Uses many public instances with automatic fallback
// Fallback: Hardcoded curated tracks so the home page never shows empty
//
// Playback: YouTube IFrame Player API (hidden iframe, full-length)
// ─────────────────────────────────────────────────────────────────────────────

// Large list of public Invidious instances (auto-failover on error)
const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://invidious.privacyredirect.com",
  "https://iv.melmac.space",
  "https://invidious.perennialte.ch",
  "https://invidious.drgns.space",
  "https://invidious.lunar.icu",
  "https://invidious.fdn.fr",
  "https://invidious.io.lol",
  "https://vid.priv.au",
  "https://y.com.sb",
  "https://invidious.ntr.cx",
  "https://inv.tux.pizza",
  "https://invidious.privacydev.net",
  "https://inv.zzls.xyz",
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface InvidiousVideo {
  videoId: string;
  title: string;
  author: string;
  authorId?: string;
  videoThumbnails?: Array<{ quality: string; url: string }>;
  lengthSeconds: number;
  viewCount?: number;
  published?: number;
  type?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBestThumbnail(
  thumbnails?: InvidiousVideo["videoThumbnails"],
  videoId?: string,
): string {
  if (thumbnails) {
    const preferred = ["high", "medium", "maxres", "default"];
    for (const q of preferred) {
      const t = thumbnails.find((th) => th.quality === q);
      if (t?.url) return t.url;
    }
    if (thumbnails[0]?.url) return thumbnails[0].url;
  }
  return `https://i.ytimg.com/vi/${videoId ?? ""}/hqdefault.jpg`;
}

function invVideoToTrack(v: InvidiousVideo): Track | null {
  if (v.type && v.type !== "video") return null;
  if (!v.videoId || !v.title || !v.author) return null;

  const titleLower = v.title.toLowerCase();
  const skip = [
    "podcast",
    "full movie",
    "sermon",
    "lecture",
    "audiobook",
    "interview",
  ];
  if (skip.some((s) => titleLower.includes(s))) return null;

  const artist = v.author
    .replace(/ - Topic$/i, "")
    .replace(/ VEVO$/i, "")
    .replace(/ Vevo$/i, "")
    .replace(/ Official$/i, "");

  return {
    id: v.videoId,
    title: v.title,
    artist,
    albumArt: getBestThumbnail(v.videoThumbnails, v.videoId),
    audioUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
    duration: v.lengthSeconds || 180,
    genre: "Music",
  };
}

// Search via Invidious — tries each instance in order until one succeeds
async function searchInvidious(query: string, limit = 20): Promise<Track[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);

      if (!res.ok) continue;

      const data = (await res.json()) as InvidiousVideo[];
      if (!Array.isArray(data)) continue;

      const tracks = data
        .slice(0, limit * 2)
        .map(invVideoToTrack)
        .filter((t): t is Track => t !== null)
        .slice(0, limit);

      if (tracks.length > 0) return tracks;
    } catch {
      // Try next instance
    }
  }
  return [];
}

// ── Genre mapping ─────────────────────────────────────────────────────────────

const GENRE_QUERIES: Record<string, string[]> = {
  pop: ["pop hits 2024 official", "best pop songs 2024"],
  electronic: ["electronic music 2024", "edm hits 2024"],
  rock: ["rock music 2024 official", "best rock songs"],
  hiphop: ["hip hop 2024 official", "rap hits 2024"],
  punjabi: ["karan aujla songs", "ap dhillon punjabi 2024"],
  jazz: ["jazz music playlist", "smooth jazz 2024"],
  classical: ["classical music orchestra", "beethoven symphony"],
  ambient: ["ambient music chill", "lo-fi hip hop beats"],
  folk: ["folk music acoustic", "indie folk songs"],
  rnb: ["r&b soul 2024 official", "best rnb songs"],
  reggae: ["reggae music 2024", "jamaican reggae songs"],
  bollywood: ["bollywood hits 2024", "top hindi songs 2024"],
  kpop: ["kpop 2024 official", "bts blackpink new songs"],
  latin: ["latin music 2024", "reggaeton hits 2024"],
};

const FEATURED_QUERIES = [
  "top hits 2024 official music video",
  "trending music 2024",
  "karan aujla new songs 2024",
  "drake hits official",
  "taylor swift official music video",
  "the weeknd popular songs",
  "ap dhillon official",
];

const NEW_RELEASES_QUERIES = [
  "new music 2024 official",
  "latest songs 2024",
  "new releases music 2024",
  "trending new songs 2024",
];

// ── Curated fallback tracks (always available, never empty) ───────────────────
// These are well-known YouTube video IDs that won't be removed

const FALLBACK_TRACKS: Track[] = [
  {
    id: "JGwWNGJdvx8",
    title: "Shape of You",
    artist: "Ed Sheeran",
    albumArt: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
    duration: 234,
    genre: "Pop",
  },
  {
    id: "OPf0YbXqDm0",
    title: "Mark Ronson - Uptown Funk ft. Bruno Mars",
    artist: "Mark Ronson",
    albumArt: "https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=OPf0YbXqDm0",
    duration: 270,
    genre: "Pop",
  },
  {
    id: "kTJczUoc26U",
    title: "Starboy",
    artist: "The Weeknd",
    albumArt: "https://i.ytimg.com/vi/kTJczUoc26U/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=kTJczUoc26U",
    duration: 230,
    genre: "R&B",
  },
  {
    id: "SlPhMPnQ58k",
    title: "Levitating",
    artist: "Dua Lipa",
    albumArt: "https://i.ytimg.com/vi/SlPhMPnQ58k/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=SlPhMPnQ58k",
    duration: 203,
    genre: "Pop",
  },
  {
    id: "7wtfhZwyrcc",
    title: "Stay",
    artist: "The Kid LAROI & Justin Bieber",
    albumArt: "https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=7wtfhZwyrcc",
    duration: 141,
    genre: "Pop",
  },
  {
    id: "H5v3kku4y6Q",
    title: "HUMBLE.",
    artist: "Kendrick Lamar",
    albumArt: "https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=H5v3kku4y6Q",
    duration: 177,
    genre: "Hip-Hop",
  },
  {
    id: "e-ORhEE9VVg",
    title: "GOD'S PLAN",
    artist: "Drake",
    albumArt: "https://i.ytimg.com/vi/e-ORhEE9VVg/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=e-ORhEE9VVg",
    duration: 199,
    genre: "Hip-Hop",
  },
  {
    id: "nfWlot6h_JM",
    title: "Shake It Off",
    artist: "Taylor Swift",
    albumArt: "https://i.ytimg.com/vi/nfWlot6h_JM/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=nfWlot6h_JM",
    duration: 219,
    genre: "Pop",
  },
  {
    id: "CevxZvSJLk8",
    title: "Katy Perry - Roar",
    artist: "Katy Perry",
    albumArt: "https://i.ytimg.com/vi/CevxZvSJLk8/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=CevxZvSJLk8",
    duration: 223,
    genre: "Pop",
  },
  {
    id: "09R8_2nJtjg",
    title: "Marry You",
    artist: "Bruno Mars",
    albumArt: "https://i.ytimg.com/vi/09R8_2nJtjg/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=09R8_2nJtjg",
    duration: 230,
    genre: "Pop",
  },
  {
    id: "bx1Bh8ZvH84",
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    albumArt: "https://i.ytimg.com/vi/bx1Bh8ZvH84/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=bx1Bh8ZvH84",
    duration: 262,
    genre: "Bollywood",
  },
  {
    id: "sK4S7q_J5kU",
    title: "Baarishein",
    artist: "Anuv Jain",
    albumArt: "https://i.ytimg.com/vi/sK4S7q_J5kU/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=sK4S7q_J5kU",
    duration: 222,
    genre: "Indie",
  },
  {
    id: "RgKAFK5djSk",
    title: "See You Again",
    artist: "Wiz Khalifa ft. Charlie Puth",
    albumArt: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=RgKAFK5djSk",
    duration: 229,
    genre: "Pop",
  },
  {
    id: "lWA2pjMjpBs",
    title: "Ditto",
    artist: "NewJeans",
    albumArt: "https://i.ytimg.com/vi/lWA2pjMjpBs/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=lWA2pjMjpBs",
    duration: 185,
    genre: "K-Pop",
  },
  {
    id: "Pkh8UtuejGw",
    title: "Softly",
    artist: "Karan Aujla",
    albumArt: "https://i.ytimg.com/vi/Pkh8UtuejGw/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=Pkh8UtuejGw",
    duration: 190,
    genre: "Punjabi",
  },
  {
    id: "weeI1G46q0o",
    title: "Excuses",
    artist: "AP Dhillon",
    albumArt: "https://i.ytimg.com/vi/weeI1G46q0o/hqdefault.jpg",
    audioUrl: "https://www.youtube.com/watch?v=weeI1G46q0o",
    duration: 185,
    genre: "Punjabi",
  },
];

// ── Public exports ────────────────────────────────────────────────────────────

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return [];

  // Try Invidious first
  const results = await searchInvidious(query, 24);
  if (results.length > 0) return results;

  // Fallback: filter curated list by query
  const q = query.toLowerCase();
  const filtered = FALLBACK_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
  );
  return filtered.length > 0 ? filtered : FALLBACK_TRACKS.slice(0, 8);
}

export async function fetchFeaturedTracks(): Promise<Track[]> {
  const query =
    FEATURED_QUERIES[Math.floor(Math.random() * FEATURED_QUERIES.length)]!;

  const tracks = await searchInvidious(query, 20);
  if (tracks.length > 0) return tracks;

  // Fallback to curated
  return [...FALLBACK_TRACKS].sort(() => Math.random() - 0.5).slice(0, 16);
}

export async function fetchNewReleases(): Promise<Track[]> {
  const query =
    NEW_RELEASES_QUERIES[
      Math.floor(Math.random() * NEW_RELEASES_QUERIES.length)
    ]!;

  const tracks = await searchInvidious(query, 16);
  if (tracks.length > 0) return tracks;

  // Fallback to curated (different shuffled subset)
  return [...FALLBACK_TRACKS].sort(() => Math.random() - 0.5).slice(0, 12);
}

export async function fetchByGenre(genre: string): Promise<Track[]> {
  const queries = GENRE_QUERIES[genre.toLowerCase()] ?? [`${genre} music`];

  for (const q of queries) {
    const tracks = await searchInvidious(q, 20);
    if (tracks.length > 0) return tracks;
  }

  // Fallback: filter curated list by genre keyword
  const filtered = FALLBACK_TRACKS.filter((t) =>
    t.genre?.toLowerCase().includes(genre.toLowerCase()),
  );
  return filtered.length > 0 ? filtered : FALLBACK_TRACKS.slice(0, 8);
}

export const GENRES = [
  { id: "pop", label: "Pop", color: "oklch(0.65 0.28 330)" },
  { id: "hiphop", label: "Hip-Hop", color: "oklch(0.65 0.22 60)" },
  { id: "electronic", label: "Electronic", color: "oklch(0.62 0.22 295)" },
  { id: "punjabi", label: "Punjabi", color: "oklch(0.68 0.25 45)" },
  { id: "rock", label: "Rock", color: "oklch(0.6 0.2 30)" },
  { id: "rnb", label: "R&B", color: "oklch(0.65 0.25 350)" },
  { id: "bollywood", label: "Bollywood", color: "oklch(0.67 0.25 20)" },
  { id: "jazz", label: "Jazz", color: "oklch(0.6 0.18 200)" },
  { id: "kpop", label: "K-Pop", color: "oklch(0.65 0.26 320)" },
  { id: "latin", label: "Latin", color: "oklch(0.67 0.26 70)" },
  { id: "classical", label: "Classical", color: "oklch(0.62 0.15 170)" },
  { id: "ambient", label: "Ambient", color: "oklch(0.55 0.15 250)" },
];

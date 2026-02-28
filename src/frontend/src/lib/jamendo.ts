import type { Track } from "@/types";

// ─── Hybrid Music API ─────────────────────────────────────────────────────────
//
// Strategy:
//   PRIMARY  → iTunes Search API (no key, CORS-friendly, mainstream catalog)
//              Returns 30-second licensed previews for commercial artists.
//   FALLBACK → Internet Archive (no key, CORS, full-length CC / indie music)
//              Used when iTunes returns nothing (very niche / CC queries).
//   SEED     → Curated tracks always available as last-resort fallback.
//
// This approach ensures mainstream artists (e.g. Karan Aujla, Drake, Taylor
// Swift) are found, while also serving full-length tracks for indie/CC music.
// ─────────────────────────────────────────────────────────────────────────────

// ── iTunes Search API ─────────────────────────────────────────────────────────

const ITUNES_BASE = "https://itunes.apple.com";

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string | null;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  releaseDate?: string;
  collectionName?: string;
}

interface ItunesResult {
  resultCount: number;
  results: ItunesTrack[];
}

function itunesTrackToTrack(t: ItunesTrack): Track | null {
  if (!t.previewUrl) return null;
  return {
    id: `itunes-${t.trackId}`,
    title: t.trackName,
    artist: t.artistName,
    albumArt: t.artworkUrl100
      .replace("100x100", "600x600")
      .replace("100x100bb", "600x600bb"),
    audioUrl: t.previewUrl,
    duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : 30,
    genre: t.primaryGenreName ?? "Music",
    releaseDate: t.releaseDate?.substring(0, 10),
  };
}

async function searchItunes(
  term: string,
  limit = 20,
  entity = "musicTrack",
): Promise<Track[]> {
  const url = new URL(`${ITUNES_BASE}/search`);
  url.searchParams.set("term", term);
  url.searchParams.set("entity", entity);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("media", "music");

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const data = (await res.json()) as ItunesResult;
    return data.results
      .map(itunesTrackToTrack)
      .filter((t): t is Track => t !== null);
  } catch {
    return [];
  }
}

// ── Internet Archive API (fallback for full-length CC music) ──────────────────

const IA_BASE = "https://archive.org";
const IA_SEARCH = `${IA_BASE}/advancedsearch.php`;
const IA_DOWNLOAD = `${IA_BASE}/download`;
const IA_THUMB = `${IA_BASE}/services/img`;

const MUSIC_COLS =
  "(collection:netlabels OR collection:ccmusic OR collection:freemusicarchive OR collection:audio_music)";

interface IASearchDoc {
  identifier: string;
  title?: string;
  creator?: string;
  subject?: string | string[];
  date?: string;
}

interface IAFile {
  name: string;
  format?: string;
  source?: string;
  length?: string;
  title?: string;
  artist?: string;
  creator?: string;
  genre?: string;
}

function pickOne(val: string | string[] | undefined): string {
  if (!val) return "";
  return Array.isArray(val) ? val[0] : val;
}

function parseDuration(length: string | undefined): number {
  if (!length) return 0;
  const s = length.trim();
  if (s.includes(":")) {
    const parts = s.split(":").map(Number);
    if (parts.length === 3)
      return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function guessGenre(doc: IASearchDoc, fileGenre?: string): string {
  const g = (fileGenre ?? "").toLowerCase();
  if (g) {
    if (g.includes("jazz")) return "Jazz";
    if (g.includes("blues")) return "Blues";
    if (g.includes("rock")) return "Rock";
    if (g.includes("classical") || g.includes("symphony")) return "Classical";
    if (g.includes("electronic") || g.includes("techno") || g.includes("edm"))
      return "Electronic";
    if (g.includes("hip") || g.includes("rap")) return "Hip-Hop";
    if (g.includes("pop")) return "Pop";
    if (g.includes("folk") || g.includes("acoustic")) return "Folk";
    if (g.includes("ambient")) return "Ambient";
    if (g.includes("reggae")) return "Reggae";
    if (g.includes("funk") || g.includes("soul")) return "Soul/Funk";
    if (g.includes("metal")) return "Metal";
  }
  const subjects = Array.isArray(doc.subject)
    ? doc.subject.join(" ").toLowerCase()
    : (doc.subject ?? "").toLowerCase();
  if (subjects.includes("jazz")) return "Jazz";
  if (subjects.includes("blues")) return "Blues";
  if (subjects.includes("rock")) return "Rock";
  if (subjects.includes("classical") || subjects.includes("symphony"))
    return "Classical";
  if (
    subjects.includes("electronic") ||
    subjects.includes("techno") ||
    subjects.includes("edm")
  )
    return "Electronic";
  if (
    subjects.includes("hip hop") ||
    subjects.includes("hip-hop") ||
    subjects.includes("rap")
  )
    return "Hip-Hop";
  if (subjects.includes("pop")) return "Pop";
  if (subjects.includes("folk") || subjects.includes("acoustic")) return "Folk";
  if (subjects.includes("ambient")) return "Ambient";
  if (subjects.includes("reggae")) return "Reggae";
  if (subjects.includes("funk") || subjects.includes("soul"))
    return "Soul/Funk";
  return "Music";
}

async function fetchWithTimeout<T>(url: string, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchItemTracks(
  doc: IASearchDoc,
  maxTracks = 3,
): Promise<Track[]> {
  const id = doc.identifier;
  try {
    const data = await fetchWithTimeout<{ result?: IAFile[] }>(
      `${IA_BASE}/metadata/${id}/files`,
      8000,
    );
    const files = data.result ?? [];
    let mp3s = files.filter(
      (f) => f.name.toLowerCase().endsWith(".mp3") && f.source === "original",
    );
    if (mp3s.length === 0)
      mp3s = files.filter((f) => f.name.toLowerCase().endsWith(".mp3"));
    if (mp3s.length === 0) return [];

    return mp3s.slice(0, maxTracks).map((f) => {
      const title =
        f.title ||
        pickOne(doc.title) ||
        id.replace(/_/g, " ").replace(/-/g, " ");
      const artist =
        f.artist || f.creator || pickOne(doc.creator) || "Unknown Artist";
      const duration = parseDuration(f.length) || 180;
      const genre = guessGenre(doc, f.genre);
      return {
        id: `ia-${id}-${f.name}`,
        title,
        artist,
        albumArt: `${IA_THUMB}/${id}`,
        audioUrl: `${IA_DOWNLOAD}/${id}/${encodeURIComponent(f.name)}`,
        duration,
        genre,
        releaseDate: doc.date?.substring(0, 10),
      };
    });
  } catch {
    return [];
  }
}

async function searchIA(
  queryExtra: string,
  rows = 8,
  sort = "downloads desc",
): Promise<Track[]> {
  const fullQuery = `mediatype:audio AND ${MUSIC_COLS} AND (${queryExtra})`;
  const url = new URL(IA_SEARCH);
  url.searchParams.set("q", fullQuery);
  url.searchParams.append("fl[]", "identifier");
  url.searchParams.append("fl[]", "title");
  url.searchParams.append("fl[]", "creator");
  url.searchParams.append("fl[]", "subject");
  url.searchParams.append("fl[]", "date");
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("sort[]", sort);
  url.searchParams.set("output", "json");

  let docs: IASearchDoc[] = [];
  try {
    const data = await fetchWithTimeout<{
      response?: { docs?: IASearchDoc[] };
    }>(url.toString(), 12000);
    docs = data.response?.docs ?? [];
  } catch {
    return [];
  }
  if (docs.length === 0) return [];

  const limited = docs.slice(0, 6);
  const results = await Promise.allSettled(
    limited.map((doc) => fetchItemTracks(doc, 3)),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<Track[]> => r.status === "fulfilled",
    )
    .flatMap((r) => r.value)
    .filter((t) => !!t.audioUrl);
}

// ── Curated fallback seed tracks ──────────────────────────────────────────────

const SEED_TRACKS: Track[] = [
  {
    id: "ia-seed-dwk123-01",
    title: "April Showers",
    artist: "ProleteR",
    albumArt: `${IA_THUMB}/DWK123`,
    audioUrl: `${IA_DOWNLOAD}/DWK123/ProleteR_-_01_-_April_Showers.mp3`,
    duration: 269,
    genre: "Hip-Hop",
  },
  {
    id: "ia-seed-dwk123-02",
    title: "Downtown Irony",
    artist: "ProleteR",
    albumArt: `${IA_THUMB}/DWK123`,
    audioUrl: `${IA_DOWNLOAD}/DWK123/ProleteR_-_02_-_Downtown_Irony.mp3`,
    duration: 261,
    genre: "Hip-Hop",
  },
  {
    id: "ia-seed-dwk119-01",
    title: "Concrete Jungle",
    artist: "Jenova 7",
    albumArt: `${IA_THUMB}/DWK119`,
    audioUrl: `${IA_DOWNLOAD}/DWK119/Jenova_7_-_01_-_Concrete_Jungle.mp3`,
    duration: 243,
    genre: "Jazz",
  },
  {
    id: "ia-seed-badpanda018-01",
    title: "Lullaby",
    artist: "Brick City Love Song",
    albumArt: `${IA_THUMB}/badpanda018`,
    audioUrl: `${IA_DOWNLOAD}/badpanda018/01RidingAloneForThousandsOfMiles-Lullaby.mp3`,
    duration: 509,
    genre: "Folk",
  },
];

// ── Genre queries for iTunes ──────────────────────────────────────────────────

const GENRE_ITUNES_TERM: Record<string, string> = {
  pop: "pop music",
  electronic: "electronic music",
  rock: "rock music",
  hiphop: "hip hop rap",
  jazz: "jazz",
  classical: "classical music",
  ambient: "ambient music",
  folk: "folk acoustic",
  rnb: "r&b soul",
  reggae: "reggae",
};

const GENRE_QUERY_IA: Record<string, string> = {
  pop: 'subject:pop OR subject:"pop music" OR subject:"indie pop"',
  electronic:
    'subject:electronic OR subject:techno OR subject:edm OR subject:"electronic music"',
  rock: 'subject:rock OR subject:"rock music" OR subject:"indie rock"',
  hiphop:
    'subject:"hip-hop" OR subject:"hip hop" OR subject:rap OR subject:"instrumental hip-hop"',
  jazz: 'subject:jazz OR subject:"smooth jazz" OR subject:"jazz music"',
  classical:
    "subject:classical OR subject:symphony OR subject:orchestra OR subject:baroque",
  ambient:
    'subject:ambient OR subject:"ambient music" OR subject:chillout OR subject:"chill out"',
  folk: 'subject:folk OR subject:acoustic OR subject:"folk music" OR subject:"singer-songwriter"',
  rnb: 'subject:soul OR subject:rnb OR subject:"rhythm and blues" OR subject:funk OR subject:"r&b"',
  reggae: 'subject:reggae OR subject:dub OR subject:"reggae music"',
};

// ── Public exports ────────────────────────────────────────────────────────────

export async function fetchFeaturedTracks(): Promise<Track[]> {
  // Use iTunes for featured -- wide variety of mainstream popular tracks
  const queries = ["top hits 2024", "trending music", "popular songs"];
  const randomTerm = queries[Math.floor(Math.random() * queries.length)];
  const tracks = await searchItunes(randomTerm, 20);
  if (tracks.length > 0) return tracks;
  // IA fallback
  const iaTracks = await searchIA(
    'subject:jazz OR subject:folk OR subject:blues OR subject:"instrumental hip-hop" OR subject:electronic',
    10,
    "downloads desc",
  );
  return iaTracks.length > 0 ? iaTracks : SEED_TRACKS;
}

export async function fetchNewReleases(): Promise<Track[]> {
  const tracks = await searchItunes("new music 2024", 20);
  if (tracks.length > 0) return tracks;
  const iaTracks = await searchIA(
    "subject:music OR subject:album OR subject:netlabel OR subject:electronic",
    10,
    "addeddate desc",
  );
  return iaTracks.length > 0 ? iaTracks : SEED_TRACKS;
}

export async function fetchByGenre(genre: string): Promise<Track[]> {
  // Try iTunes first
  const term = GENRE_ITUNES_TERM[genre.toLowerCase()] ?? genre;
  const itunesTracks = await searchItunes(term, 20);
  if (itunesTracks.length > 0) return itunesTracks;
  // IA fallback
  const query = GENRE_QUERY_IA[genre.toLowerCase()] ?? `subject:${genre}`;
  const iaTracks = await searchIA(query, 10, "downloads desc");
  if (iaTracks.length > 0) return iaTracks;
  return SEED_TRACKS.filter(
    (t) => t.genre.toLowerCase() === genre.toLowerCase(),
  );
}

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return [];

  // iTunes first -- has mainstream artists (Karan Aujla, Drake, Taylor Swift, etc.)
  const itunesTracks = await searchItunes(query, 25);
  if (itunesTracks.length > 0) return itunesTracks;

  // IA fallback for indie/CC artists not on iTunes
  const q = `title:(${query}) OR creator:(${query}) OR subject:(${query})`;
  const iaTracks = await searchIA(q, 12, "downloads desc");
  if (iaTracks.length > 0) return iaTracks;

  // Seed fallback
  const lower = query.toLowerCase();
  const seedMatch = SEED_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.artist.toLowerCase().includes(lower) ||
      t.genre.toLowerCase().includes(lower),
  );
  return seedMatch;
}

export async function fetchRandomTracks(): Promise<Track[]> {
  const terms = ["best songs", "music hits", "popular tracks", "top songs"];
  const term = terms[Math.floor(Math.random() * terms.length)];
  const tracks = await searchItunes(term, 12);
  if (tracks.length > 0) return tracks;
  const iaTracks = await searchIA(
    "subject:music OR subject:netlabel OR subject:electronic",
    6,
    "random",
  );
  return iaTracks.length > 0 ? iaTracks : SEED_TRACKS;
}

export const GENRES = [
  { id: "pop", label: "Pop", color: "oklch(0.65 0.28 330)" },
  { id: "electronic", label: "Electronic", color: "oklch(0.62 0.22 295)" },
  { id: "rock", label: "Rock", color: "oklch(0.6 0.2 30)" },
  { id: "hiphop", label: "Hip-Hop", color: "oklch(0.65 0.22 60)" },
  { id: "jazz", label: "Jazz", color: "oklch(0.6 0.18 200)" },
  { id: "classical", label: "Classical", color: "oklch(0.62 0.15 170)" },
  { id: "ambient", label: "Ambient", color: "oklch(0.55 0.15 250)" },
  { id: "folk", label: "Folk", color: "oklch(0.62 0.18 90)" },
  { id: "rnb", label: "R&B", color: "oklch(0.65 0.25 350)" },
  { id: "reggae", label: "Reggae", color: "oklch(0.62 0.22 145)" },
];

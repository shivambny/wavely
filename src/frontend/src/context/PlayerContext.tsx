import type { PlayerState, RepeatMode, Track } from "@/types";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── YouTube IFrame Player types ──────────────────────────────────────────────

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): PlayerState;
    loadVideoById(
      videoIdOrOptions: string | { videoId: string; startSeconds?: number },
    ): void;
    cueVideoById(videoIdOrOptions: string | { videoId: string }): void;
    destroy(): void;
  }
  interface PlayerOptions {
    width?: number | string;
    height?: number | string;
    videoId?: string;
    playerVars?: {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      rel?: 0 | 1;
      playsinline?: 0 | 1;
      enablejsapi?: 0 | 1;
      origin?: string;
    };
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { data: PlayerState; target: Player }) => void;
      onError?: (event: { data: number; target: Player }) => void;
    };
  }
}

// ─── Context Interface ────────────────────────────────────────────────────────

interface PlayerContextValue extends PlayerState {
  ytPlayerRef: React.RefObject<YT.Player | null>;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  isYtReady: boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── YouTube IFrame API Loader ────────────────────────────────────────────────

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const ytPlayerRef = useRef<YT.Player | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement | null>(null);
  const [isYtReady, setIsYtReady] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    shuffle: false,
    repeat: "none",
    isLoading: false,
  });

  // Keep a stable ref to state for use inside callbacks
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Initialize YouTube IFrame API ──────────────────────────────────────────
  useEffect(() => {
    // Create hidden container for the YT player
    const container = document.createElement("div");
    container.id = "yt-player-container";
    container.style.cssText =
      "position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";
    document.body.appendChild(container);
    iframeContainerRef.current = container;

    void loadYouTubeAPI().then(() => {
      const player = new window.YT.Player(container, {
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ytPlayerRef.current = player;
            player.setVolume(80);
            setIsYtReady(true);
          },
          onStateChange: (event) => {
            const YTState = window.YT.PlayerState;
            const s = stateRef.current;

            if (event.data === YTState.PLAYING) {
              const dur = player.getDuration();
              setState((prev) => ({
                ...prev,
                isPlaying: true,
                isLoading: false,
                duration: dur > 0 ? dur : prev.duration,
              }));
            } else if (event.data === YTState.PAUSED) {
              setState((prev) => ({
                ...prev,
                isPlaying: false,
                isLoading: false,
              }));
            } else if (event.data === YTState.BUFFERING) {
              setState((prev) => ({ ...prev, isLoading: true }));
            } else if (event.data === YTState.ENDED) {
              // Auto advance
              const nextIndex = s.shuffle
                ? Math.floor(Math.random() * s.queue.length)
                : s.queueIndex + 1;

              if (s.repeat === "one") {
                player.seekTo(0, true);
                player.playVideo();
                setState((prev) => ({ ...prev, currentTime: 0 }));
                return;
              }

              if (nextIndex >= s.queue.length) {
                if (s.repeat === "all" && s.queue.length > 0) {
                  const firstTrack = s.queue[0]!;
                  player.loadVideoById(firstTrack.id);
                  setState((prev) => ({
                    ...prev,
                    currentTrack: firstTrack,
                    queueIndex: 0,
                    isPlaying: true,
                    currentTime: 0,
                    isLoading: true,
                  }));
                } else {
                  setState((prev) => ({
                    ...prev,
                    isPlaying: false,
                    currentTime: 0,
                  }));
                }
                return;
              }

              const nextTrack = s.queue[nextIndex];
              if (nextTrack) {
                player.loadVideoById(nextTrack.id);
                setState((prev) => ({
                  ...prev,
                  currentTrack: nextTrack,
                  queueIndex: nextIndex,
                  isPlaying: true,
                  currentTime: 0,
                  isLoading: true,
                }));
              }
            } else if (event.data === YTState.CUED) {
              setState((prev) => ({ ...prev, isLoading: false }));
            }
          },
          onError: () => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              isPlaying: false,
            }));
          },
        },
      });
    });

    return () => {
      ytPlayerRef.current?.destroy();
      container.remove();
    };
  }, []);

  // ── Progress poller ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        const player = ytPlayerRef.current;
        if (!player) return;
        try {
          const ct = player.getCurrentTime();
          const dur = player.getDuration();
          setState((prev) => ({
            ...prev,
            currentTime: ct,
            duration: dur > 0 ? dur : prev.duration,
          }));
        } catch {
          // player not ready yet
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [state.isPlaying]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    const player = ytPlayerRef.current;
    if (!player) return;

    const newQueue = queue ?? [track];
    const trackIndex = newQueue.findIndex((t) => t.id === track.id);
    const index = trackIndex >= 0 ? trackIndex : 0;

    player.loadVideoById(track.id);

    setState((prev) => ({
      ...prev,
      currentTrack: track,
      queue: newQueue,
      queueIndex: index,
      isPlaying: true,
      currentTime: 0,
      duration: 0,
      isLoading: true,
    }));
  }, []);

  const togglePlay = useCallback(() => {
    const player = ytPlayerRef.current;
    if (!player || !stateRef.current.currentTrack) return;

    if (stateRef.current.isPlaying) {
      player.pauseVideo();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      player.playVideo();
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const playNext = useCallback(() => {
    setState((prev) => {
      const player = ytPlayerRef.current;
      if (!player || prev.queue.length === 0) return prev;

      const nextIndex = prev.shuffle
        ? Math.floor(Math.random() * prev.queue.length)
        : (prev.queueIndex + 1) % prev.queue.length;

      const nextTrack = prev.queue[nextIndex];
      if (!nextTrack) return prev;

      player.loadVideoById(nextTrack.id);

      return {
        ...prev,
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
        isLoading: true,
      };
    });
  }, []);

  const playPrev = useCallback(() => {
    setState((prev) => {
      const player = ytPlayerRef.current;
      if (!player || prev.queue.length === 0) return prev;

      // If more than 3s in, restart current track
      if (prev.currentTime > 3) {
        player.seekTo(0, true);
        return { ...prev, currentTime: 0 };
      }

      const prevIndex =
        prev.queueIndex === 0 ? prev.queue.length - 1 : prev.queueIndex - 1;

      const prevTrack = prev.queue[prevIndex];
      if (!prevTrack) return prev;

      player.loadVideoById(prevTrack.id);

      return {
        ...prev,
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
        isLoading: true,
      };
    });
  }, []);

  const seekTo = useCallback((time: number) => {
    const player = ytPlayerRef.current;
    if (!player) return;
    player.seekTo(time, true);
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const player = ytPlayerRef.current;
    if (player) {
      // YT.Player expects 0-100
      player.setVolume(Math.round(volume * 100));
      if (volume > 0 && player.isMuted()) player.unMute();
    }
    setState((prev) => ({ ...prev, volume, isMuted: volume === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const player = ytPlayerRef.current;
    setState((prev) => {
      const newMuted = !prev.isMuted;
      if (player) {
        if (newMuted) player.mute();
        else player.unMute();
      }
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({ ...prev, shuffle: !prev.shuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const modes: RepeatMode[] = ["none", "all", "one"];
      const currentIdx = modes.indexOf(prev.repeat);
      const next = modes[(currentIdx + 1) % modes.length] ?? "none";
      return { ...prev, repeat: next };
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setState((prev) => ({
      ...prev,
      queue: [...prev.queue, track],
    }));
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        ytPlayerRef,
        playTrack,
        togglePlay,
        playNext,
        playPrev,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        isYtReady,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
}

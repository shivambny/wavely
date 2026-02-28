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

interface PlayerContextValue extends PlayerState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
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
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    shuffle: false,
    repeat: "none",
    isLoading: false,
  });

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.8;
    audio.preload = "auto";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    };

    const handleEnded = () => {
      setState((prev) => {
        if (prev.repeat === "one") {
          audio.currentTime = 0;
          void audio.play();
          return { ...prev, currentTime: 0 };
        }
        return prev;
      });

      setState((prev) => {
        if (prev.repeat === "one") return prev;

        const nextIndex = prev.shuffle
          ? Math.floor(Math.random() * prev.queue.length)
          : prev.queueIndex + 1;

        if (nextIndex >= prev.queue.length) {
          if (prev.repeat === "all") {
            const firstTrack = prev.queue[0];
            if (firstTrack) {
              audio.src = firstTrack.audioUrl;
              void audio.play();
              return {
                ...prev,
                currentTrack: firstTrack,
                queueIndex: 0,
                isPlaying: true,
                currentTime: 0,
                isLoading: true,
              };
            }
          }
          return { ...prev, isPlaying: false, currentTime: 0 };
        }

        const nextTrack = prev.queue[nextIndex];
        if (nextTrack) {
          audio.src = nextTrack.audioUrl;
          void audio.play();
          return {
            ...prev,
            currentTrack: nextTrack,
            queueIndex: nextIndex,
            isPlaying: true,
            currentTime: 0,
            isLoading: true,
          };
        }
        return prev;
      });
    };

    const handleWaiting = () => {
      setState((prev) => ({ ...prev, isLoading: true }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.pause();
    };
  }, []);

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newQueue = queue ?? [track];
    const trackIndex = newQueue.findIndex((t) => t.id === track.id);
    const index = trackIndex >= 0 ? trackIndex : 0;

    audio.src = track.audioUrl;
    audio.load();
    void audio.play().catch(console.error);

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
    const audio = audioRef.current;
    if (!audio || !state.currentTrack) return;

    if (state.isPlaying) {
      audio.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      void audio.play().catch(console.error);
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying, state.currentTrack]);

  const playNext = useCallback(() => {
    setState((prev) => {
      const audio = audioRef.current;
      if (!audio || prev.queue.length === 0) return prev;

      let nextIndex: number;
      if (prev.shuffle) {
        nextIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
        nextIndex = (prev.queueIndex + 1) % prev.queue.length;
      }

      const nextTrack = prev.queue[nextIndex];
      if (!nextTrack) return prev;

      audio.src = nextTrack.audioUrl;
      audio.load();
      void audio.play().catch(console.error);

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
      const audio = audioRef.current;
      if (!audio || prev.queue.length === 0) return prev;

      // If more than 3s in, restart current track
      if (prev.currentTime > 3) {
        audio.currentTime = 0;
        return { ...prev, currentTime: 0 };
      }

      const prevIndex =
        prev.queueIndex === 0 ? prev.queue.length - 1 : prev.queueIndex - 1;

      const prevTrack = prev.queue[prevIndex];
      if (!prevTrack) return prev;

      audio.src = prevTrack.audioUrl;
      audio.load();
      void audio.play().catch(console.error);

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
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    setState((prev) => ({ ...prev, volume, isMuted: volume === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setState((prev) => {
      const newMuted = !prev.isMuted;
      audio.volume = newMuted ? 0 : prev.volume;
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
        audioRef,
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

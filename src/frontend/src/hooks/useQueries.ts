import type { OfflineTrack } from "@/backend";
import {
  fetchByGenre,
  fetchFeaturedTracks,
  fetchNewReleases,
  searchTracks,
} from "@/lib/jamendo";
import type { Track } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

// ─── Jamendo Queries ────────────────────────────────────────────────────────

export function useFeaturedTracks() {
  return useQuery({
    queryKey: ["featured-tracks"],
    queryFn: fetchFeaturedTracks,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useNewReleases() {
  return useQuery({
    queryKey: ["new-releases"],
    queryFn: fetchNewReleases,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useGenreTracks(genre: string, enabled = true) {
  return useQuery({
    queryKey: ["genre-tracks", genre],
    queryFn: () => fetchByGenre(genre),
    staleTime: 10 * 60 * 1000,
    enabled: enabled && !!genre,
    retry: 1,
  });
}

export function useSearchTracks(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchTracks(query),
    staleTime: 2 * 60 * 1000,
    enabled: query.trim().length > 0,
    retry: 1,
  });
}

// ─── Backend Queries ─────────────────────────────────────────────────────────

export function useLikedTracks() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["liked-tracks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLikedTracks();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30 * 1000,
  });
}

export function useMyPlaylists() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["my-playlists"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyPlaylists();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30 * 1000,
  });
}

export function useOfflineTracks() {
  const { actor, isFetching } = useActor();
  return useQuery<OfflineTrack[]>({
    queryKey: ["offline-tracks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOfflineTracks();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30 * 1000,
  });
}

export function useRecentlyPlayed() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["recently-played"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentlyPlayed();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30 * 1000,
  });
}

export function usePlaylist(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return actor.getPlaylist(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useLikeTrack() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.likeTrack(trackId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["liked-tracks"] });
    },
  });
}

export function useUnlikeTrack() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.unlikeTrack(trackId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["liked-tracks"] });
    },
  });
}

export function useSaveOfflineTrack() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (track: Track) => {
      if (!actor) throw new Error("Not authenticated");
      const offlineTrack: OfflineTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt,
        audioUrl: track.audioUrl,
        genre: track.genre,
        duration: BigInt(Math.round(track.duration)),
      };
      return actor.saveOfflineTrack(offlineTrack);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["offline-tracks"] });
    },
  });
}

export function useRemoveOfflineTrack() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.removeOfflineTrack(trackId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["offline-tracks"] });
    },
  });
}

export function useCreatePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createPlaylist(name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
    },
  });
}

export function useDeletePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deletePlaylist(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
    },
  });
}

export function useAddTrackToPlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playlistId,
      trackId,
    }: {
      playlistId: string;
      trackId: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.addTrackToPlaylist(playlistId, trackId);
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["playlist", vars.playlistId],
      });
    },
  });
}

export function useAddRecentlyPlayed() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!actor) return;
      return actor.addRecentlyPlayed(trackId);
    },
  });
}

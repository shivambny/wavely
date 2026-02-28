import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Playlist {
    id: string;
    owner: Principal;
    name: string;
    createdAt: bigint;
    trackIds: Array<string>;
}
export interface UserProfile {
    name: string;
}
export interface OfflineTrack {
    id: string;
    albumArt: string;
    title: string;
    duration: bigint;
    audioUrl: string;
    genre: string;
    artist: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addRecentlyPlayed(trackId: string): Promise<void>;
    addTrackToPlaylist(playlistId: string, trackId: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPlaylist(name: string): Promise<Playlist>;
    deletePlaylist(id: string): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLikedTracks(): Promise<Array<string>>;
    getMyPlaylists(): Promise<Array<Playlist>>;
    getOfflineTracks(): Promise<Array<OfflineTrack>>;
    getPlaylist(id: string): Promise<Playlist>;
    getRecentlyPlayed(): Promise<Array<string>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    likeTrack(trackId: string): Promise<void>;
    removeOfflineTrack(trackId: string): Promise<void>;
    removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveOfflineTrack(track: OfflineTrack): Promise<void>;
    unlikeTrack(trackId: string): Promise<void>;
}

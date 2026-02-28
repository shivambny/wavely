import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Order "mo:core/Order";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  include MixinStorage();

  func comparePlaylist(playlist1 : Playlist, playlist2 : Playlist) : Order.Order {
    Text.compare(playlist1.id, playlist2.id);
  };

  func compareOfflineTrack(track1 : OfflineTrack, track2 : OfflineTrack) : Order.Order {
    Text.compare(track1.id, track2.id);
  };

  let playlistStorage = Map.empty<Text, Playlist>();

  func getMaxTwentyRecentlyPlayed(array : [Text]) : [Text] {
    if (array.size() <= 20) { return array };
    array.sliceToArray(0, 20);
  };

  type OfflineTrack = {
    id : Text;
    title : Text;
    artist : Text;
    albumArt : Text;
    audioUrl : Text;
    duration : Nat;
    genre : Text;
  };

  type Playlist = {
    id : Text;
    name : Text;
    trackIds : [Text];
    createdAt : Int;
    owner : Principal;
  };

  type UserLibrary = {
    likedTracks : Set.Set<Text>;
    recentlyPlayed : List.List<Text>;
    offlineTracks : Map.Map<Text, OfflineTrack>;
  };

  public type UserProfile = {
    name : Text;
  };

  let userLibraries : Map.Map<Principal, UserLibrary> = Map.empty<Principal, UserLibrary>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Playlist Management
  public shared ({ caller }) func createPlaylist(name : Text) : async Playlist {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create playlists");
    };
    let id = name.concat(Time.now().toText());
    let newPlaylist : Playlist = {
      id;
      name;
      trackIds = [];
      createdAt = Time.now();
      owner = caller;
    };
    playlistStorage.add(id, newPlaylist);
    newPlaylist;
  };

  public shared ({ caller }) func deletePlaylist(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete playlists");
    };
    switch (playlistStorage.get(id)) {
      case (null) { false };
      case (?playlist) {
        if (playlist.owner != caller) {
          Runtime.trap("Unauthorized: Only the owner can delete this playlist");
        };
        playlistStorage.remove(id);
        true;
      };
    };
  };

  public shared ({ caller }) func addTrackToPlaylist(playlistId : Text, trackId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify playlists");
    };
    switch (playlistStorage.get(playlistId)) {
      case (null) { Runtime.trap("Playlist not found") };
      case (?playlist) {
        if (playlist.owner != caller) {
          Runtime.trap("Unauthorized: Only the owner can modify this playlist");
        };
        let updatedPlaylist = {
          playlist with trackIds = playlist.trackIds.concat([trackId]);
        };
        playlistStorage.add(playlistId, updatedPlaylist);
      };
    };
  };

  public shared ({ caller }) func removeTrackFromPlaylist(playlistId : Text, trackId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify playlists");
    };
    switch (playlistStorage.get(playlistId)) {
      case (null) { Runtime.trap("Playlist not found") };
      case (?playlist) {
        if (playlist.owner != caller) {
          Runtime.trap("Unauthorized: Only the owner can modify this playlist");
        };
        let updatedTrackIds = playlist.trackIds.filter(
          func(id) {
            id != trackId;
          }
        );
        let updatedPlaylist = { playlist with trackIds = updatedTrackIds };
        playlistStorage.add(playlistId, updatedPlaylist);
      };
    };
  };

  public query ({ caller }) func getMyPlaylists() : async [Playlist] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access playlists");
    };
    playlistStorage.values().toArray().filter(
      func(p) {
        p.owner == caller;
      }
    ).sort(comparePlaylist);
  };

  public query ({ caller }) func getPlaylist(id : Text) : async Playlist {
    // Anyone can view a playlist (including guests)
    switch (playlistStorage.get(id)) {
      case (null) { Runtime.trap("Playlist not found") };
      case (?playlist) { playlist };
    };
  };

  func getUserLibrary(caller : Principal) : UserLibrary {
    switch (userLibraries.get(caller)) {
      case (null) {
        let newLibrary : UserLibrary = {
          likedTracks = Set.empty<Text>();
          recentlyPlayed = List.empty<Text>();
          offlineTracks = Map.empty<Text, OfflineTrack>();
        };
        userLibraries.add(caller, newLibrary);
        newLibrary;
      };
      case (?library) { library };
    };
  };

  // Liked Tracks
  public shared ({ caller }) func likeTrack(trackId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like tracks");
    };
    let library = getUserLibrary(caller);
    library.likedTracks.add(trackId);
  };

  public shared ({ caller }) func unlikeTrack(trackId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike tracks");
    };
    let library = getUserLibrary(caller);
    library.likedTracks.remove(trackId);
  };

  public query ({ caller }) func getLikedTracks() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access liked tracks");
    };
    getUserLibrary(caller).likedTracks.toArray();
  };

  // Offline Tracks
  public shared ({ caller }) func saveOfflineTrack(track : OfflineTrack) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save offline tracks");
    };
    let library = getUserLibrary(caller);
    library.offlineTracks.add(track.id, track);
  };

  public shared ({ caller }) func removeOfflineTrack(trackId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove offline tracks");
    };
    let library = getUserLibrary(caller);
    library.offlineTracks.remove(trackId);
  };

  public query ({ caller }) func getOfflineTracks() : async [OfflineTrack] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access offline tracks");
    };
    getUserLibrary(caller).offlineTracks.values().toArray().sort(compareOfflineTrack);
  };

  // Recently Played
  public shared ({ caller }) func addRecentlyPlayed(trackId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add recently played tracks");
    };
    let library = getUserLibrary(caller);
    library.recentlyPlayed.add(trackId);
    let array = library.recentlyPlayed.toArray();
    library.recentlyPlayed.clear();
    let trimmedArray = getMaxTwentyRecentlyPlayed(array);
    for (item in trimmedArray.values()) {
      library.recentlyPlayed.add(item);
    };
  };

  public query ({ caller }) func getRecentlyPlayed() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access recently played tracks");
    };
    getMaxTwentyRecentlyPlayed(getUserLibrary(caller).recentlyPlayed.toArray());
  };
};

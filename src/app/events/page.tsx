"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import type { Event } from "@/lib/db/schema";
import { Nav } from "@/components/Nav";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

interface AudiusPlaylist {
  id: string;
  playlist_name: string;
  user: { name: string };
  artwork?: { "150x150"?: string };
  track_count: number;
}

interface AudiusTrackPreview {
  id: string;
  title: string;
  duration?: number;
  artwork?: { "150x150"?: string };
  user: { name: string };
}

interface RecommendedArtist {
  id: string;
  name: string;
  handle: string;
  profilePic?: string;
  coinTicker?: string;
  coinPrice?: number;
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <EventsContent />
    </Suspense>
  );
}

function EventsContent() {
  const searchParams = useSearchParams();
  const showCreate = searchParams.get("create") === "true";
  const [isCreating, setIsCreating] = useState(showCreate);

  return (
    <main className="min-h-screen px-4 pt-24 pb-16 max-w-5xl mx-auto">
      <Nav />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Browse or create token-gated experiences
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isCreating
              ? "glass text-neutral-300 hover:text-white"
              : "bg-brand hover:bg-accent text-white shadow-md hover:shadow-lg hover:scale-[1.02]"
          }`}
        >
          {isCreating ? "Browse Events" : "Create Event"}
        </button>
      </div>

      {isCreating ? <CreateEventForm /> : <EventList />}
    </main>
  );
}

/* ─── Quick-date presets ─── */
function getQuickDates() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const saturday = new Date(today);
  saturday.setDate(saturday.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
  const nextFriday = new Date(today);
  nextFriday.setDate(nextFriday.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
  return [
    { label: "Tonight", date: today },
    { label: "Tomorrow", date: tomorrow },
    { label: "This Saturday", date: saturday },
    { label: "Next Friday", date: nextFriday },
  ];
}

function toLocalDatetime(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── Create Event Form ─── */
function CreateEventForm() {
  const { publicKey, connected } = useWallet();

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  // Playlist
  const [playlistSource, setPlaylistSource] = useState<"audius" | "spotify">("audius");
  const [audiusPlaylistId, setAudiusPlaylistId] = useState("");
  const [selectedPlaylistName, setSelectedPlaylistName] = useState("");
  const [playlistQuery, setPlaylistQuery] = useState("");
  const [playlistResults, setPlaylistResults] = useState<AudiusPlaylist[]>([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState<AudiusPlaylist[]>([]);
  const [searchingPlaylists, setSearchingPlaylists] = useState(false);
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("");

  // Artist
  const [audiusUserId, setAudiusUserId] = useState("");
  const [selectedArtistName, setSelectedArtistName] = useState("");
  const [walletArtistName, setWalletArtistName] = useState("");

  // Auto-fetched artist tracks
  const [artistTracks, setArtistTracks] = useState<AudiusTrackPreview[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Recommended artists
  const [recommended, setRecommended] = useState<RecommendedArtist[]>([]);
  const [loadingRec, setLoadingRec] = useState(true);

  const [loading, setLoading] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Fetch recommended/trending artists from coins
  useEffect(() => {
    async function fetchRecommended() {
      try {
        const res = await fetch(`${AUDIUS_HOST}/v1/coins?sort=market_cap&limit=12&app_name=bloxparty`);
        if (!res.ok) return;
        const json = await res.json();
        const coins = json.data || [];
        const artists: RecommendedArtist[] = [];
        for (const coin of coins.slice(0, 8)) {
          try {
            const userRes = await fetch(`${AUDIUS_HOST}/v1/users/${coin.owner_id}?app_name=bloxparty`);
            if (userRes.ok) {
              const userData = await userRes.json();
              const user = userData.data;
              if (user) {
                artists.push({
                  id: user.id,
                  name: user.name,
                  handle: user.handle,
                  profilePic: user.profile_picture?.["150x150"],
                  coinTicker: coin.ticker,
                  coinPrice: coin.price,
                });
              }
            }
          } catch { /* skip */ }
        }
        setRecommended(artists);
      } catch { /* non-critical */ }
      setLoadingRec(false);
    }
    fetchRecommended();
  }, []);

  // Auto-detect Audius artist from connected wallet
  useEffect(() => {
    if (!publicKey) return;
    async function detectArtist() {
      try {
        const res = await fetch(`/api/audius/user?wallet=${publicKey!.toBase58()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setWalletArtistName(data.user.name);
            setAudiusUserId(data.user.id);
            setSelectedArtistName(data.user.name);
            fetchArtistTracks(data.user.id);
          }
        }
      } catch { /* Non-critical */ }
    }
    detectArtist();
  }, [publicKey]);

  // Load trending playlists on mount
  useEffect(() => {
    async function loadTrending() {
      try {
        const res = await fetch(`${AUDIUS_HOST}/v1/playlists/trending?limit=6&app_name=bloxparty`);
        if (res.ok) {
          const data = await res.json();
          setTrendingPlaylists(data.data || []);
        }
      } catch { /* non-critical */ }
    }
    loadTrending();
  }, []);

  async function fetchArtistTracks(userId: string) {
    setLoadingTracks(true);
    try {
      const res = await fetch(`${AUDIUS_HOST}/v1/users/${userId}/tracks?limit=10&app_name=bloxparty`);
      if (res.ok) {
        const data = await res.json();
        setArtistTracks(data.data || []);
      }
    } catch { /* non-critical */ }
    setLoadingTracks(false);
  }

  const searchPlaylists = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearchingPlaylists(true);
    try {
      const res = await fetch(
        `${AUDIUS_HOST}/v1/playlists/search?query=${encodeURIComponent(q)}&limit=10&app_name=bloxparty`
      );
      if (res.ok) {
        const data = await res.json();
        setPlaylistResults(data.data || []);
      }
    } catch { /* Non-critical */ }
    setSearchingPlaylists(false);
  }, []);

  if (!connected) {
    return (
      <div className="text-center py-16 glass rounded-xl">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-neutral-500">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M2 10h20" />
        </svg>
        <p className="text-neutral-400 mb-2">Connect your wallet to create an event.</p>
        <p className="text-xs text-neutral-600">Your Solana wallet links to your Audius identity</p>
      </div>
    );
  }

  function handleQuickFill(artist: RecommendedArtist) {
    setAudiusUserId(artist.id);
    setSelectedArtistName(artist.name);
    setName(`${artist.name} Live Concert`);
    setDescription(`Token-gated concert experience featuring ${artist.name} (@${artist.handle}) on Roblox.`);
    fetchArtistTracks(artist.id);
  }

  function clearArtist() {
    setAudiusUserId(walletArtistName ? "" : "");
    setSelectedArtistName("");
    setName("");
    setDescription("");
    setArtistTracks([]);
  }

  async function handleSubmit() {
    if (!publicKey || !name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          date: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
          creatorWallet: publicKey.toBase58(),
          audiusUserId: audiusUserId || undefined,
          audiusPlaylistId: audiusPlaylistId || undefined,
          spotifyPlaylistUrl: spotifyPlaylistUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create event");
      const event = await res.json();
      window.location.href = `/events/${event.id}`;
    } catch (err) {
      console.error("Failed to create event:", err);
      alert("Failed to create event. Check console for details.");
    }
    setLoading(false);
  }

  function selectPlaylist(playlist: AudiusPlaylist) {
    setAudiusPlaylistId(playlist.id);
    setSelectedPlaylistName(playlist.playlist_name);
  }

  const quickDates = getQuickDates();
  const isFilled = !!selectedArtistName;

  return (
    <div className="space-y-6">
      {/* ─── Quick Fill: Pick a trending artist ─── */}
      {!isFilled && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pop">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <h2 className="text-lg font-bold">Quick Fill</h2>
            <span className="text-xs text-neutral-500 ml-1">Pick an artist to auto-fill everything</span>
          </div>

          {loadingRec ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recommended.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recommended.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => handleQuickFill(artist)}
                  className="group flex items-center gap-3 p-3 rounded-xl glass-strong hover:bg-white/10 transition-all text-left"
                >
                  {artist.profilePic ? (
                    <img src={artist.profilePic} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand/30 flex items-center justify-center flex-shrink-0 text-accent text-sm font-bold">
                      {artist.name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate group-hover:text-white transition-colors">{artist.name}</p>
                    {artist.coinTicker && (
                      <p className="text-[10px] text-accent font-mono truncate">${artist.coinTicker}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No trending artists found</p>
          )}
        </div>
      )}

      {/* ─── Event Form ─── */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">{isFilled ? "Almost there" : "Custom Event"}</h2>
          {isFilled && (
            <button
              onClick={clearArtist}
              className="text-xs text-neutral-500 hover:text-white transition-colors px-3 py-1 rounded-lg glass-strong"
            >
              Clear &amp; start over
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500 mb-5">
          {isFilled
            ? `Pre-filled for ${selectedArtistName} — edit anything below, then create.`
            : "Fill in details manually for full control"}
        </p>

        {walletArtistName && !selectedArtistName && (
          <div className="p-3 glass-strong rounded-xl flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-sm text-neutral-300">
              Creating as <strong className="text-accent">{walletArtistName}</strong> on Audius
            </span>
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Solana Concert Night"
              className="w-full px-3.5 py-2.5 glass-strong rounded-xl focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all text-sm placeholder:text-neutral-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What's this event about?"
              className="w-full px-3.5 py-2.5 glass-strong rounded-xl focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all text-sm placeholder:text-neutral-600 resize-none"
            />
          </div>

          {/* Date — quick picks + manual */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">When</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {quickDates.map((qd) => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => setEventDate(toLocalDatetime(qd.date))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    eventDate === toLocalDatetime(qd.date)
                      ? "bg-accent text-white"
                      : "glass-strong text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {qd.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 glass-strong rounded-xl focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all text-sm [color-scheme:dark]"
            />
          </div>

          {/* Artist selection (only if not already filled) */}
          {!isFilled && recommended.length > 0 && (
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Featured Artist</label>
              <div className="flex flex-wrap gap-2">
                {recommended.slice(0, 6).map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => handleQuickFill(artist)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg glass-strong text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {artist.profilePic ? (
                      <img src={artist.profilePic} alt="" className="w-4 h-4 rounded-full" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-brand/30 flex items-center justify-center text-[8px] text-accent font-bold">{artist.name[0]}</div>
                    )}
                    {artist.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-fetched artist tracks preview */}
          {loadingTracks && (
            <div className="p-4 glass-strong rounded-xl">
              <p className="text-sm text-neutral-500 animate-pulse">Fetching tracks...</p>
            </div>
          )}

          {artistTracks.length > 0 && (
            <div className="glass-strong rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{selectedArtistName}&apos;s Top Tracks</p>
                  <p className="text-[10px] text-neutral-500">Auto-fetched from Audius &middot; {artistTracks.length} tracks</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">Auto</span>
              </div>
              <div className="p-2 space-y-0.5 max-h-[280px] overflow-y-auto">
                {artistTracks.map((track, i) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-[10px] text-neutral-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                    {track.artwork?.["150x150"] ? (
                      <img src={track.artwork["150x150"]} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{track.title}</p>
                    </div>
                    {track.duration && (
                      <span className="text-[10px] text-neutral-600 flex-shrink-0">{formatDuration(track.duration)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Expandable: Add/Override Playlist ─── */}
          <div>
            <button
              type="button"
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showPlaylist ? "rotate-90" : ""}`}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              {artistTracks.length > 0 ? "Override with a specific playlist" : "Add a playlist"}
              {selectedPlaylistName && <span className="text-accent text-xs ml-1">({selectedPlaylistName})</span>}
            </button>

            {showPlaylist && (
              <div className="mt-3 space-y-3 pl-1">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlaylistSource("audius")}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                      playlistSource === "audius"
                        ? "bg-brand text-white"
                        : "glass-strong text-neutral-400 hover:text-white"
                    }`}
                  >
                    Audius
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaylistSource("spotify")}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                      playlistSource === "spotify"
                        ? "bg-green-600 text-white"
                        : "glass-strong text-neutral-400 hover:text-white"
                    }`}
                  >
                    Spotify
                  </button>
                </div>

                {playlistSource === "audius" ? (
                  <>
                    {selectedPlaylistName && (
                      <div className="p-3 glass-strong rounded-xl flex items-center justify-between">
                        <span className="text-sm text-accent">
                          Selected: <strong>{selectedPlaylistName}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => { setAudiusPlaylistId(""); setSelectedPlaylistName(""); }}
                          className="text-xs text-neutral-500 hover:text-white transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playlistQuery}
                        onChange={(e) => setPlaylistQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            searchPlaylists(playlistQuery);
                          }
                        }}
                        placeholder="Search playlists..."
                        className="flex-1 px-3.5 py-2 glass-strong rounded-xl focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all text-sm placeholder:text-neutral-600"
                      />
                      <button
                        type="button"
                        onClick={() => searchPlaylists(playlistQuery)}
                        disabled={searchingPlaylists}
                        className="px-4 py-2 glass-strong hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
                      >
                        Search
                      </button>
                    </div>
                    {searchingPlaylists && <p className="text-sm text-neutral-500">Searching...</p>}
                    {(playlistResults.length > 0 ? playlistResults : trendingPlaylists).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-neutral-500">
                          {playlistResults.length > 0 ? "Search Results" : "Trending on Audius"}
                        </p>
                        {(playlistResults.length > 0 ? playlistResults : trendingPlaylists).map((pl) => (
                          <PlaylistRow
                            key={pl.id}
                            playlist={pl}
                            selected={audiusPlaylistId === pl.id}
                            onSelect={() => selectPlaylist(pl)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={spotifyPlaylistUrl}
                      onChange={(e) => setSpotifyPlaylistUrl(e.target.value)}
                      placeholder="https://open.spotify.com/playlist/..."
                      className="w-full px-3.5 py-2.5 glass-strong rounded-xl focus:outline-none focus:ring-1 focus:ring-green-500/50 transition-all text-sm placeholder:text-neutral-600"
                    />
                    {spotifyPlaylistUrl && (
                      <p className="text-xs text-green-400 mt-1.5">Spotify playlist linked</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full px-4 py-3 bg-brand hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all text-sm shadow-md hover:shadow-lg hover:scale-[1.01]"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaylistRow({
  playlist,
  selected,
  onSelect,
}: {
  playlist: AudiusPlaylist;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
        selected
          ? "glass-strong bg-accent/10 ring-1 ring-accent/30"
          : "glass hover:bg-white/5"
      }`}
    >
      {playlist.artwork?.["150x150"] ? (
        <img src={playlist.artwork["150x150"]} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{playlist.playlist_name}</p>
        <p className="text-xs text-neutral-500 truncate">{playlist.user.name} &middot; {playlist.track_count} tracks</p>
      </div>
      {selected && <span className="text-xs text-accent flex-shrink-0 font-medium">Selected</span>}
    </button>
  );
}

function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) setEvents(await res.json());
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-400">Loading events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 glass rounded-xl">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-neutral-500">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p className="text-neutral-400 mb-1">No events yet</p>
        <p className="text-xs text-neutral-600">Create the first one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/events/${event.id}`}
          className="group block p-5 rounded-xl glass hover:bg-white/5 hover:-translate-y-1 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold group-hover:text-white transition-colors">{event.name}</h3>
            <span className="text-xs text-neutral-500 flex-shrink-0 ml-3">
              {new Date(event.date).toLocaleDateString()}
            </span>
          </div>
          {event.description && (
            <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{event.description}</p>
          )}
          <div className="flex gap-1.5">
            <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full border border-accent/20 font-medium">Roblox</span>
            {(event.audiusPlaylistId || event.spotifyPlaylistUrl) && (
              <span className="text-[10px] px-2 py-0.5 bg-pop/10 text-pop rounded-full border border-pop/20 font-medium">Music</span>
            )}
            {false && (
              <span className="text-[10px] px-2 py-0.5 bg-brand/10 text-accent rounded-full border border-brand/20 font-medium">Live</span>

            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

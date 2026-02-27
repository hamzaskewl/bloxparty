"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav, BackLink } from "@/components/Nav";

interface AudiusTrack {
  id: string;
  title: string;
  user: { id: string; name: string; handle: string };
  artwork?: { "150x150"?: string; "480x480"?: string };
  duration: number;
  play_count: number;
  genre: string;
}

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

const GENRES = [
  "Electronic",
  "Hip-Hop/Rap",
  "Pop",
  "R&B/Soul",
  "House",
  "Techno",
  "Ambient",
  "Lo-Fi",
];

type SortBy = "default" | "plays" | "duration";

export default function MusicPage() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<AudiusTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState<"trending" | "search" | "genre">(
    "trending"
  );
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    loadTrending();
  }, []);

  // Update progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
    };
  }, [playingTrackId]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setActiveTab("search");
    try {
      const res = await fetch(
        `${AUDIUS_HOST}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=50&app_name=bloxparty`
      );
      if (res.ok) {
        const data = await res.json();
        setTracks(data.data || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrending(genre?: string) {
    setLoading(true);
    setActiveTab(genre ? "genre" : "trending");
    setSelectedGenre(genre || null);
    try {
      const genreParam = genre
        ? `&genre=${encodeURIComponent(genre)}`
        : "";
      const res = await fetch(
        `${AUDIUS_HOST}/v1/tracks/trending?time=allTime&limit=50&app_name=bloxparty${genreParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setTracks(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load trending:", err);
    } finally {
      setLoading(false);
    }
  }

  function playTrack(track: AudiusTrack) {
    if (playingTrackId === track.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
      setPlayingTrack(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(
      `${AUDIUS_HOST}/v1/tracks/${track.id}/stream?app_name=bloxparty`
    );
    audio.volume = volume;
    audio.play();
    audio.onended = () => {
      // Auto-play next track
      const currentIndex = sortedTracks.findIndex((t) => t.id === track.id);
      if (currentIndex < sortedTracks.length - 1) {
        playTrack(sortedTracks[currentIndex + 1]);
      } else {
        setPlayingTrackId(null);
        setPlayingTrack(null);
        setProgress(0);
      }
    };

    audioRef.current = audio;
    setPlayingTrackId(track.id);
    setPlayingTrack(track);
  }

  function handleVolumeChange(newVol: number) {
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  }

  function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function formatPlays(count: number): string {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  }

  // Sort tracks
  const sortedTracks = [...tracks].sort((a, b) => {
    if (sortBy === "plays") return (b.play_count || 0) - (a.play_count || 0);
    if (sortBy === "duration") return b.duration - a.duration;
    return 0;
  });

  return (
    <main className={`min-h-screen ${playingTrack ? "pb-28" : "pb-16"}`}>
      <Nav />

      <div className="px-4 pt-24 max-w-6xl mx-auto">
        {/* Header row */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <BackLink href="/" label="Home" />
            <h1 className="text-3xl font-bold">Music</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Powered by Audius — discover and preview tracks for events
            </p>
          </div>
        </div>

        {/* Search + Sort row */}
        <div className="flex gap-3 mb-4 flex-col sm:flex-row">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artists, tracks..."
              className="flex-1 px-4 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-accent/50 focus:bg-neutral-800 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-brand hover:bg-accent disabled:opacity-50 rounded-xl font-medium transition-all text-sm border-2 border-brand shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              Search
            </button>
          </form>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl text-sm text-neutral-300 focus:outline-none focus:border-accent/50 transition-all"
          >
            <option value="default">Trending</option>
            <option value="plays">Most Plays</option>
            <option value="duration">Longest</option>
          </select>
        </div>

        {/* Genre tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => loadTrending()}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "trending"
                ? "bg-brand text-white shadow-sm border-2 border-brand"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border-2 border-neutral-800 hover:border-accent/40"
            }`}
          >
            All Trending
          </button>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => loadTrending(genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                selectedGenre === genre
                  ? "bg-brand text-white shadow-sm border-2 border-brand"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border-2 border-neutral-800 hover:border-accent/40"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <p className="text-neutral-400 text-sm">Loading tracks...</p>
          </div>
        )}

        {!loading && tracks.length === 0 && (
          <p className="text-neutral-500 text-center py-16 text-sm">
            No tracks found. Try a different search or genre.
          </p>
        )}

        {/* Track header */}
        {!loading && tracks.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-500 border-b-2 border-neutral-800 mb-1">
            <span className="w-8 text-right">#</span>
            <span className="w-10" />
            <span className="flex-1">Title</span>
            <span className="w-20 text-right hidden sm:block">Plays</span>
            <span className="w-14 text-right">Duration</span>
            <span className="w-16" />
          </div>
        )}

        {/* Track list */}
        <div>
          {sortedTracks.map((track, i) => (
            <div
              key={track.id}
              onClick={() => playTrack(track)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group ${
                playingTrackId === track.id
                  ? "bg-deep/40 border-2 border-brand/50"
                  : "hover:bg-neutral-900 border-2 border-transparent hover:border-neutral-800"
              }`}
            >
              {/* Number / playing indicator */}
              <span className={`w-8 text-right text-xs flex-shrink-0 ${
                playingTrackId === track.id
                  ? "text-accent font-bold"
                  : "text-neutral-600"
              }`}>
                {playingTrackId === track.id ? (
                  <span className="inline-flex gap-0.5 justify-end">
                    <span className="w-0.5 h-3 bg-accent rounded-full animate-pulse" />
                    <span className="w-0.5 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                    <span className="w-0.5 h-3.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                  </span>
                ) : (
                  i + 1
                )}
              </span>

              {/* Artwork */}
              {track.artwork?.["150x150"] ? (
                <img
                  src={track.artwork["150x150"]}
                  alt=""
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-neutral-600 text-lg">&#9835;</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  playingTrackId === track.id ? "text-accent" : ""
                }`}>
                  {track.title}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  <Link
                    href={`/artists/${track.user.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-accent transition-colors"
                  >
                    {track.user.name}
                  </Link>
                  {track.genre && (
                    <span className="text-neutral-700"> / {track.genre}</span>
                  )}
                </p>
              </div>

              {/* Plays */}
              <span className="w-20 text-right text-xs text-neutral-500 flex-shrink-0 hidden sm:block">
                {formatPlays(track.play_count || 0)}
              </span>

              {/* Duration */}
              <span className="w-14 text-right text-xs text-neutral-500 flex-shrink-0">
                {formatDuration(track.duration)}
              </span>

              {/* Play indicator */}
              <span className="w-16 text-right flex-shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  playingTrackId === track.id
                    ? "bg-brand text-white border border-brand"
                    : "bg-transparent text-transparent group-hover:bg-neutral-800 group-hover:text-neutral-300 group-hover:border group-hover:border-neutral-700"
                }`}>
                  {playingTrackId === track.id ? "Playing" : "Play"}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Now playing bar - fixed bottom */}
      {playingTrack && (
        <div className="fixed bottom-0 left-0 w-full bg-neutral-950/90 backdrop-blur-xl border-t-2 border-neutral-800 z-50">
          {/* Progress bar */}
          <div
            className="h-1 bg-neutral-800 cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-accent group-hover:bg-accent/80 transition-colors relative"
              style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 py-3 max-w-6xl mx-auto">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {playingTrack.artwork?.["150x150"] ? (
                <img
                  src={playingTrack.artwork["150x150"]}
                  alt=""
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-neutral-600 text-lg">&#9835;</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {playingTrack.title}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  <Link
                    href={`/artists/${playingTrack.user.id}`}
                    className="hover:text-accent transition-colors"
                  >
                    {playingTrack.user.name}
                  </Link>
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => playTrack(playingTrack)}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-md"
              >
                <span className="text-lg">&#9646;&#9646;</span>
              </button>
            </div>

            {/* Time + Volume */}
            <div className="flex items-center gap-4 flex-1 justify-end">
              <span className="text-xs text-neutral-500 hidden sm:block">
                {formatDuration(progress)} / {formatDuration(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-2 hidden sm:flex">
                <button
                  onClick={() => handleVolumeChange(volume === 0 ? 0.7 : 0)}
                  className="text-neutral-400 hover:text-white text-sm"
                >
                  {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 accent-[#3A9AFF] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

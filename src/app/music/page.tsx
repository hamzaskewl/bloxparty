"use client";

import { useState } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface AudiusTrack {
  id: string;
  title: string;
  user: { name: string };
  artwork?: { "150x150"?: string; "480x480"?: string };
  duration: number;
  play_count: number;
}

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

export default function MusicPage() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [showTrending, setShowTrending] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${AUDIUS_HOST}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setTracks(data.data || []);
        setShowTrending(false);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrending() {
    setLoading(true);
    try {
      const res = await fetch(`${AUDIUS_HOST}/v1/tracks/trending?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data.data || []);
        setShowTrending(true);
      }
    } catch (err) {
      console.error("Failed to load trending:", err);
    } finally {
      setLoading(false);
    }
  }

  function togglePlay(trackId: string) {
    if (playingTrackId === trackId && activeAudio) {
      activeAudio.pause();
      setPlayingTrackId(null);
      setActiveAudio(null);
      return;
    }

    // Stop previous
    if (activeAudio) {
      activeAudio.pause();
    }

    const streamUrl = `${AUDIUS_HOST}/v1/tracks/${trackId}/stream`;
    const audio = new Audio(streamUrl);
    audio.play();
    audio.onended = () => {
      setPlayingTrackId(null);
      setActiveAudio(null);
    };

    setPlayingTrackId(trackId);
    setActiveAudio(audio);
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <main className="min-h-screen px-4 pt-24 pb-16 max-w-5xl mx-auto">
      <nav className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm z-50">
        <Link href="/" className="text-xl font-bold tracking-tight">
          deadathon
        </Link>
        <WalletMultiButton />
      </nav>

      <Link
        href="/"
        className="text-sm text-neutral-400 hover:text-neutral-200 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-3xl font-bold mb-2">Music</h1>
      <p className="text-neutral-400 mb-6">
        Browse and preview tracks from Audius. Event creators can add these to
        their Minecraft venue playlists.
      </p>

      <div className="flex gap-2 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks..."
            className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            Search
          </button>
        </form>
        <button
          onClick={loadTrending}
          disabled={loading}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-lg font-medium transition-colors text-sm"
        >
          Trending
        </button>
      </div>

      {loading && (
        <p className="text-neutral-400 text-center py-8">Loading...</p>
      )}

      {!loading && tracks.length === 0 && (
        <p className="text-neutral-500 text-center py-8">
          {showTrending
            ? "No trending tracks found."
            : "Search for tracks or browse trending."}
        </p>
      )}

      <div className="space-y-2">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-4 p-3 bg-neutral-900 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
          >
            {/* Artwork */}
            {track.artwork?.["150x150"] ? (
              <img
                src={track.artwork["150x150"]}
                alt={track.title}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
                <span className="text-neutral-600 text-lg">&#9835;</span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{track.title}</p>
              <p className="text-sm text-neutral-400 truncate">
                {track.user.name}
              </p>
            </div>

            {/* Duration */}
            <span className="text-sm text-neutral-500 flex-shrink-0">
              {formatDuration(track.duration)}
            </span>

            {/* Play count */}
            <span className="text-xs text-neutral-600 flex-shrink-0 w-16 text-right">
              {track.play_count?.toLocaleString() || 0} plays
            </span>

            {/* Play button */}
            <button
              onClick={() => togglePlay(track.id)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded font-medium text-sm transition-colors flex-shrink-0"
            >
              {playingTrackId === track.id ? "Stop" : "Play"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

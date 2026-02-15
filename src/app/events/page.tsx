"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { Event } from "@/lib/db/schema";

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
      <nav className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm z-50">
        <Link href="/" className="text-xl font-bold tracking-tight">
          deadathon
        </Link>
        <WalletMultiButton />
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Events</h1>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors text-sm"
        >
          {isCreating ? "Browse Events" : "Create Event"}
        </button>
      </div>

      {isCreating ? <CreateEventForm /> : <EventList />}
    </main>
  );
}

function CreateEventForm() {
  const { publicKey, connected } = useWallet();
  const [step, setStep] = useState(1);

  // Step 1: basics
  const [name, setName] = useState("");
  const [ticketPrice, setTicketPrice] = useState(0.1);

  // Step 2: optional extras (shown after basics)
  const [description, setDescription] = useState("");
  const [maxTickets, setMaxTickets] = useState(100);
  const [mcServerIp, setMcServerIp] = useState("");
  const [twitchChannel, setTwitchChannel] = useState("");

  // Step 3: Audius playlist picker
  const [audiusPlaylistId, setAudiusPlaylistId] = useState("");
  const [selectedPlaylistName, setSelectedPlaylistName] = useState("");
  const [playlistQuery, setPlaylistQuery] = useState("");
  const [playlistResults, setPlaylistResults] = useState<AudiusPlaylist[]>([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState<AudiusPlaylist[]>([]);
  const [searchingPlaylists, setSearchingPlaylists] = useState(false);

  const [loading, setLoading] = useState(false);

  if (!connected) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-400 mb-4">
          Connect your wallet to create an event.
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!publicKey || !name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          date: new Date().toISOString(),
          maxTickets,
          ticketPriceLamports: Math.floor(ticketPrice * 1e9),
          creatorWallet: publicKey.toBase58(),
          mcServerIp: mcServerIp || undefined,
          twitchChannel: twitchChannel || undefined,
          audiusPlaylistId: audiusPlaylistId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create event");

      const event = await res.json();
      window.location.href = `/events/${event.id}`;
    } catch (err) {
      console.error("Failed to create event:", err);
      alert("Failed to create event. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function searchPlaylists(q: string) {
    if (!q.trim()) return;
    setSearchingPlaylists(true);
    try {
      const res = await fetch(
        `${AUDIUS_HOST}/v1/playlists/search?query=${encodeURIComponent(q)}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        setPlaylistResults(data.data || []);
      }
    } catch {
      // Non-critical
    } finally {
      setSearchingPlaylists(false);
    }
  }

  async function loadTrendingPlaylists() {
    if (trendingPlaylists.length > 0) return;
    setSearchingPlaylists(true);
    try {
      const res = await fetch(`${AUDIUS_HOST}/v1/playlists/trending?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setTrendingPlaylists(data.data || []);
      }
    } catch {
      // Non-critical
    } finally {
      setSearchingPlaylists(false);
    }
  }

  function selectPlaylist(playlist: AudiusPlaylist) {
    setAudiusPlaylistId(playlist.id);
    setSelectedPlaylistName(playlist.playlist_name);
  }

  // Step 1: Just name + price
  if (step === 1) {
    return (
      <div className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Event Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Solana Concert Night"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Ticket Price (SOL)
          </label>
          <input
            type="number"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(Number(e.target.value))}
            step={0.01}
            min={0}
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          onClick={() => name.trim() && setStep(2)}
          disabled={!name.trim()}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          Next
        </button>
      </div>
    );
  }

  // Step 2: Optional details + integrations
  if (step === 2) {
    return (
      <div className="max-w-lg space-y-4">
        <button
          onClick={() => setStep(1)}
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          &larr; Back
        </button>

        <p className="text-sm text-neutral-500">
          Optional — add details or skip to the next step.
        </p>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What's this event about?"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Max Tickets
            </label>
            <input
              type="number"
              value={maxTickets}
              onChange={(e) => setMaxTickets(Number(e.target.value))}
              min={1}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              MC Server IP
            </label>
            <input
              type="text"
              value={mcServerIp}
              onChange={(e) => setMcServerIp(e.target.value)}
              placeholder="play.example.com"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Twitch Channel
          </label>
          <input
            type="text"
            value={twitchChannel}
            onChange={(e) => setTwitchChannel(e.target.value)}
            placeholder="your_channel"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setStep(3);
              loadTrendingPlaylists();
            }}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
          >
            Add Music
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Skip & Create"}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Audius playlist picker
  return (
    <div className="max-w-lg space-y-4">
      <button
        onClick={() => setStep(2)}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        &larr; Back
      </button>

      <h2 className="text-lg font-semibold">Pick a Playlist from Audius</h2>

      {selectedPlaylistName && (
        <div className="p-3 bg-purple-950/50 border border-purple-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-purple-300">
            Selected: <strong>{selectedPlaylistName}</strong>
          </span>
          <button
            onClick={() => {
              setAudiusPlaylistId("");
              setSelectedPlaylistName("");
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200"
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
          className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={() => searchPlaylists(playlistQuery)}
          disabled={searchingPlaylists}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>
      </div>

      {searchingPlaylists && (
        <p className="text-sm text-neutral-500">Searching...</p>
      )}

      {/* Search results */}
      {playlistResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">Search Results</p>
          {playlistResults.map((pl) => (
            <PlaylistRow
              key={pl.id}
              playlist={pl}
              selected={audiusPlaylistId === pl.id}
              onSelect={() => selectPlaylist(pl)}
            />
          ))}
        </div>
      )}

      {/* Trending playlists */}
      {playlistResults.length === 0 && trendingPlaylists.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">Trending on Audius</p>
          {trendingPlaylists.map((pl) => (
            <PlaylistRow
              key={pl.id}
              playlist={pl}
              selected={audiusPlaylistId === pl.id}
              onSelect={() => selectPlaylist(pl)}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {loading ? "Creating..." : "Create Event"}
      </button>
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
      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
        selected
          ? "bg-purple-950/50 border-purple-700"
          : "bg-neutral-900 border-neutral-800 hover:border-neutral-600"
      }`}
    >
      {playlist.artwork?.["150x150"] ? (
        <img
          src={playlist.artwork["150x150"]}
          alt=""
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
          <span className="text-neutral-600">&#9835;</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">
          {playlist.playlist_name}
        </p>
        <p className="text-xs text-neutral-400 truncate">
          {playlist.user.name} &middot; {playlist.track_count} tracks
        </p>
      </div>
      {selected && (
        <span className="text-xs text-purple-400 flex-shrink-0">Selected</span>
      )}
    </button>
  );
}

function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/tickets");
        if (res.ok) {
          setEvents(await res.json());
        }
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
      <div className="text-center py-16">
        <p className="text-neutral-400">
          No events yet. Create the first one!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event) => {
        const priceInSol = event.ticketPrice / LAMPORTS_PER_SOL;
        const remaining = event.maxTickets - event.ticketsSold;

        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="block p-5 bg-neutral-900 rounded-xl border border-neutral-800 hover:border-neutral-600 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-1">{event.name}</h3>
            {event.description && (
              <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <span>{priceInSol} SOL</span>
              <span>
                {remaining > 0
                  ? `${remaining} tickets left`
                  : "Sold out"}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {event.mcServerIp && (
                <span className="text-xs px-2 py-0.5 bg-green-950 text-green-400 rounded">
                  Minecraft
                </span>
              )}
              {event.twitchChannel && (
                <span className="text-xs px-2 py-0.5 bg-purple-950 text-purple-400 rounded">
                  Twitch
                </span>
              )}
              {event.audiusPlaylistId && (
                <span className="text-xs px-2 py-0.5 bg-pink-950 text-pink-400 rounded">
                  Music
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { Event } from "@/lib/db/schema";
import { Nav } from "@/components/Nav";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

const MC_SERVER_IP =
  process.env.NEXT_PUBLIC_MC_SERVER_IP || "play.deadathon.xyz";

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
      <Nav />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Browse or create blockchain-ticketed experiences
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isCreating
              ? "bg-neutral-900 hover:bg-neutral-800 border-2 border-neutral-700 hover:border-purple-500/40 text-neutral-300"
              : "bg-purple-600 hover:bg-purple-500 text-white border-2 border-purple-700 shadow-md hover:shadow-lg hover:scale-[1.02]"
          }`}
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
          mcServerIp: MC_SERVER_IP,
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
            className="w-full px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all text-sm"
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
            className="w-full px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all text-sm"
          />
        </div>

        <button
          onClick={() => name.trim() && setStep(2)}
          disabled={!name.trim()}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all text-sm border-2 border-purple-700 shadow-md hover:shadow-lg hover:scale-[1.02]"
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border-2 border-neutral-800 hover:border-purple-500/40 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
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
            className="w-full px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Max Tickets
          </label>
          <input
            type="number"
            value={maxTickets}
            onChange={(e) => setMaxTickets(Number(e.target.value))}
            min={1}
            className="w-full px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all text-sm"
          />
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
            className="w-full px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setStep(3);
              loadTrendingPlaylists();
            }}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium transition-all text-sm border-2 border-purple-700 shadow-md hover:shadow-lg hover:scale-[1.02]"
          >
            Add Music
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 border-2 border-neutral-700 hover:border-purple-500/40 rounded-xl font-medium transition-all disabled:opacity-50 text-sm"
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border-2 border-neutral-800 hover:border-purple-500/40 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back
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
          className="flex-1 px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all text-sm"
        />
        <button
          onClick={() => searchPlaylists(playlistQuery)}
          disabled={searchingPlaylists}
          className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border-2 border-neutral-700 hover:border-purple-500/40 rounded-xl text-sm font-medium transition-all"
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
        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all text-sm border-2 border-purple-700 shadow-md hover:shadow-lg hover:scale-[1.02]"
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
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
        selected
          ? "bg-purple-500/10 border-purple-500/30"
          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
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
            className="group block p-5 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold group-hover:text-white transition-colors">{event.name}</h3>
              <span className="text-sm font-semibold text-purple-400 flex-shrink-0 ml-3">
                {priceInSol} SOL
              </span>
            </div>
            {event.description && (
              <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {event.mcServerIp && (
                  <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 font-medium">
                    Minecraft
                  </span>
                )}
                {event.twitchChannel && (
                  <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 font-medium">
                    Twitch
                  </span>
                )}
                {event.audiusPlaylistId && (
                  <span className="text-[10px] px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded-full border border-pink-500/20 font-medium">
                    Music
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium ${remaining > 0 ? "text-neutral-500" : "text-red-400"}`}>
                {remaining > 0 ? `${remaining} left` : "Sold out"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

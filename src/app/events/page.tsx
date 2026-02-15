"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { Event } from "@/lib/db/schema";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [maxTickets, setMaxTickets] = useState(100);
  const [ticketPrice, setTicketPrice] = useState(0.1);
  const [mcServerIp, setMcServerIp] = useState("");
  const [twitchChannel, setTwitchChannel] = useState("");
  const [audiusPlaylistId, setAudiusPlaylistId] = useState("");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          date,
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

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm text-neutral-400 mb-1">
          Event Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-400 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Date</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
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
            required
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            required
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            MC Server IP (optional)
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Twitch Channel (optional)
          </label>
          <input
            type="text"
            value={twitchChannel}
            onChange={(e) => setTwitchChannel(e.target.value)}
            placeholder="your_channel"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Audius Playlist ID (optional)
          </label>
          <input
            type="text"
            value={audiusPlaylistId}
            onChange={(e) => setAudiusPlaylistId(e.target.value)}
            placeholder="playlist ID from Audius"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {loading ? "Creating..." : "Create Event"}
      </button>
    </form>
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
              <span>
                {new Date(event.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>{priceInSol} SOL</span>
              <span>
                {remaining > 0
                  ? `${remaining} tickets left`
                  : "Sold out"}
              </span>
            </div>
            {event.mcServerIp && (
              <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-green-950 text-green-400 rounded">
                Minecraft
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

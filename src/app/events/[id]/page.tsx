"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import type { Event } from "@/lib/db/schema";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [mcUsername, setMcUsername] = useState("");
  const [linkingMc, setLinkingMc] = useState(false);
  const [ticketOwned, setTicketOwned] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<
    { id: string; title: string; user: { name: string } }[]
  >([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  const AUDIUS_HOST =
    process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
    "https://discoveryprovider.audius.co";

  useEffect(() => {
    fetchEvent();
  }, [id]);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/tickets?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);

        // Fetch Audius playlist tracks if configured
        if (data.audiusPlaylistId) {
          try {
            const playlistRes = await fetch(
              `${AUDIUS_HOST}/v1/playlists/${data.audiusPlaylistId}/tracks`
            );
            if (playlistRes.ok) {
              const playlistData = await playlistRes.json();
              setPlaylistTracks(playlistData.data || []);
            }
          } catch {
            // Non-critical
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch event:", err);
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
    if (activeAudio) activeAudio.pause();

    const audio = new Audio(`${AUDIUS_HOST}/v1/tracks/${trackId}/stream`);
    audio.play();
    audio.onended = () => {
      setPlayingTrackId(null);
      setActiveAudio(null);
    };
    setPlayingTrackId(trackId);
    setActiveAudio(audio);
  }

  async function handleBuyTicket() {
    if (!publicKey || !event || !sendTransaction) return;

    setBuying(true);
    try {
      // For hackathon: simple SOL transfer to creator as "ticket purchase"
      // In production, this would mint a Token-2022 ticket
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(event.creatorWallet),
          lamports: event.ticketPrice,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setTicketOwned(true);

      // Record the purchase in our DB
      await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          buyerWallet: publicKey.toBase58(),
          txSignature: sig,
        }),
      });
    } catch (err) {
      console.error("Failed to buy ticket:", err);
      alert("Transaction failed. Make sure you have enough devnet SOL.");
    } finally {
      setBuying(false);
    }
  }

  async function handleLinkMc() {
    if (!publicKey || !mcUsername.trim()) return;

    setLinkingMc(true);
    try {
      const res = await fetch("/api/minecraft/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: id,
          walletAddress: publicKey.toBase58(),
          mcUsername: mcUsername.trim(),
        }),
      });

      if (res.ok) {
        alert(`${mcUsername} has been whitelisted! You can now join the server.`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to whitelist");
      }
    } catch (err) {
      console.error("Failed to link MC:", err);
    } finally {
      setLinkingMc(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-400">Loading...</p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-400">Event not found.</p>
      </main>
    );
  }

  const priceInSol = event.ticketPrice / LAMPORTS_PER_SOL;
  const ticketsRemaining = event.maxTickets - event.ticketsSold;

  return (
    <main className="min-h-screen px-4 pt-24 pb-16 max-w-3xl mx-auto">
      <nav className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm z-50">
        <Link href="/" className="text-xl font-bold tracking-tight">
          deadathon
        </Link>
        <WalletMultiButton />
      </nav>

      <Link
        href="/events"
        className="text-sm text-neutral-400 hover:text-neutral-200 mb-6 inline-block"
      >
        &larr; Back to Events
      </Link>

      <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
      {event.description && (
        <p className="text-neutral-400 mb-4">{event.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
          <p className="text-sm text-neutral-400">Date</p>
          <p className="font-medium">
            {new Date(event.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
          <p className="text-sm text-neutral-400">Tickets</p>
          <p className="font-medium">
            {ticketsRemaining} / {event.maxTickets} remaining
          </p>
        </div>
        <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
          <p className="text-sm text-neutral-400">Price</p>
          <p className="font-medium">{priceInSol} SOL</p>
        </div>
        {event.mcServerIp && (
          <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
            <p className="text-sm text-neutral-400">MC Server</p>
            <p className="font-medium font-mono text-sm">
              {event.mcServerIp}
            </p>
          </div>
        )}
        {event.twitchChannel && (
          <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
            <p className="text-sm text-neutral-400">Twitch</p>
            <a
              href={`https://twitch.tv/${event.twitchChannel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-purple-400 hover:underline text-sm"
            >
              twitch.tv/{event.twitchChannel}
            </a>
          </div>
        )}
      </div>

      {/* Buy Ticket Section */}
      {!ticketOwned ? (
        <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800 mb-6">
          <h2 className="text-xl font-semibold mb-4">Buy Ticket</h2>
          {!connected ? (
            <p className="text-neutral-400">
              Connect your wallet to buy a ticket.
            </p>
          ) : ticketsRemaining <= 0 ? (
            <p className="text-red-400">Sold out!</p>
          ) : (
            <button
              onClick={handleBuyTicket}
              disabled={buying}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {buying
                ? "Processing..."
                : `Buy Ticket for ${priceInSol} SOL`}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Success message */}
          <div className="p-6 bg-green-950/50 rounded-xl border border-green-800 mb-6">
            <h2 className="text-xl font-semibold text-green-400 mb-2">
              Ticket Purchased!
            </h2>
            {txSig && (
              <p className="text-sm text-neutral-400 break-all">
                TX:{" "}
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  {txSig.slice(0, 20)}...
                </a>
              </p>
            )}
          </div>

          {/* Link MC Username */}
          {event.mcServerIp && (
            <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
              <h2 className="text-xl font-semibold mb-4">
                Join the Minecraft Server
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                Enter your Minecraft username to get whitelisted.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mcUsername}
                  onChange={(e) => setMcUsername(e.target.value)}
                  placeholder="Your MC username"
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleLinkMc}
                  disabled={linkingMc || !mcUsername.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                  {linkingMc ? "Linking..." : "Whitelist Me"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Audius Playlist */}
      {playlistTracks.length > 0 && (
        <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800 mt-6">
          <h2 className="text-xl font-semibold mb-4">Event Playlist</h2>
          <p className="text-sm text-neutral-400 mb-4">
            Music powered by Audius. This playlist streams inside the Minecraft
            venue via OpenAudioMC.
          </p>
          <div className="space-y-2">
            {playlistTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{track.title}</p>
                  <p className="text-sm text-neutral-400 truncate">
                    {track.user.name}
                  </p>
                </div>
                <button
                  onClick={() => togglePlay(track.id)}
                  className="ml-3 px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm font-medium transition-colors flex-shrink-0"
                >
                  {playingTrackId === track.id ? "Stop" : "Play"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

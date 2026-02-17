"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import Link from "next/link";
import type { Event } from "@/lib/db/schema";
import { buildStealthTransfer } from "@/lib/stealth/transfer";
import { Nav, BackLink } from "@/components/Nav";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

type PurchaseStep = "idle" | "signing" | "confirming" | "recording" | "done";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, sendTransaction, signMessage, connected } = useWallet();
  const { connection } = useConnection();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>("idle");
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  // Stealth mode
  const [stealthMode, setStealthMode] = useState(false);
  const [stealthAddress, setStealthAddress] = useState<string | null>(null);
  const [alreadyHasTicket, setAlreadyHasTicket] = useState(false);

  // Post-purchase: MC linking
  const [mcUsername, setMcUsername] = useState("");
  const [linkingMc, setLinkingMc] = useState(false);
  const [mcLinked, setMcLinked] = useState(false);

  // Audius playlist
  const [playlistTracks, setPlaylistTracks] = useState<
    { id: string; title: string; user: { name: string }; duration?: number }[]
  >([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  // Check if wallet already has a ticket
  useEffect(() => {
    if (!publicKey || !id) return;
    fetch(`/api/tickets?wallet=${publicKey.toBase58()}&eventId=${id}`)
      .then((res) => res.json())
      .then((data) => setAlreadyHasTicket(data.hasTicket))
      .catch(() => {});
  }, [publicKey, id]);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/tickets?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);

        if (data.audiusPlaylistId) {
          try {
            const playlistRes = await fetch(
              `${AUDIUS_HOST}/v1/playlists/${data.audiusPlaylistId}/tracks?app_name=deadathon`
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

    const audio = new Audio(
      `${AUDIUS_HOST}/v1/tracks/${trackId}/stream?app_name=deadathon`
    );
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

  async function handleBuyTicket() {
    if (!publicKey || !event || !sendTransaction) return;

    setPurchaseError(null);
    setPurchaseStep("signing");

    try {
      let tx: Transaction;
      let stealthAddr: string | null = null;
      let ephemeralKey: string | null = null;

      if (stealthMode && signMessage) {
        // Stealth purchase: derive stealth address and build stealth tx
        const message = new TextEncoder().encode("deadathon-stealth-keys-v1");
        const signature = await signMessage(message);

        const scanSeed = signature.slice(0, 32);
        const spendSeed = signature.slice(32, 64);

        const result = buildStealthTransfer({
          recipientScanSeed: scanSeed,
          recipientSpendSeed: spendSeed,
          lamports: event.ticketPrice,
          senderPubkey: publicKey,
          paymentRecipient: new PublicKey(event.creatorWallet),
        });

        tx = result.transaction;
        stealthAddr = result.stealthAddress;
        ephemeralKey = result.ephemeralX25519Pubkey;
        setStealthAddress(stealthAddr);
      } else {
        // Normal purchase
        tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(event.creatorWallet),
            lamports: event.ticketPrice,
          })
        );
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      setPurchaseStep("confirming");
      const sig = await sendTransaction(tx, connection);

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      setTxSig(sig);
      setPurchaseStep("recording");

      // Record in DB
      const recordRes = await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          buyerWallet: publicKey.toBase58(),
          txSignature: sig,
          isStealth: !!stealthAddr,
          stealthAddress: stealthAddr || undefined,
          ephemeralPubkey: ephemeralKey || undefined,
        }),
      });

      if (!recordRes.ok) {
        const err = await recordRes.json();
        if (err.error?.includes("already have")) {
          setPurchaseError("You already have a ticket for this event.");
          setPurchaseStep("idle");
          setAlreadyHasTicket(true);
          return;
        }
      }

      setPurchaseStep("done");
      setAlreadyHasTicket(true);
      fetchEvent();
    } catch (err: unknown) {
      console.error("Failed to buy ticket:", err);
      const message =
        err instanceof Error ? err.message : "Transaction failed";

      if (message.includes("User rejected")) {
        setPurchaseError("Transaction cancelled.");
      } else if (message.includes("Insufficient")) {
        setPurchaseError(
          "Not enough SOL. Get devnet SOL from faucet.solana.com"
        );
      } else {
        setPurchaseError(message);
      }
      setPurchaseStep("idle");
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
          walletAddress: stealthAddress || publicKey.toBase58(),
          mcUsername: mcUsername.trim(),
        }),
      });

      if (res.ok) {
        setMcLinked(true);
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
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <p className="text-neutral-400">Loading event...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">Event not found.</p>
        <Link
          href="/events"
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Browse events
        </Link>
      </main>
    );
  }

  const priceInSol = event.ticketPrice / LAMPORTS_PER_SOL;
  const ticketsRemaining = event.maxTickets - event.ticketsSold;
  const hasPurchased = purchaseStep === "done" || alreadyHasTicket;

  return (
    <main className="min-h-screen px-4 pt-24 pb-16 max-w-3xl mx-auto">
      <Nav />
      <BackLink href="/events" label="Events" />

      <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
      {event.description && (
        <p className="text-neutral-400 mb-6 text-lg">{event.description}</p>
      )}

      {/* Event Info Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <InfoCard
          label="Price"
          value={`${priceInSol} SOL`}
          accent
        />
        <InfoCard
          label="Tickets"
          value={
            ticketsRemaining > 0
              ? `${ticketsRemaining} / ${event.maxTickets}`
              : "Sold out"
          }
          accent={ticketsRemaining <= 5 && ticketsRemaining > 0}
        />
        {event.mcServerIp && (
          <InfoCard label="Minecraft Server" value={event.mcServerIp} mono />
        )}
        {event.twitchChannel && (
          <div className="p-4 rounded-xl border-2 border-neutral-800 bg-neutral-900 shadow-sm">
            <p className="text-xs text-neutral-500 mb-1">Twitch</p>
            <a
              href={`https://twitch.tv/${event.twitchChannel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              twitch.tv/{event.twitchChannel}
            </a>
          </div>
        )}
      </div>

      {/* Purchase Flow */}
      {!hasPurchased ? (
        <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm mb-6">
          {!connected ? (
            <div className="text-center py-6">
              <p className="text-neutral-400 mb-4">
                Connect your wallet to buy a ticket
              </p>
              <WalletButton />
            </div>
          ) : ticketsRemaining <= 0 ? (
            <p className="text-red-400 text-center py-6 font-medium">
              Sold out
            </p>
          ) : (
            <div className="space-y-4">
              {/* Stealth toggle */}
              <div className="flex items-center justify-between p-3.5 bg-neutral-900/50 rounded-xl border-2 border-neutral-800">
                <div>
                  <p className="text-sm font-medium">Private purchase</p>
                  <p className="text-xs text-neutral-500">
                    Uses a stealth address — your wallet stays hidden on-chain
                  </p>
                </div>
                <button
                  onClick={() => setStealthMode(!stealthMode)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    stealthMode ? "bg-purple-600" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      stealthMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleBuyTicket}
                disabled={purchaseStep !== "idle"}
                className="group relative w-full px-4 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-all overflow-hidden border-2 border-purple-700 shadow-lg shadow-purple-500/30 hover:scale-[1.02]"
              >
                <span className="relative z-10">
                  {purchaseStep === "idle" &&
                    `Buy Ticket${stealthMode ? " (Private)" : ""} — ${priceInSol} SOL`}
                  {purchaseStep === "signing" &&
                    (stealthMode
                      ? "Sign to derive stealth keys..."
                      : "Waiting for wallet...")}
                  {purchaseStep === "confirming" && "Confirming on Solana..."}
                  {purchaseStep === "recording" && "Recording purchase..."}
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Progress indicator */}
              {purchaseStep !== "idle" && (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  <p className="text-sm text-neutral-400">
                    {purchaseStep === "signing" &&
                      (stealthMode
                        ? "Two signatures needed: stealth keys + transaction"
                        : "Approve the transaction in your wallet")}
                    {purchaseStep === "confirming" &&
                      "Waiting for network confirmation..."}
                    {purchaseStep === "recording" && "Almost done..."}
                  </p>
                </div>
              )}

              {purchaseError && (
                <p className="text-sm text-red-400 text-center">
                  {purchaseError}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {/* Success */}
          <div className="p-6 rounded-2xl border-2 border-green-800 bg-green-950/40 shadow-sm">
            <p className="text-green-400 font-semibold text-lg mb-1">
              You&apos;re in!
            </p>
            <div className="space-y-1">
              {txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-400 hover:text-purple-400 transition-colors block"
                >
                  View transaction &rarr;
                </a>
              )}
              {stealthAddress && (
                <div className="mt-2">
                  <p className="text-xs text-neutral-500">
                    Stealth address (private)
                  </p>
                  <p className="text-xs font-mono text-purple-400 break-all">
                    {stealthAddress}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Use the{" "}
                    <Link
                      href="/scan"
                      className="text-purple-400 hover:underline"
                    >
                      scanner
                    </Link>{" "}
                    to find your private tickets later.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* MC Whitelist — only show if event has MC server */}
          {event.mcServerIp && !mcLinked && (
            <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm">
              <p className="font-semibold mb-1">Join the Minecraft server</p>
              <p className="text-sm text-neutral-400 mb-4">
                Enter your Minecraft username to get whitelisted on{" "}
                <span className="font-mono text-neutral-300">
                  {event.mcServerIp}
                </span>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mcUsername}
                  onChange={(e) => setMcUsername(e.target.value)}
                  placeholder="Minecraft username"
                  className="flex-1 px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-neutral-800 transition-all text-sm"
                />
                <button
                  onClick={handleLinkMc}
                  disabled={linkingMc || !mcUsername.trim()}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-medium transition-all text-sm border-2 border-green-700 shadow-md hover:shadow-lg hover:scale-[1.02]"
                >
                  {linkingMc ? "Linking..." : "Join"}
                </button>
              </div>
            </div>
          )}

          {/* MC linked success */}
          {event.mcServerIp && mcLinked && (
            <div className="p-6 rounded-2xl border-2 border-green-800 bg-green-950/40 shadow-sm">
              <p className="text-green-400 font-semibold">
                {mcUsername} is whitelisted!
              </p>
              <p className="text-sm text-neutral-400 mt-1">
                Open Minecraft, go to Multiplayer, and connect to{" "}
                <span className="font-mono text-neutral-300">
                  {event.mcServerIp}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Audius Playlist */}
      {playlistTracks.length > 0 && (
        <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm">
          <h2 className="font-semibold mb-1">Event Playlist</h2>
          <p className="text-xs text-neutral-500 mb-3">
            Powered by Audius — this music plays live at the Minecraft venue
          </p>
          <div className="space-y-1">
            {playlistTracks.map((track, i) => (
              <div
                key={track.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  playingTrackId === track.id
                    ? "bg-purple-950/40 border-2 border-purple-800"
                    : "hover:bg-neutral-800 border-2 border-transparent"
                }`}
              >
                <span className="text-xs text-neutral-600 w-5 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {track.user.name}
                  </p>
                </div>
                {track.duration && (
                  <span className="text-xs text-neutral-600 flex-shrink-0">
                    {formatDuration(track.duration)}
                  </span>
                )}
                <button
                  onClick={() => togglePlay(track.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                    playingTrackId === track.id
                      ? "bg-purple-600 text-white"
                      : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                  }`}
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

function InfoCard({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border-2 shadow-sm ${
        accent
          ? "border-purple-800 bg-purple-950/40"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p
        className={`text-sm font-medium ${mono ? "font-mono" : ""} ${
          accent ? "text-purple-300" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

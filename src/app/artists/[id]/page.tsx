"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type {
  AudiusUser,
  AudiusTrack,
  Coin,
} from "@/lib/audius/client";
import { Nav, BackLink } from "@/components/Nav";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

interface EventLink {
  id: string;
  name: string;
  date: string;
  audiusUserId?: string;
}

/** Format small prices like 0.00000041 → 0.0₅41 */
function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  const str = price.toFixed(20);
  const match = str.match(/^0\.(0+)/);
  if (!match) return `$${price.toFixed(4)}`;
  const zeroCount = match[1].length;
  if (zeroCount <= 2) return `$${price.toFixed(4)}`;
  const significantDigits = str.slice(2 + zeroCount, 2 + zeroCount + 4);
  const subscripts = "₀₁₂₃₄₅₆₇₈₉";
  const sub = String(zeroCount).split("").map((d) => subscripts[parseInt(d)]).join("");
  return `$0.0${sub}${significantDigits}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ArtistProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [user, setUser] = useState<AudiusUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [coin, setCoin] = useState<Coin | null>(null);
  const [events, setEvents] = useState<EventLink[]>([]);
  const [votes, setVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  // Audio
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id]);

  async function loadProfile() {
    setLoading(true);
    try {
      const userRes = await fetch(
        `${AUDIUS_HOST}/v1/users/${id}?app_name=bloxparty`
      );
      if (!userRes.ok) throw new Error("Failed to fetch user");
      const userData = await userRes.json();
      setUser(userData.data);

      const [tracksData, coinsData, eventsData, voteData] =
        await Promise.all([
          fetch(`${AUDIUS_HOST}/v1/users/${id}/tracks?limit=20&app_name=bloxparty`)
            .then((r) => (r.ok ? r.json() : { data: [] })),
          fetch(`${AUDIUS_HOST}/v1/coins?limit=100&app_name=bloxparty`)
            .then((r) => (r.ok ? r.json() : { data: [] })),
          fetch("/api/events").then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/artists/vote?audiusUserId=${id}`).then((r) =>
            r.ok ? r.json() : { votes: 0 }
          ),
        ]);

      setTracks(tracksData.data || []);
      setVotes(voteData.votes || 0);

      const allCoins: Coin[] = coinsData.data || [];
      const artistCoin = allCoins.find((c) => c.owner_id === id);
      if (artistCoin) setCoin(artistCoin);

      const artistEvents = (eventsData as EventLink[]).filter(
        (e: EventLink) => e.audiusUserId === id
      );
      setEvents(artistEvents);

      // Check if already voted this session
      const voted = sessionStorage.getItem(`voted_${id}`);
      if (voted) setHasVoted(true);
    } catch (err) {
      console.error("Failed to load artist:", err);
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
      `${AUDIUS_HOST}/v1/tracks/${trackId}/stream?app_name=bloxparty`
    );
    audio.play();
    audio.onended = () => {
      setPlayingTrackId(null);
      setActiveAudio(null);
    };
    setPlayingTrackId(trackId);
    setActiveAudio(audio);
  }

  const handleVote = useCallback(async () => {
    if (hasVoted) return;
    setVotes((v) => v + 1);
    setHasVoted(true);
    sessionStorage.setItem(`voted_${id}`, "1");
    try {
      await fetch("/api/artists/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audiusUserId: id }),
      });
    } catch {
      setVotes((v) => Math.max(v - 1, 0));
      setHasVoted(false);
      sessionStorage.removeItem(`voted_${id}`);
    }
  }, [id, hasVoted]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-400">Loading artist...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">Artist not found.</p>
        <Link href="/artists" className="text-sm text-accent hover:text-accent">
          Browse artists
        </Link>
      </main>
    );
  }

  const change = coin?.priceChange24hPercent || 0;

  return (
    <main className="min-h-screen">
      <Nav />

      {/* Hero Banner */}
      <div className="bg-deep/40 pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <BackLink href="/artists" label="Artists" />

          <div className="flex flex-col md:flex-row items-start gap-6 mt-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user.profile_picture?.["480x480"] ? (
                <img
                  src={user.profile_picture["480x480"]}
                  alt={user.name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover shadow-2xl shadow-deep/30"
                  loading="eager"
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-deep flex items-center justify-center shadow-2xl">
                  <span className="text-accent text-5xl font-bold">{user.name[0]}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{user.name}</h1>
              <p className="text-neutral-400 text-lg mt-1">@{user.handle}</p>
              {user.bio && (
                <p className="text-sm text-neutral-500 mt-3 max-w-2xl line-clamp-2">{user.bio}</p>
              )}

              {/* Stats Row */}
              <div className="flex flex-wrap gap-6 mt-4">
                <div>
                  <p className="text-2xl font-bold">{formatNumber(user.follower_count)}</p>
                  <p className="text-xs text-neutral-500">Followers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.track_count}</p>
                  <p className="text-xs text-neutral-500">Tracks</p>
                </div>
                {coin && (
                  <div>
                    <p className="text-2xl font-bold">{formatNumber(coin.holder ?? coin.holder_count ?? 0)}</p>
                    <p className="text-xs text-neutral-500">Coin Holders</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-5">
                <a
                  href={`https://audius.co/${user.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-brand hover:bg-accent rounded-xl text-sm font-semibold transition-all border border-brand"
                >
                  View on Audius
                </a>
                {coin && (
                  <a
                    href={`https://birdeye.so/token/${coin.mint}?chain=solana`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-accent hover:bg-accent/80 rounded-xl text-sm font-semibold transition-all border border-accent"
                  >
                    Buy ${coin.ticker}
                  </a>
                )}
                <button
                  onClick={handleVote}
                  disabled={hasVoted}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    hasVoted
                      ? "bg-deep/40 border-brand/30 text-pop/60 cursor-not-allowed"
                      : "bg-pop hover:bg-pop/80 border-pop active:scale-95"
                  }`}
                >
                  {hasVoted ? `Voted (${votes})` : `Vote for Concert (${votes})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN — 2/3 width */}
          <div className="lg:col-span-2 space-y-6">

            {/* Birdeye Chart */}
            {coin && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-accent">${coin.ticker}</span>
                    <span className="text-lg font-bold">{formatPrice(coin.price)}</span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${
                      change >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`https://birdeye.so/token/${coin.mint}?chain=solana`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      Birdeye
                    </a>
                    <a
                      href={`https://dexscreener.com/solana/${coin.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      DexScreener
                    </a>
                    <a
                      href={`https://jup.ag/swap/SOL-${coin.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      Jupiter
                    </a>
                  </div>
                </div>
                <iframe
                  src={`https://birdeye.so/tv-widget/${coin.mint}?chain=solana&viewMode=pair&chartInterval=1D&chartType=AREA&chartLeftToolbar=hide&theme=dark`}
                  className="w-full h-[400px] border-0"
                  title={`${coin.ticker} chart`}
                  loading="lazy"
                  allow="clipboard-write"
                />
              </div>
            )}

            {/* Tracks */}
            {tracks.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Tracks</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => togglePlay(track.id)}
                      className={`group relative flex gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                        playingTrackId === track.id
                          ? "bg-deep/50 border-brand shadow-lg shadow-deep/20"
                          : "bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800/70 hover:border-neutral-700"
                      }`}
                    >
                      {/* Artwork */}
                      <div className="relative flex-shrink-0">
                        {track.artwork?.["480x480"] || track.artwork?.["150x150"] ? (
                          <img
                            src={track.artwork["480x480"] || track.artwork["150x150"]}
                            alt={track.title}
                            className="w-20 h-20 rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-neutral-800 flex items-center justify-center">
                            <span className="text-neutral-600 text-2xl">&#9835;</span>
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition-opacity ${
                          playingTrackId === track.id
                            ? "bg-black/40 opacity-100"
                            : "bg-black/40 opacity-0 group-hover:opacity-100"
                        }`}>
                          {playingTrackId === track.id ? (
                            <div className="flex items-end gap-0.5 h-4">
                              <span className="w-1 h-full bg-accent rounded-full animate-pulse" />
                              <span className="w-1 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                              <span className="w-1 h-full bg-accent rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                            </div>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Track Info */}
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <p className={`font-semibold text-sm truncate ${
                          playingTrackId === track.id ? "text-accent" : ""
                        }`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">{user.name}</p>
                        {track.duration > 0 && (
                          <p className="text-xs text-neutral-600 mt-1">
                            {formatDuration(track.duration)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — 1/3 width (sidebar) */}
          <div className="space-y-6">

            {/* Coin Stats Card */}
            {coin && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  {coin.logo_uri && (
                    <img src={coin.logo_uri} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  <span className="font-bold text-accent">${coin.ticker}</span>
                  <span className="text-xs text-neutral-500 ml-auto">Creator Coin</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-500">Price</span>
                    <span className="font-bold text-lg">{formatPrice(coin.price)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-500">24h Change</span>
                    <span className={`font-semibold ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-500">Market Cap</span>
                    <span className="font-semibold">${formatNumber(coin.marketCap || coin.market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-500">24h Volume</span>
                    <span className="font-semibold">${formatNumber(coin.v24hUSD || coin.volume_24h || 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-500">Holders</span>
                    <span className="font-semibold">{(coin.holder ?? coin.holder_count ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                  <a
                    href={`https://birdeye.so/token/${coin.mint}?chain=solana`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2.5 bg-accent hover:bg-accent/80 rounded-xl text-sm font-semibold transition-all"
                  >
                    Trade on Birdeye
                  </a>
                  <a
                    href={`https://jup.ag/swap/SOL-${coin.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-semibold transition-all border border-neutral-700"
                  >
                    Swap on Jupiter
                  </a>
                </div>
              </div>
            )}

            {/* Vote Card */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
              <h3 className="font-semibold mb-3">Vote for Concert</h3>
              <p className="text-xs text-neutral-500 mb-4">
                Vote for {user.name} to perform at the next token-gated event.
              </p>
              <button
                onClick={handleVote}
                disabled={hasVoted}
                className={`w-full py-3 rounded-xl font-semibold transition-all text-sm ${
                  hasVoted
                    ? "bg-deep/30 text-pop/60 border border-brand/30 cursor-not-allowed"
                    : "bg-pop hover:bg-pop/80 border border-pop active:scale-[0.98]"
                }`}
              >
                {hasVoted ? "Already Voted" : "Vote"}
              </button>
              <p className="text-center text-xs text-neutral-500 mt-2">
                <span className="text-pop font-bold">{votes}</span> votes so far
              </p>
            </div>

            {/* Upcoming Event */}
            {events.length > 0 && (
              <Link
                href={`/events/${events[0].id}`}
                className="block rounded-2xl border border-green-800/50 bg-green-950/20 p-5 hover:border-green-600/50 transition-all group"
              >
                <p className="text-green-400 font-semibold text-sm">Upcoming Event</p>
                <p className="text-white font-medium mt-1">{events[0].name}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {new Date(events[0].date).toLocaleDateString()} &middot; View details &rarr;
                </p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

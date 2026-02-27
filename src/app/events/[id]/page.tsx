"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/lib/db/schema";
import { Nav, BackLink } from "@/components/Nav";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

const DISCORD_INVITE =
  process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/bloxparty";

const ROBLOX_PLACE_ID =
  process.env.NEXT_PUBLIC_ROBLOX_PLACE_ID || "";

interface AudiusArtistProfile {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  profile_picture: { "150x150"?: string; "480x480"?: string } | null;
  follower_count: number;
  track_count: number;
}

interface CoinData {
  mint: string;
  ticker: string;
  name: string;
  price: number;
  owner_id?: string;
  marketCap?: number;
  holder?: number;
  v24hUSD?: number;
  priceChange24hPercent?: number;
}

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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState<AudiusArtistProfile | null>(null);
  const [coin, setCoin] = useState<CoinData | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<
    { id: string; title: string; user: { name: string }; duration?: number; artwork?: { "150x150"?: string } }[]
  >([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);

        if (data.audiusUserId) {
          const [artistData, coinsData] = await Promise.all([
            fetch(`${AUDIUS_HOST}/v1/users/${data.audiusUserId}?app_name=bloxparty`)
              .then((r) => (r.ok ? r.json() : { data: null })),
            fetch(`${AUDIUS_HOST}/v1/coins?app_name=bloxparty&limit=100`)
              .then((r) => (r.ok ? r.json() : { data: [] })),
          ]);

          if (artistData.data) setArtist(artistData.data);

          const allCoins = coinsData.data || [];
          const artistCoin = allCoins.find(
            (c: CoinData) => c.owner_id === data.audiusUserId
          );
          if (artistCoin) setCoin(artistCoin);
        }

        if (data.audiusPlaylistId) {
          try {
            const playlistRes = await fetch(
              `${AUDIUS_HOST}/v1/playlists/${data.audiusPlaylistId}/tracks?app_name=bloxparty`
            );
            if (playlistRes.ok) {
              const playlistData = await playlistRes.json();
              setPlaylistTracks(playlistData.data || []);
            }
          } catch {
            // Non-critical
          }
        } else if (data.audiusUserId) {
          // Fallback: fetch artist's top tracks as the playlist
          try {
            const tracksRes = await fetch(
              `${AUDIUS_HOST}/v1/users/${data.audiusUserId}/tracks?limit=10&app_name=bloxparty`
            );
            if (tracksRes.ok) {
              const tracksData = await tracksRes.json();
              setPlaylistTracks(tracksData.data || []);
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-400">Loading event...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">Event not found.</p>
        <Link href="/events" className="text-sm text-accent hover:text-accent">Browse events</Link>
      </main>
    );
  }

  const spotifyEmbedUrl = event.spotifyPlaylistUrl
    ? event.spotifyPlaylistUrl.replace("open.spotify.com/", "open.spotify.com/embed/")
    : null;

  const change = coin?.priceChange24hPercent || 0;

  return (
    <main className="min-h-screen">
      <Nav />

      {/* Hero Banner */}
      <div className="bg-deep/30 pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <BackLink href="/events" label="Events" />

          <div className="flex flex-col md:flex-row items-start gap-6 mt-4">
            {/* Artist avatar */}
            {artist && (
              <div className="flex-shrink-0">
                {artist.profile_picture?.["480x480"] ? (
                  <img
                    src={artist.profile_picture["480x480"]}
                    alt={artist.name}
                    className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover shadow-2xl shadow-deep/30"
                    loading="eager"
                  />
                ) : (
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-deep flex items-center justify-center shadow-2xl">
                    <span className="text-accent text-4xl font-bold">{artist.name[0]}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{event.name}</h1>
              {event.description && (
                <p className="text-neutral-400 text-lg mt-2 max-w-2xl">{event.description}</p>
              )}
              <p className="text-sm text-neutral-500 mt-2">
                {new Date(event.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              {artist && (
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-sm text-neutral-400">Performing:</span>
                  <Link
                    href={`/artists/${event.audiusUserId}`}
                    className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    {artist.name}
                  </Link>
                  <span className="text-xs text-neutral-600">
                    {artist.follower_count.toLocaleString()} followers
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-5">
                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-brand hover:bg-accent rounded-xl text-sm font-semibold transition-all border border-brand"
                >
                  Join Discord
                </a>
                {ROBLOX_PLACE_ID && (
                  <a
                    href={`https://www.roblox.com/games/${ROBLOX_PLACE_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-semibold transition-all border border-green-500"
                  >
                    Open Roblox
                  </a>
                )}
                {event.twitchChannel && (
                  <a
                    href={`https://twitch.tv/${event.twitchChannel}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-brand hover:bg-accent rounded-xl text-sm font-semibold transition-all border border-brand"
                  >
                    Watch on Twitch
                  </a>
                )}
                {artist && (
                  <a
                    href={`https://audius.co/${artist.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-semibold transition-all border border-neutral-700"
                  >
                    Audius Profile
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN — 2/3 */}
          <div className="lg:col-span-2 space-y-6">

            {/* Birdeye Chart */}
            {coin && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-accent">${coin.ticker}</span>
                    <span className="font-bold">{formatPrice(coin.price)}</span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${
                      change >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a href={`https://birdeye.so/token/${coin.mint}?chain=solana`} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">Birdeye</a>
                    <a href={`https://jup.ag/swap/SOL-${coin.mint}`} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">Jupiter</a>
                  </div>
                </div>
                <iframe
                  src={`https://birdeye.so/tv-widget/${coin.mint}?chain=solana&viewMode=pair&chartInterval=1D&chartType=AREA&chartLeftToolbar=hide&theme=dark`}
                  className="w-full h-[350px] border-0"
                  title={`${coin.ticker} chart`}
                  loading="lazy"
                  allow="clipboard-write"
                />
              </div>
            )}

            {/* Audius Playlist */}
            {playlistTracks.length > 0 && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-800">
                  <h2 className="font-semibold">Event Playlist</h2>
                  <p className="text-xs text-neutral-500">Powered by Audius</p>
                </div>
                <div className="p-3 space-y-1">
                  {playlistTracks.map((track, i) => (
                    <button
                      key={track.id}
                      onClick={() => togglePlay(track.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        playingTrackId === track.id
                          ? "bg-deep/50 border border-brand"
                          : "hover:bg-neutral-800/70 border border-transparent"
                      }`}
                    >
                      <span className="text-xs text-neutral-600 w-5 text-right flex-shrink-0">
                        {playingTrackId === track.id ? (
                          <span className="inline-flex gap-0.5 justify-end">
                            <span className="w-0.5 h-3 bg-accent rounded-full animate-pulse" />
                            <span className="w-0.5 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                            <span className="w-0.5 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                          </span>
                        ) : (
                          i + 1
                        )}
                      </span>
                      {track.artwork?.["150x150"] ? (
                        <img src={track.artwork["150x150"]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-neutral-600">&#9835;</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${playingTrackId === track.id ? "text-accent" : ""}`}>{track.title}</p>
                        <p className="text-xs text-neutral-500 truncate">{track.user.name}</p>
                      </div>
                      {track.duration && (
                        <span className="text-xs text-neutral-600 flex-shrink-0">
                          {formatDuration(track.duration)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spotify Embed */}
            {spotifyEmbedUrl && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-800">
                  <h2 className="font-semibold">Spotify Playlist</h2>
                </div>
                <iframe
                  src={spotifyEmbedUrl}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-b-2xl"
                />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — 1/3 (sidebar) */}
          <div className="space-y-6">

            {/* Creator Coin Stats */}
            {coin && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                <div className="flex items-center gap-2 mb-4">
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
                    <span className="font-semibold">${formatNumber(coin.marketCap || 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-500">Holders</span>
                    <span className="font-semibold">{(coin.holder || 0).toLocaleString()}</span>
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
                <div className="mt-3 p-3 rounded-lg bg-yellow-950/20 border border-yellow-800/20">
                  <p className="text-xs text-yellow-200/70">Hold this coin for VIP access to token-gated events</p>
                </div>
              </div>
            )}

            {/* How to Join */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
              <h3 className="font-semibold mb-4">How to Join</h3>
              <div className="space-y-4">
                <StepItem number={1} title="Hold the creator coin" description="Your Solana wallet needs the creator's token." />
                <StepItem number={2} title="Join Discord" description="Collab.Land verifies your holdings." />
                <StepItem number={3} title="Submit Roblox username" description="Use the bot in Discord to get whitelisted." />
                <StepItem number={4} title="Join the experience" description="Enter Roblox and enjoy the concert." />
              </div>
            </div>

            {/* Artist Profile Link */}
            {artist && event.audiusUserId && (
              <Link
                href={`/artists/${event.audiusUserId}`}
                className="block rounded-2xl border border-brand/40 bg-deep/20 p-5 hover:border-brand/50 transition-all text-center"
              >
                <p className="text-sm font-medium text-accent">
                  View {artist.name}&apos;s Full Profile &rarr;
                </p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StepItem({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center flex-shrink-0 text-xs font-bold">
        {number}
      </div>
      <div className="pt-0.5">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

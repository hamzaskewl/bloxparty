"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import type { AudiusUser, Coin } from "@/lib/audius/client";
import { Nav } from "@/components/Nav";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

type SortMode = "market_cap" | "volume" | "votes";

interface ArtistWithCoin {
  user: AudiusUser;
  coin: Coin;
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

export default function ArtistsPage() {
  const { publicKey } = useWallet();
  const [artists, setArtists] = useState<ArtistWithCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("market_cap");
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AudiusUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadArtists();
    loadVotes();
    // Load voted set from session
    const stored = sessionStorage.getItem("voted_artists");
    if (stored) setVotedSet(new Set(JSON.parse(stored)));
  }, []);

  async function loadArtists() {
    setLoading(true);
    try {
      const coinsRes = await fetch(
        `${AUDIUS_HOST}/v1/coins?sort=market_cap&limit=20&app_name=bloxparty`
      );
      if (!coinsRes.ok) throw new Error("Failed to fetch coins");
      const coinsData = await coinsRes.json();
      const coins: Coin[] = coinsData.data || [];

      const artistPromises = coins
        .filter((c) => c.owner_id)
        .map(async (coin) => {
          try {
            const userRes = await fetch(
              `${AUDIUS_HOST}/v1/users/${coin.owner_id}?app_name=bloxparty`
            );
            if (!userRes.ok) return null;
            const userData = await userRes.json();
            return { user: userData.data as AudiusUser, coin };
          } catch {
            return null;
          }
        });

      const results = await Promise.all(artistPromises);
      setArtists(results.filter(Boolean) as ArtistWithCoin[]);
    } catch (err) {
      console.error("Failed to load artists:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadVotes() {
    try {
      const res = await fetch("/api/artists/vote");
      if (res.ok) {
        const data = await res.json();
        const counts: Record<string, number> = {};
        for (const item of data) {
          counts[item.audiusUserId] = item.votes;
        }
        setVoteCounts(counts);
      }
    } catch {
      // Non-critical
    }
  }

  async function handleVote(audiusUserId: string) {
    if (votedSet.has(audiusUserId)) return;

    // Optimistic update
    setVoteCounts((prev) => ({
      ...prev,
      [audiusUserId]: (prev[audiusUserId] || 0) + 1,
    }));
    setVotedSet((prev) => {
      const next = new Set(prev);
      next.add(audiusUserId);
      sessionStorage.setItem("voted_artists", JSON.stringify([...next]));
      return next;
    });

    try {
      await fetch("/api/artists/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audiusUserId,
          voterWallet: publicKey?.toBase58() || null,
        }),
      });
    } catch {
      setVoteCounts((prev) => ({
        ...prev,
        [audiusUserId]: Math.max((prev[audiusUserId] || 0) - 1, 0),
      }));
      setVotedSet((prev) => {
        const next = new Set(prev);
        next.delete(audiusUserId);
        sessionStorage.setItem("voted_artists", JSON.stringify([...next]));
        return next;
      });
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${AUDIUS_HOST}/v1/users/search?query=${encodeURIComponent(searchQuery)}&limit=10&app_name=bloxparty`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data || []);
      }
    } catch {
      // Non-critical
    } finally {
      setSearching(false);
    }
  }

  const sortedArtists = [...artists].sort((a, b) => {
    if (sortMode === "votes") {
      return (voteCounts[b.user.id] || 0) - (voteCounts[a.user.id] || 0);
    }
    if (sortMode === "volume") {
      return (b.coin.v24hUSD || b.coin.volume_24h || 0) - (a.coin.v24hUSD || a.coin.volume_24h || 0);
    }
    return (b.coin.marketCap || b.coin.market_cap || 0) - (a.coin.marketCap || a.coin.market_cap || 0);
  });

  return (
    <main className="min-h-screen">
      <Nav />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Discover Artists</h1>
            <p className="text-neutral-500 mt-1">
              Explore Audius creators with coins. Vote for who performs next.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); }}}
              placeholder="Search artists..."
              className="w-56 px-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-xl focus:outline-none focus:border-accent/50 transition-all text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-brand hover:bg-accent rounded-xl text-sm font-medium transition-all border border-brand"
            >
              {searching ? "..." : "Search"}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-neutral-400">Search Results</p>
              <button
                onClick={() => setSearchResults([])}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((u) => (
                <Link
                  key={u.id}
                  href={`/artists/${u.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/70 hover:border-neutral-700 transition-all"
                >
                  {u.profile_picture?.["150x150"] ? (
                    <img src={u.profile_picture["150x150"]} alt="" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-deep flex items-center justify-center">
                      <span className="text-accent font-bold">{u.name[0]}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-neutral-500">@{u.handle} &middot; {u.follower_count.toLocaleString()} followers</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sort Tabs */}
        <div className="flex gap-1 mb-6 bg-neutral-900/50 p-1 rounded-xl w-fit border border-neutral-800">
          {(
            [
              { key: "market_cap", label: "Market Cap" },
              { key: "volume", label: "Volume" },
              { key: "votes", label: "Most Voted" },
            ] as { key: SortMode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSortMode(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortMode === tab.key
                  ? "bg-brand text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-400">Loading creator coins...</p>
          </div>
        )}

        {!loading && sortedArtists.length === 0 && (
          <div className="text-center py-20">
            <p className="text-neutral-400">No artists found.</p>
          </div>
        )}

        {/* Artist Grid — 3 columns on desktop */}
        {!loading && sortedArtists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedArtists.map((a) => {
              const change = a.coin.priceChange24hPercent || 0;
              const hasVoted = votedSet.has(a.user.id);
              return (
                <div
                  key={a.user.id}
                  className="group rounded-2xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-neutral-700 transition-all duration-200 overflow-hidden"
                >
                  {/* Top section: avatar + info */}
                  <div className="p-5 pb-4">
                    <div className="flex items-center gap-4">
                      <Link href={`/artists/${a.user.id}`} className="flex-shrink-0">
                        {a.user.profile_picture?.["150x150"] ? (
                          <img
                            src={a.user.profile_picture["150x150"]}
                            alt={a.user.name}
                            className="w-14 h-14 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-deep flex items-center justify-center">
                            <span className="text-accent text-xl font-bold">{a.user.name[0]}</span>
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/artists/${a.user.id}`} className="font-semibold text-base hover:text-accent transition-colors truncate block">
                          {a.user.name}
                        </Link>
                        <p className="text-xs text-neutral-500">@{a.user.handle}</p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {formatNumber(a.user.follower_count)} followers &middot; {a.user.track_count} tracks
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Coin stats row */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950/50 border border-neutral-800">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-accent text-sm">${a.coin.ticker}</span>
                          <span className="font-bold text-sm">{formatPrice(a.coin.price)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                          </span>
                          <span className="text-xs text-neutral-600">
                            {(a.coin.holder ?? a.coin.holder_count ?? 0).toLocaleString()} holders
                          </span>
                          {(a.coin.v24hUSD || a.coin.volume_24h || 0) > 0 && (
                            <span className="text-xs text-neutral-600">
                              ${formatNumber(a.coin.v24hUSD || a.coin.volume_24h || 0)} vol
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center border-t border-neutral-800">
                    <Link
                      href={`/artists/${a.user.id}`}
                      className="flex-1 px-5 py-3 text-sm font-medium text-center text-accent hover:bg-deep/30 transition-colors"
                    >
                      View Profile
                    </Link>
                    <div className="w-px h-8 bg-neutral-800" />
                    <button
                      onClick={() => handleVote(a.user.id)}
                      disabled={hasVoted}
                      className={`flex items-center justify-center gap-2 flex-1 px-5 py-3 text-sm font-medium transition-colors ${
                        hasVoted
                          ? "text-pop/50 cursor-not-allowed"
                          : "text-pop hover:bg-deep/30"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={hasVoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {voteCounts[a.user.id] || 0}
                    </button>
                    <div className="w-px h-8 bg-neutral-800" />
                    <a
                      href={`https://audius.co/${a.user.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-5 py-3 text-sm font-medium text-center text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors"
                    >
                      Audius
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import type { Coin, AudiusUser } from "@/lib/audius/client";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

const ROBLOX_PLACE = process.env.NEXT_PUBLIC_ROBLOX_PLACE_ID || "77480467395158";

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

function formatMcap(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function Home() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<
    { user: AudiusUser; coin: Coin }[]
  >([]);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [coins, featuredArtists]);

  async function loadData() {
    try {
      const res = await fetch(
        `${AUDIUS_HOST}/v1/coins?sort=market_cap&limit=12&app_name=bloxparty`
      );
      if (!res.ok) return;
      const data = await res.json();
      const allCoins: Coin[] = data.data || [];
      setCoins(allCoins);

      const top6 = allCoins.slice(0, 6).filter((c) => c.owner_id);
      const profiles = await Promise.all(
        top6.map(async (coin) => {
          try {
            const r = await fetch(
              `${AUDIUS_HOST}/v1/users/${coin.owner_id}?app_name=bloxparty`
            );
            if (!r.ok) return null;
            const d = await r.json();
            return { user: d.data as AudiusUser, coin };
          } catch {
            return null;
          }
        })
      );
      setFeaturedArtists(
        profiles.filter(Boolean) as { user: AudiusUser; coin: Coin }[]
      );
    } catch {
      // Non-critical
    }
  }

  return (
    <main ref={mainRef} className="min-h-screen">
      <Nav />

      {/* Hero — tighter, more modern */}
      <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 relative">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-brand/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[200px] bg-accent/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-2xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 text-[11px] font-semibold rounded-full glass-strong text-accent uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-pop animate-pulse" />
            Audius + Solana + Roblox
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            Token-Gated
            <br />
            Concerts on{" "}
            <span
              style={{
                backgroundImage: `
                  radial-gradient(circle at 40% 40%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 30%, transparent 50%),
                  radial-gradient(circle at 60% 60%, rgba(0,0,0,0.25) 0%, transparent 45%),
                  linear-gradient(135deg, #F1FF5E 0%, #d4e84a 100%)
                `,
                backgroundSize: "18px 18px, 18px 18px, 100% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >Roblox</span>
          </h1>
          <p className="text-base md:text-lg text-neutral-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Hold the coin. Join the show. Discover artists, vote for who performs,
            and enter exclusive concerts.
          </p>

          <div className="flex flex-wrap gap-2.5 justify-center">
            <a
              href={`https://www.roblox.com/games/${ROBLOX_PLACE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all border border-green-500 active:scale-[0.97]"
            >
              <CubeIcon />
              Join on Roblox
            </a>
            <Link
              href="/artists"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-accent text-white font-bold text-sm transition-all active:scale-[0.97]"
            >
              Discover Artists
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-strong text-white font-bold text-sm transition-all hover:bg-white/10 active:scale-[0.97]"
            >
              Events
            </Link>
            <Link
              href="/music"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-strong text-white font-bold text-sm transition-all hover:bg-white/10 active:scale-[0.97]"
            >
              Music
            </Link>
          </div>
        </div>
      </div>

      {/* Coin Ticker */}
      {coins.length > 0 && (
        <div className="overflow-hidden glass py-2.5">
          <div
            className="flex gap-6 whitespace-nowrap"
            style={{
              animation: "marquee 35s linear infinite",
              width: "max-content",
            }}
          >
            {[...coins, ...coins].map((coin, i) => {
              const change = coin.priceChange24hPercent || 0;
              const isPositive = change >= 0;
              const mcap = coin.marketCap || coin.market_cap || 0;
              return (
                <span key={`${coin.mint}-${i}`} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-accent">${coin.ticker}</span>
                  <span className="text-neutral-400">{formatPrice(coin.price)}</span>
                  {mcap > 0 && (
                    <span className="text-neutral-600">{formatMcap(mcap)}</span>
                  )}
                  <span className={`font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{change.toFixed(1)}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pb-20 max-w-6xl mx-auto">
        {/* Featured Artists — 6 artists, compact cards */}
        {featuredArtists.length > 0 && (
          <div className="py-14" data-reveal>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 block mb-1">
                  Trending on Audius
                </span>
                <h2 className="text-2xl font-bold">Top Artists</h2>
              </div>
              <Link
                href="/artists"
                className="text-xs font-bold text-accent hover:text-accent/80 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {featuredArtists.map((a, idx) => {
                const mcap = a.coin.marketCap || a.coin.market_cap || 0;
                const change = a.coin.priceChange24hPercent || 0;
                return (
                  <Link
                    key={a.user.id}
                    href={`/artists/${a.user.id}`}
                    data-reveal
                    data-delay={String(idx + 1)}
                    className="group flex flex-col items-center p-4 rounded-xl glass hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {a.user.profile_picture?.["150x150"] ? (
                      <img
                        src={a.user.profile_picture["150x150"]}
                        alt={a.user.name}
                        className="w-14 h-14 rounded-full object-cover mb-2"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-deep flex items-center justify-center mb-2">
                        <span className="text-accent text-lg font-bold">{a.user.name[0]}</span>
                      </div>
                    )}
                    <p className="font-bold text-xs text-center group-hover:text-accent transition-colors truncate w-full">
                      {a.user.name}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {a.user.follower_count.toLocaleString()} fans
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[10px] font-bold text-accent">${a.coin.ticker}</span>
                      <span className={`text-[10px] font-medium ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {change >= 0 ? "+" : ""}{change.toFixed(0)}%
                      </span>
                    </div>
                    {mcap > 0 && (
                      <span className="text-[9px] text-neutral-600 mt-0.5">
                        MC {formatMcap(mcap)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* How It Works — horizontal pipeline */}
        <div data-reveal className="py-10">
          <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: <CoinIcon />, step: "01", title: "Hold the Coin", desc: "Buy a creator coin on Audius", color: "text-accent" },
              { icon: <ShieldIcon />, step: "02", title: "Verify on Discord", desc: "Collab.Land checks your wallet", color: "text-[#5865F2]" },
              { icon: <LinkIcon />, step: "03", title: "Link Roblox", desc: "Run /link with your username", color: "text-pop" },
              { icon: <CubeIcon />, step: "04", title: "Join Concert", desc: "Enter the Roblox experience", color: "text-green-400" },
            ].map((s, i) => (
              <div
                key={i}
                data-reveal
                data-delay={String(i + 1)}
                className="relative p-4 rounded-xl glass hover:bg-white/5 transition-all text-center"
              >
                <span className="text-[10px] font-bold text-neutral-700 absolute top-3 left-3">{s.step}</span>
                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mx-auto mb-2 ${s.color}`}>
                  {s.icon}
                </div>
                <h3 className="text-xs font-bold mb-0.5">{s.title}</h3>
                <p className="text-[10px] text-neutral-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack — single line */}
        <div className="text-center py-8" data-reveal>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["Solana", "Audius", "Creator Coins", "Phantom", "Roblox", "Discord", "Collab.Land", "Next.js", "Railway"].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 text-[10px] font-bold glass text-neutral-500 rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  );
}

function CubeIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>; }
function ShieldIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>; }
function CoinIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>; }
function LinkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>; }

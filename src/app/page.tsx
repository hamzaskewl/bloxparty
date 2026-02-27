"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import type { Coin, AudiusUser } from "@/lib/audius/client";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

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

  // Scroll reveal observer
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

      const top4 = allCoins.slice(0, 4).filter((c) => c.owner_id);
      const profiles = await Promise.all(
        top4.map(async (coin) => {
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

      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">
        {/* Subtle bg glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-3xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 text-xs font-semibold rounded-full glass-strong text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-pop animate-pulse" />
            Powered by Audius + Solana
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Token-Gated Concerts
            <br />
            <span className="text-pop">on{" "}
              <span
                className="roblox-studs"
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
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Discover artists with creator coins, vote for who performs next,
            and join exclusive live experiences in Roblox.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`https://www.roblox.com/games/${process.env.NEXT_PUBLIC_ROBLOX_PLACE_ID || "77480467395158"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg transition-all border border-green-500"
            >
              <CubeIcon />
              Join on Roblox
            </a>
            <Link
              href="/artists"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-brand hover:bg-accent text-white font-bold text-lg transition-all"
            >
              <ArrowIcon />
              Discover Artists
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glass-strong text-white font-bold text-lg transition-all hover:bg-white/10"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>

      {/* Coin Ticker */}
      {coins.length > 0 && (
        <div className="overflow-hidden glass py-3 mb-0">
          <div
            className="flex gap-8 whitespace-nowrap"
            style={{
              animation: "marquee 40s linear infinite",
              width: "max-content",
            }}
          >
            {[...coins, ...coins].map((coin, i) => {
              const change = coin.priceChange24hPercent || 0;
              const isPositive = change >= 0;
              const mcap = coin.marketCap || coin.market_cap || 0;
              return (
                <span key={`${coin.mint}-${i}`} className="inline-flex items-center gap-2 text-sm">
                  <span className="font-bold text-accent">${coin.ticker}</span>
                  <span className="text-neutral-400">
                    {formatPrice(coin.price)}
                  </span>
                  {mcap > 0 && (
                    <span className="text-neutral-600 text-xs">
                      MC {formatMcap(mcap)}
                    </span>
                  )}
                  <span className={isPositive ? "text-green-400" : "text-red-400"}>
                    {isPositive ? "+" : ""}{change.toFixed(1)}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pb-24 max-w-7xl mx-auto">
        {/* Featured Artists */}
        {featuredArtists.length > 0 && (
          <div className="py-16" data-reveal>
            <div className="text-center mb-8">
              <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-3 block">
                Trending on Audius
              </span>
              <h2 className="text-3xl font-bold">Featured Artists</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredArtists.map((a, idx) => {
                const mcap = a.coin.marketCap || a.coin.market_cap || 0;
                return (
                  <Link
                    key={a.user.id}
                    href={`/artists/${a.user.id}`}
                    data-reveal
                    data-delay={String(idx + 1)}
                    className="group flex flex-col items-center p-5 rounded-2xl glass hover:bg-white/5 hover:-translate-y-1 transition-all duration-300"
                  >
                    {a.user.profile_picture?.["150x150"] ? (
                      <img
                        src={a.user.profile_picture["150x150"]}
                        alt={a.user.name}
                        className="w-20 h-20 rounded-full object-cover mb-3"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-deep flex items-center justify-center mb-3">
                        <span className="text-accent text-2xl font-bold">
                          {a.user.name[0]}
                        </span>
                      </div>
                    )}
                    <p className="font-bold text-sm text-center group-hover:text-accent transition-colors">
                      {a.user.name}
                    </p>
                    <p className="text-xs text-neutral-500 mb-2">
                      {a.user.follower_count.toLocaleString()} fans
                    </p>
                    <span className="text-xs font-bold text-accent">
                      ${a.coin.ticker}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-neutral-500">
                        {formatPrice(a.coin.price)}
                      </span>
                      {mcap > 0 && (
                        <span className="text-[10px] text-neutral-600">
                          MC {formatMcap(mcap)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/artists"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full glass-strong text-sm font-bold text-accent hover:bg-white/10 transition-all"
              >
                View all artists
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Features — compact single row */}
        <div data-reveal className="py-12">
          <div className="text-center mb-8">
            <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-3 block">
              Audius Integration
            </span>
            <h2 className="text-3xl font-bold">What We Built</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FeatureCard
              icon={<CoinIcon />}
              title="Creator Coins"
              desc="Live prices, market caps, 24h volume from Audius."
              delay="1"
            />
            <FeatureCard
              icon={<UsersIcon />}
              title="Artist Discovery"
              desc="Browse trending artists, preview music, vote."
              delay="2"
            />
            <FeatureCard
              icon={<ShieldIcon />}
              title="Token-Gated"
              desc="Hold coins to unlock concerts via Discord."
              delay="3"
            />
            <FeatureCard
              icon={<CubeIcon />}
              title="Live in Roblox"
              desc="Concert venues with curated playlists and streams."
              delay="4"
            />
          </div>
        </div>

        {/* Tech stack */}
        <div className="text-center py-12" data-reveal>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-6">
            Built with
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Solana", "Audius API", "Creator Coins", "Phantom", "Roblox", "Discord", "Collab.Land", "Spotify", "Next.js", "Railway"].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 text-xs font-bold glass text-neutral-400 rounded-full hover:bg-white/5 hover:text-neutral-300 transition-all cursor-default"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-12" data-reveal>
          <div className="inline-flex flex-col sm:flex-row gap-3">
            <Link href="/artists" className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-accent rounded-2xl font-bold transition-all">
              <ArrowIcon />
              Discover Artists
            </Link>
            <Link href="/music" className="inline-flex items-center gap-2 px-6 py-3 glass-strong hover:bg-white/10 rounded-2xl font-bold transition-all">
              <MusicIcon />
              Browse Music
            </Link>
            <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 glass-strong hover:bg-white/10 rounded-2xl font-bold transition-all">
              <CalendarIcon />
              View Events
            </Link>
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

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: string }) {
  return (
    <div
      data-reveal
      data-delay={delay}
      className="p-5 rounded-2xl glass hover:bg-white/5 transition-all duration-300 text-center"
    >
      <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center mx-auto mb-3 text-accent">
        {icon}
      </div>
      <h3 className="text-sm font-bold mb-1">{title}</h3>
      <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function MusicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function ShieldIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>; }
function CubeIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>; }
function UsersIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>; }
function CoinIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>; }

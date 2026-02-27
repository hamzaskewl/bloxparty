"use client";

import Link from "next/link";
import type { AudiusUser, Coin } from "@/lib/audius/client";

interface ArtistCardProps {
  user: AudiusUser;
  coin?: Coin | null;
  compact?: boolean;
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

export function ArtistCard({ user, coin, compact }: ArtistCardProps) {
  if (compact) {
    return (
      <Link
        href={`/artists/${user.id}`}
        className="group flex flex-col items-center p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-neutral-700 hover:-translate-y-1 transition-all duration-300 min-w-[160px]"
      >
        {user.profile_picture?.["150x150"] ? (
          <img
            src={user.profile_picture["150x150"]}
            alt={user.name}
            className="w-16 h-16 rounded-full object-cover mb-3"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-deep flex items-center justify-center mb-3">
            <span className="text-accent text-2xl font-bold">{user.name[0]}</span>
          </div>
        )}
        <p className="font-semibold text-sm text-center group-hover:text-accent transition-colors">{user.name}</p>
        <p className="text-xs text-neutral-500">{user.follower_count.toLocaleString()} fans</p>
        {coin && (
          <div className="mt-2 text-center">
            <span className="text-xs font-bold text-accent">${coin.ticker}</span>
            <span className="text-xs text-neutral-500 ml-1">{formatPrice(coin.price)}</span>
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/artists/${user.id}`}
      className="group flex items-center gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/70 hover:border-neutral-700 transition-all"
    >
      {user.profile_picture?.["150x150"] ? (
        <img src={user.profile_picture["150x150"]} alt="" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-deep flex items-center justify-center">
          <span className="text-accent font-bold">{user.name[0]}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate group-hover:text-accent transition-colors">{user.name}</p>
        <p className="text-xs text-neutral-500">@{user.handle} &middot; {user.follower_count.toLocaleString()} followers</p>
        {coin && (
          <p className="text-xs mt-0.5">
            <span className="font-bold text-accent">${coin.ticker}</span>
            <span className="text-neutral-500 ml-1">{formatPrice(coin.price)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

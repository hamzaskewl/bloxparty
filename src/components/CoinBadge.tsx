import type { Coin } from "@/lib/audius/client";

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

export function CoinBadge({ coin, size = "default" }: { coin: Coin; size?: "compact" | "default" }) {
  const change = coin.priceChange24hPercent ?? 0;
  const isPositive = change >= 0;

  if (size === "compact") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-bold text-accent">${coin.ticker}</span>
        <span className="text-neutral-400">{formatPrice(coin.price)}</span>
        <span className={isPositive ? "text-green-400" : "text-red-400"}>
          {isPositive ? "+" : ""}{change.toFixed(1)}%
        </span>
      </span>
    );
  }

  const holders = coin.holder ?? coin.holder_count ?? 0;
  const volume = coin.v24hUSD ?? coin.volume_24h ?? 0;

  return (
    <div className="p-3 rounded-xl border border-brand/50 bg-deep/30">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-accent text-sm">${coin.ticker}</span>
        <span className={`text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{change.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-bold">{formatPrice(coin.price)}</span>
        <span className="text-xs text-neutral-500">{holders.toLocaleString()} holders</span>
        {volume > 0 && (
          <span className="text-xs text-neutral-500">
            ${volume < 1000 ? volume.toFixed(0) : `${(volume / 1000).toFixed(1)}K`} vol
          </span>
        )}
      </div>
    </div>
  );
}

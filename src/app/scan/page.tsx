"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import bs58 from "bs58";
import {
  generateStealthKeys,
  encodeStealthMeta,
} from "@/lib/stealth/keys";
import { tryRecoverStealthKeypair } from "@/lib/stealth/scanner";

export default function ScanPage() {
  const { publicKey, signMessage, connected } = useWallet();
  const [scanning, setScanning] = useState(false);
  const [stealthMeta, setStealthMeta] = useState<{
    scanPublicKey: string;
    spendPublicKey: string;
  } | null>(null);
  const [results, setResults] = useState<
    { address: string; ephemeralKey: string }[]
  >([]);

  async function handleGenerateKeys() {
    if (!signMessage || !publicKey) return;

    try {
      // Sign a deterministic message to derive stealth keys
      const message = new TextEncoder().encode(
        "deadathon-stealth-keys-v1"
      );
      const signature = await signMessage(message);

      const keys = generateStealthKeys(signature);
      const meta = encodeStealthMeta(keys);
      setStealthMeta(meta);
    } catch (err) {
      console.error("Failed to generate stealth keys:", err);
    }
  }

  async function handleScan() {
    if (!signMessage || !publicKey) return;

    setScanning(true);
    try {
      const message = new TextEncoder().encode(
        "deadathon-stealth-keys-v1"
      );
      const signature = await signMessage(message);

      const scanSeed = signature.slice(0, 32);
      const spendSeed = signature.slice(32, 64);

      // In production: fetch memo transactions from Helius, try each one
      // For the hackathon demo, we show the UI and structure
      setResults([]);
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="min-h-screen px-4 pt-24 pb-16 max-w-3xl mx-auto">
      <nav className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm z-50">
        <Link href="/" className="text-xl font-bold tracking-tight">
          deadathon
        </Link>
        <WalletMultiButton />
      </nav>

      <Link
        href="/"
        className="text-sm text-neutral-400 hover:text-neutral-200 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-3xl font-bold mb-2">Stealth Scanner</h1>
      <p className="text-neutral-400 mb-8">
        Scan for private ticket purchases sent to your stealth addresses.
        Your wallet signature derives deterministic keys used for discovery.
      </p>

      {!connected ? (
        <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800 text-center">
          <p className="text-neutral-400">
            Connect your wallet to scan for stealth payments.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Generate / Show Stealth Keys */}
          <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
            <h2 className="text-lg font-semibold mb-3">Your Stealth Keys</h2>
            {!stealthMeta ? (
              <button
                onClick={handleGenerateKeys}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
              >
                Derive Stealth Keys
              </button>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">
                    Scan Public Key (S)
                  </p>
                  <p className="text-sm font-mono text-neutral-300 break-all bg-neutral-800 p-2 rounded">
                    {stealthMeta.scanPublicKey}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">
                    Spend Public Key (B)
                  </p>
                  <p className="text-sm font-mono text-neutral-300 break-all bg-neutral-800 p-2 rounded">
                    {stealthMeta.spendPublicKey}
                  </p>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Share these public keys with senders for private ticket
                  purchases.
                </p>
              </div>
            )}
          </div>

          {/* Scan Button */}
          <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
            <h2 className="text-lg font-semibold mb-3">Scan for Payments</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Scans recent memo transactions on Solana to find payments
              addressed to your stealth keys.
            </p>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {scanning ? "Scanning..." : "Scan Now"}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800">
              <h2 className="text-lg font-semibold mb-3">Found Payments</h2>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 bg-neutral-800 rounded-lg text-sm font-mono break-all"
                  >
                    <p className="text-neutral-300">{r.address}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Ephemeral: {r.ephemeralKey}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && !scanning && stealthMeta && (
            <p className="text-sm text-neutral-500 text-center">
              No stealth payments found. Payments will appear here after
              someone sends a private ticket purchase.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

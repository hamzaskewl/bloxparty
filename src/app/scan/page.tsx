"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import Link from "next/link";
import bs58 from "bs58";
import {
  generateStealthKeys,
  encodeStealthMeta,
  deriveX25519KeyPair,
  computeSharedSecret,
  deriveStealthKeypair,
} from "@/lib/stealth/keys";
import { Nav, BackLink } from "@/components/Nav";

interface StealthTicket {
  id: string;
  eventId: string;
  stealthAddress: string | null;
  ephemeralPubkey: string | null;
  txSignature: string | null;
  purchasedAt: string;
}

interface FoundTicket {
  ticketId: string;
  eventId: string;
  stealthAddress: string;
  txSignature: string | null;
  eventName?: string;
}

export default function ScanPage() {
  const { publicKey, signMessage, connected } = useWallet();
  const [scanning, setScanning] = useState(false);
  const [stealthMeta, setStealthMeta] = useState<{
    scanPublicKey: string;
    spendPublicKey: string;
  } | null>(null);
  const [results, setResults] = useState<FoundTicket[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  async function handleGenerateKeys() {
    if (!signMessage || !publicKey) return;

    try {
      const message = new TextEncoder().encode("deadathon-stealth-keys-v1");
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
    setResults([]);
    try {
      const message = new TextEncoder().encode("deadathon-stealth-keys-v1");
      const signature = await signMessage(message);

      const scanSeed = signature.slice(0, 32);
      const spendSeed = signature.slice(32, 64);

      if (!stealthMeta) {
        const keys = generateStealthKeys(signature);
        const meta = encodeStealthMeta(keys);
        setStealthMeta(meta);
      }

      const res = await fetch("/api/tickets?stealth=true");
      if (!res.ok) {
        console.error("Failed to fetch stealth tickets");
        return;
      }
      const stealthTickets: StealthTicket[] = await res.json();

      const scanX25519 = deriveX25519KeyPair(scanSeed);
      const found: FoundTicket[] = [];

      for (const ticket of stealthTickets) {
        if (!ticket.ephemeralPubkey || !ticket.stealthAddress) continue;

        try {
          const ephemeralX25519Pub = bs58.decode(ticket.ephemeralPubkey);
          const sharedSecret = computeSharedSecret(
            scanX25519.secretKey,
            ephemeralX25519Pub
          );
          const stealthKeypair = deriveStealthKeypair(sharedSecret, spendSeed);
          const derivedAddress = bs58.encode(stealthKeypair.publicKey);

          if (derivedAddress === ticket.stealthAddress) {
            found.push({
              ticketId: ticket.id,
              eventId: ticket.eventId,
              stealthAddress: ticket.stealthAddress,
              txSignature: ticket.txSignature,
            });
          }
        } catch {
          // Skip invalid entries
        }
      }

      for (const ticket of found) {
        try {
          const eventRes = await fetch(`/api/tickets?id=${ticket.eventId}`);
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            ticket.eventName = eventData.name;
          }
        } catch {
          // Non-critical
        }
      }

      setResults(found);
      setHasScanned(true);
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="min-h-screen px-4 pt-24 pb-16 max-w-3xl mx-auto">
      <Nav />
      <BackLink href="/" label="Home" />

      <h1 className="text-3xl font-bold mb-2">Stealth Scanner</h1>
      <p className="text-neutral-400 mb-8">
        Find your private ticket purchases. Your wallet signature derives
        deterministic keys, and we check each stealth payment via ECDH to see
        if it belongs to you.
      </p>

      {!connected ? (
        <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm text-center">
          <p className="text-neutral-400 mb-4">
            Connect your wallet to scan for stealth payments.
          </p>
          <WalletButton />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stealth Keys */}
          <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Your Stealth Keys</h2>
            {!stealthMeta ? (
              <div>
                <p className="text-sm text-neutral-400 mb-3">
                  Sign a message to derive your stealth keypair. These keys are
                  deterministic — the same wallet always produces the same keys.
                </p>
                <button
                  onClick={handleGenerateKeys}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium transition-all text-sm border-2 border-purple-700 shadow-md hover:shadow-lg hover:scale-[1.02]"
                >
                  Derive Stealth Keys
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">
                    Scan Public Key (S)
                  </p>
                  <p className="text-xs font-mono text-neutral-300 break-all bg-neutral-950 border-2 border-neutral-800 p-2.5 rounded-lg">
                    {stealthMeta.scanPublicKey}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">
                    Spend Public Key (B)
                  </p>
                  <p className="text-xs font-mono text-neutral-300 break-all bg-neutral-950 border-2 border-neutral-800 p-2.5 rounded-lg">
                    {stealthMeta.spendPublicKey}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Scan */}
          <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Scan for Payments</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Fetches all stealth ticket purchases, then tries ECDH with each
              ephemeral key to find ones addressed to you.
            </p>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-medium transition-all text-sm border-2 border-purple-700 shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              {scanning ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Scanning...
                </span>
              ) : (
                "Scan Now"
              )}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="p-6 rounded-2xl border-2 border-green-800 bg-green-950/40 shadow-sm">
              <h2 className="text-lg font-semibold mb-3 text-green-400">
                Found {results.length} Stealth Ticket{results.length !== 1 ? "s" : ""}
              </h2>
              <div className="space-y-3">
                {results.map((r) => (
                  <div
                    key={r.ticketId}
                    className="p-4 rounded-xl bg-neutral-950 border-2 border-neutral-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">
                        {r.eventName || "Unknown Event"}
                      </p>
                      <Link
                        href={`/events/${r.eventId}`}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-purple-950/50 text-purple-400 border-2 border-purple-800 hover:bg-purple-900/40 transition-all hover:scale-105"
                      >
                        View Event
                      </Link>
                    </div>
                    <p className="text-xs font-mono text-neutral-400 break-all">
                      {r.stealthAddress}
                    </p>
                    {r.txSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${r.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-500 hover:text-purple-400 mt-1.5 inline-block transition-colors"
                      >
                        View on Solana Explorer
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasScanned && results.length === 0 && !scanning && (
            <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm text-center">
              <p className="text-neutral-500">
                No stealth tickets found for this wallet.
              </p>
              <p className="text-xs text-neutral-600 mt-2">
                Buy a ticket with &quot;Private purchase&quot; enabled, then scan again.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

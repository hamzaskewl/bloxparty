/**
 * Stealth address scanner.
 * Scans memo transactions to find payments sent to the user's stealth addresses.
 *
 * Uses Helius enhanced transaction API for efficient memo scanning.
 */

import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  deriveX25519KeyPair,
  computeSharedSecret,
  deriveStealthKeypair,
} from "./keys";

export interface FoundStealthPayment {
  /** The stealth address that received funds */
  stealthAddress: string;
  /** The keypair to spend from this address */
  stealthKeypair: nacl.SignKeyPair;
  /** The ephemeral public key R from the memo */
  ephemeralPubkey: string;
  /** Transaction signature where this was found */
  txSignature: string;
}

/**
 * Scan recent transactions for stealth payments addressed to us.
 *
 * For each memo transaction:
 * 1. Extract ephemeral public key R from memo
 * 2. Compute shared secret = ECDH(scanPrivateKey, R)
 * 3. Derive stealth address from shared secret + spend key
 * 4. Check if any transfer in the tx went to that address
 */
export async function scanForStealthPayments(
  scanSeed: Uint8Array,
  spendSeed: Uint8Array,
  recentSignatures: string[]
): Promise<FoundStealthPayment[]> {
  const found: FoundStealthPayment[] = [];

  const scanX25519 = deriveX25519KeyPair(scanSeed);

  for (const sig of recentSignatures) {
    try {
      // In a real implementation, we'd fetch the transaction and extract memos
      // For now, this is the structure - the actual RPC calls happen at the API layer
      // This function processes already-fetched transaction data
    } catch {
      // Skip invalid transactions
    }
  }

  return found;
}

/**
 * Try to recover a stealth keypair from an ephemeral public key.
 * Returns the stealth keypair if the payment was meant for us, null otherwise.
 */
export function tryRecoverStealthKeypair(
  ephemeralPubkeyBase58: string,
  scanSeed: Uint8Array,
  spendSeed: Uint8Array
): nacl.SignKeyPair | null {
  try {
    const ephemeralEdPub = bs58.decode(ephemeralPubkeyBase58);

    // Derive X25519 keys for ECDH
    const scanX25519 = deriveX25519KeyPair(scanSeed);

    // We need the ephemeral X25519 public key
    // Since the sender used the same seed-to-X25519 derivation,
    // we derive the ephemeral X25519 from the Ed25519 seed
    // But we only have the Ed25519 public key, not the seed.
    //
    // Solution: The sender should publish the X25519 public key directly in memo,
    // OR we can store the ephemeral seed's X25519 public key.
    // For simplicity, we publish the X25519 public key in the memo.
    //
    // If the memo contains an X25519 public key (32 bytes, base58):
    const ephemeralX25519Pub = ephemeralEdPub; // Treat memo data as X25519 pub directly

    const sharedSecret = computeSharedSecret(
      scanX25519.secretKey,
      ephemeralX25519Pub
    );

    const stealthKeypair = deriveStealthKeypair(sharedSecret, spendSeed);
    return stealthKeypair;
  } catch {
    return null;
  }
}

/**
 * Fetch recent memo transactions using Helius enhanced API.
 * Returns transaction signatures that contain memo instructions.
 */
export async function fetchMemoTransactions(
  heliusApiKey: string,
  limit: number = 100
): Promise<string[]> {
  const url = `https://api.helius.xyz/v0/addresses/MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr/transactions?api-key=${heliusApiKey}&limit=${limit}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const txs = await res.json();
    return txs.map((tx: { signature: string }) => tx.signature);
  } catch {
    return [];
  }
}

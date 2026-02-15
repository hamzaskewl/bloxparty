/**
 * Custom DKSAP (Dual-Key Stealth Address Protocol) for Solana.
 *
 * Based on Mert/Helius's approach:
 * 1. Recipient generates scan keypair (s, S) + spend keypair (b, B)
 * 2. Sender generates ephemeral keypair (r, R)
 * 3. Shared secret = ECDH(r, S) = ECDH(s, R)
 * 4. Stealth address = derive keypair from hash(shared_secret || b)
 * 5. Publish R in transaction memo as breadcrumb
 * 6. Recipient scans memos, tries ECDH with each R
 *
 * Uses tweetnacl for Ed25519/X25519 + bs58 for encoding.
 * ~100 lines of pure math, no external stealth libs.
 */

import nacl from "tweetnacl";
import bs58 from "bs58";

export interface StealthKeyPair {
  scanPrivateKey: Uint8Array; // s - for scanning memos
  scanPublicKey: Uint8Array; // S - shared publicly
  spendPrivateKey: Uint8Array; // b - for spending
  spendPublicKey: Uint8Array; // B - shared publicly
}

export interface StealthMeta {
  scanPublicKey: string; // base58-encoded S
  spendPublicKey: string; // base58-encoded B
}

/**
 * Generate stealth keypairs from a wallet signature.
 * The user signs a fixed message, and we derive deterministic keys from it.
 */
export function generateStealthKeys(signatureBytes: Uint8Array): StealthKeyPair {
  // Split the 64-byte signature into two 32-byte seeds
  const scanSeed = signatureBytes.slice(0, 32);
  const spendSeed = signatureBytes.slice(32, 64);

  const scanKeypair = nacl.sign.keyPair.fromSeed(scanSeed);
  const spendKeypair = nacl.sign.keyPair.fromSeed(spendSeed);

  return {
    scanPrivateKey: scanKeypair.secretKey,
    scanPublicKey: scanKeypair.publicKey,
    spendPrivateKey: spendKeypair.secretKey,
    spendPublicKey: spendKeypair.publicKey,
  };
}

/**
 * Encode stealth public keys for sharing / on-chain storage.
 */
export function encodeStealthMeta(keys: StealthKeyPair): StealthMeta {
  return {
    scanPublicKey: bs58.encode(keys.scanPublicKey),
    spendPublicKey: bs58.encode(keys.spendPublicKey),
  };
}

/**
 * Decode stealth public keys from base58.
 */
export function decodeStealthMeta(meta: StealthMeta): {
  scanPublicKey: Uint8Array;
  spendPublicKey: Uint8Array;
} {
  return {
    scanPublicKey: bs58.decode(meta.scanPublicKey),
    spendPublicKey: bs58.decode(meta.spendPublicKey),
  };
}

/**
 * Convert an Ed25519 public key to X25519 (Curve25519) for ECDH.
 * tweetnacl uses Ed25519 for signing but X25519 for key exchange.
 */
function ed25519ToX25519Public(edPub: Uint8Array): Uint8Array {
  // tweetnacl doesn't expose this directly, but nacl.box uses X25519
  // We use nacl.box.keyPair.fromSecretKey which expects X25519 secret key
  // For the public key conversion, we need the scalar multiplication
  // Actually, nacl.scalarMult.base does this for secret keys.
  // For public keys, we need a different approach.

  // tweetnacl's sign.keyPair gives Ed25519 keys.
  // The private key in tweetnacl sign is 64 bytes: seed(32) + public(32)
  // We can extract the scalar from the seed and use scalarMult.

  // However, the cleanest approach: we derive X25519 keypairs separately
  // from the same seed bytes.
  throw new Error("Use deriveSharedSecret instead");
}

/**
 * Derive a shared secret between an ephemeral keypair and a recipient's scan key.
 * Uses nacl.box (X25519 + XSalsa20-Poly1305) keypair derivation.
 *
 * We derive X25519 keys from the same seeds as our Ed25519 keys.
 */
export function deriveX25519KeyPair(ed25519Seed: Uint8Array): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  // Hash the seed to get a proper X25519 secret key
  const hash = nacl.hash(ed25519Seed).slice(0, 32);
  // Clamp for X25519
  hash[0] &= 248;
  hash[31] &= 127;
  hash[31] |= 64;

  const publicKey = nacl.scalarMult.base(hash);
  return { publicKey, secretKey: hash };
}

/**
 * Compute ECDH shared secret between two X25519 keys.
 */
export function computeSharedSecret(
  myX25519Secret: Uint8Array,
  theirX25519Public: Uint8Array
): Uint8Array {
  const raw = nacl.scalarMult(myX25519Secret, theirX25519Public);
  // Hash the raw shared secret for uniformity
  return nacl.hash(raw).slice(0, 32);
}

/**
 * Derive a one-time stealth keypair from the shared secret + spend key.
 */
export function deriveStealthKeypair(
  sharedSecret: Uint8Array,
  spendSeed: Uint8Array
): nacl.SignKeyPair {
  // Combine shared secret with spend seed to get deterministic stealth seed
  const combined = new Uint8Array(64);
  combined.set(sharedSecret, 0);
  combined.set(spendSeed, 32);
  const stealthSeed = nacl.hash(combined).slice(0, 32);

  return nacl.sign.keyPair.fromSeed(stealthSeed);
}

// Re-export for convenience
export { nacl, bs58 };

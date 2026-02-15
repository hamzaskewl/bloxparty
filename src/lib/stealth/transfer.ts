/**
 * Stealth transfer: send SOL/tokens to a one-time stealth address.
 * The ephemeral public key R is published in a memo instruction
 * so the recipient can scan for it later.
 */

import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  deriveX25519KeyPair,
  computeSharedSecret,
  deriveStealthKeypair,
} from "./keys";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export interface StealthTransferParams {
  /** Recipient's scan public key (Ed25519 seed for X25519 derivation) */
  recipientScanSeed: Uint8Array;
  /** Recipient's spend public key seed */
  recipientSpendSeed: Uint8Array;
  /** Amount in lamports */
  lamports: number;
  /** Sender's public key */
  senderPubkey: PublicKey;
}

export interface StealthTransferResult {
  /** The transaction to sign and send */
  transaction: Transaction;
  /** The one-time stealth address (base58) */
  stealthAddress: string;
  /** The ephemeral public key R (base58) - published in memo */
  ephemeralPubkey: string;
}

/**
 * Build a stealth transfer transaction.
 *
 * 1. Generate ephemeral keypair (r, R)
 * 2. Compute shared secret via ECDH
 * 3. Derive one-time stealth address
 * 4. Transfer SOL to stealth address
 * 5. Attach memo with ephemeral public key R
 */
export function buildStealthTransfer(
  params: StealthTransferParams
): StealthTransferResult {
  const { recipientScanSeed, recipientSpendSeed, lamports, senderPubkey } =
    params;

  // 1. Generate ephemeral keypair
  const ephemeralSeed = nacl.randomBytes(32);
  const ephemeralX25519 = deriveX25519KeyPair(ephemeralSeed);

  // 2. Derive recipient's X25519 scan key and compute shared secret
  const recipientScanX25519 = deriveX25519KeyPair(recipientScanSeed);
  const sharedSecret = computeSharedSecret(
    ephemeralX25519.secretKey,
    recipientScanX25519.publicKey
  );

  // 3. Derive one-time stealth keypair
  const stealthKeypair = deriveStealthKeypair(sharedSecret, recipientSpendSeed);
  const stealthPubkey = new PublicKey(stealthKeypair.publicKey);

  // 4. Build transaction: SOL transfer + memo
  const tx = new Transaction();

  // Transfer SOL to the stealth address
  tx.add(
    SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: stealthPubkey,
      lamports,
    })
  );

  // 5. Attach ephemeral public key R as memo breadcrumb
  // The recipient will scan memos for this R and try ECDH
  const ephemeralEdKeypair = nacl.sign.keyPair.fromSeed(ephemeralSeed);
  const memoData = bs58.encode(ephemeralEdKeypair.publicKey);

  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: senderPubkey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData),
    })
  );

  return {
    transaction: tx,
    stealthAddress: stealthPubkey.toBase58(),
    ephemeralPubkey: memoData,
  };
}

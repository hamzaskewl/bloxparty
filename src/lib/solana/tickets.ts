import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMintLen,
  ExtensionType,
  createInitializeMetadataPointerInstruction,
  TYPE_SIZE,
  LENGTH_SIZE,
} from "@solana/spl-token";
import {
  pack,
  createInitializeInstruction,
  createUpdateFieldInstruction,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { getConnection } from "./connection";

export interface TicketMetadata {
  eventName: string;
  eventDate: string;
  description: string;
  maxSupply: number;
}

/**
 * Build a transaction that creates a Token-2022 mint with metadata for an event ticket.
 * The caller (creator's wallet) signs and sends.
 */
export async function buildCreateTicketMintTx(
  payer: PublicKey,
  metadata: TicketMetadata
): Promise<{ transaction: Transaction; mintKeypair: Keypair }> {
  const connection = getConnection();
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const tokenMetadata: TokenMetadata = {
    mint,
    name: metadata.eventName,
    symbol: "TICKET",
    uri: "", // no external URI needed for hackathon
    updateAuthority: payer,
    additionalMetadata: [
      ["event_date", metadata.eventDate],
      ["description", metadata.description],
      ["max_supply", metadata.maxSupply.toString()],
    ],
  };

  const metadataLen = pack(tokenMetadata).length;
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const totalSpace =
    mintLen + TYPE_SIZE + LENGTH_SIZE + metadataLen;

  const lamports = await connection.getMinimumBalanceForRentExemption(
    totalSpace
  );

  const tx = new Transaction().add(
    // Create the account
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // Initialize metadata pointer (points to itself)
    createInitializeMetadataPointerInstruction(
      mint,
      payer,
      mint,
      TOKEN_2022_PROGRAM_ID
    ),
    // Initialize the mint (0 decimals = NFT-like)
    createInitializeMintInstruction(
      mint,
      0, // 0 decimals — each ticket is a whole token
      payer, // mint authority
      null, // no freeze authority
      TOKEN_2022_PROGRAM_ID
    ),
    // Initialize metadata on the mint
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint,
      metadata: mint,
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      uri: tokenMetadata.uri,
      mintAuthority: payer,
      updateAuthority: payer,
    })
  );

  // Add additional metadata fields
  for (const [key, value] of tokenMetadata.additionalMetadata) {
    tx.add(
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        updateAuthority: payer,
        field: key,
        value,
      })
    );
  }

  return { transaction: tx, mintKeypair };
}

/**
 * Build a transaction that mints a ticket token to a buyer.
 */
export async function buildMintTicketTx(
  mintAuthority: PublicKey,
  ticketMint: PublicKey,
  recipient: PublicKey
): Promise<Transaction> {
  const ata = await getAssociatedTokenAddress(
    ticketMint,
    recipient,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      mintAuthority,
      ata,
      recipient,
      ticketMint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
    createMintToInstruction(
      ticketMint,
      ata,
      mintAuthority,
      1, // mint 1 ticket
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  return tx;
}

/**
 * Check if a wallet holds a specific ticket token.
 */
export async function holdsTicket(
  wallet: PublicKey,
  ticketMint: PublicKey
): Promise<boolean> {
  const connection = getConnection();
  try {
    const ata = await getAssociatedTokenAddress(
      ticketMint,
      wallet,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const account = await connection.getTokenAccountBalance(ata);
    return Number(account.value.amount) > 0;
  } catch {
    return false;
  }
}


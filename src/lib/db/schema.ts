import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  maxTickets: integer("max_tickets").notNull().default(100),
  ticketsSold: integer("tickets_sold").notNull().default(0),
  ticketPrice: integer("ticket_price_lamports").notNull(), // in lamports
  ticketMint: text("ticket_mint"), // SPL token mint address
  creatorWallet: text("creator_wallet").notNull(),
  mcServerIp: text("mc_server_ip"),
  audiusPlaylistId: text("audius_playlist_id"),
  twitchChannel: text("twitch_channel"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  buyerWallet: text("buyer_wallet").notNull(),
  tokenAccount: text("token_account"), // SPL token account address
  txSignature: text("tx_signature"),
  isStealth: boolean("is_stealth").notNull().default(false),
  stealthAddress: text("stealth_address"),
  mcUsername: text("mc_username"),
  isWhitelisted: boolean("is_whitelisted").notNull().default(false),
  isRedeemed: boolean("is_redeemed").notNull().default(false),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export const playerWallets = pgTable("player_wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  mcUsername: text("mc_username").notNull().unique(),
  walletAddress: text("wallet_address").notNull(),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type PlayerWallet = typeof playerWallets.$inferSelect;

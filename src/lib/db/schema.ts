import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  creatorWallet: text("creator_wallet"),
  audiusUserId: text("audius_user_id"),
  audiusPlaylistId: text("audius_playlist_id"),
  spotifyPlaylistUrl: text("spotify_playlist_url"),
  twitchChannel: text("twitch_channel"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const robloxWhitelist = pgTable("roblox_whitelist", {
  id: uuid("id").defaultRandom().primaryKey(),
  robloxUserId: text("roblox_user_id").notNull().unique(),
  discordUserId: text("discord_user_id"),
  walletAddress: text("wallet_address"),
  isVerified: boolean("is_verified").notNull().default(true),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type RobloxWhitelistEntry = typeof robloxWhitelist.$inferSelect;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, playerWallets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { whitelistAdd } from "@/lib/minecraft/bridge";

export async function POST(req: NextRequest) {
  try {
    const { eventId, walletAddress, mcUsername } = await req.json();

    if (!eventId || !walletAddress || !mcUsername) {
      return NextResponse.json(
        { error: "Missing eventId, walletAddress, or mcUsername" },
        { status: 400 }
      );
    }

    // Check that the user has a ticket for this event
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.eventId, eventId),
          eq(tickets.buyerWallet, walletAddress)
        )
      );

    if (!ticket) {
      return NextResponse.json(
        { error: "No ticket found for this wallet and event" },
        { status: 403 }
      );
    }

    // Save the MC username link
    await db
      .insert(playerWallets)
      .values({
        mcUsername,
        walletAddress,
      })
      .onConflictDoUpdate({
        target: playerWallets.mcUsername,
        set: { walletAddress },
      });

    // Update the ticket with the MC username
    await db
      .update(tickets)
      .set({ mcUsername, isWhitelisted: true })
      .where(eq(tickets.id, ticket.id));

    // Whitelist on the MC server
    try {
      await whitelistAdd(mcUsername);
    } catch (err) {
      // MC server might be offline — still save the whitelist request
      console.warn("MC server unreachable, whitelist saved for later:", err);
    }

    return NextResponse.json({
      success: true,
      message: `${mcUsername} has been whitelisted`,
    });
  } catch (err) {
    console.error("Whitelist error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

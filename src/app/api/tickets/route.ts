import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, tickets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      date,
      maxTickets,
      ticketPriceLamports,
      creatorWallet,
      mcServerIp,
      twitchChannel,
      audiusPlaylistId,
    } = body;

    if (!name || !date || !ticketPriceLamports || !creatorWallet) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [event] = await db
      .insert(events)
      .values({
        name,
        description: description || null,
        date: new Date(date),
        maxTickets: maxTickets || 100,
        ticketPrice: ticketPriceLamports,
        creatorWallet,
        mcServerIp: mcServerIp || null,
        twitchChannel: twitchChannel || null,
        audiusPlaylistId: audiusPlaylistId || null,
      })
      .returning();

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("Failed to create event:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { eventId, buyerWallet, txSignature } = await req.json();

    if (!eventId || !buyerWallet || !txSignature) {
      return NextResponse.json(
        { error: "Missing eventId, buyerWallet, or txSignature" },
        { status: 400 }
      );
    }

    // Check the event exists and has tickets remaining
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.ticketsSold >= event.maxTickets) {
      return NextResponse.json(
        { error: "Event is sold out" },
        { status: 409 }
      );
    }

    // Record the ticket purchase
    const [ticket] = await db
      .insert(tickets)
      .values({
        eventId,
        buyerWallet,
        txSignature,
      })
      .returning();

    // Increment ticketsSold
    await db
      .update(events)
      .set({ ticketsSold: sql`${events.ticketsSold} + 1` })
      .where(eq(events.id, eventId));

    // Announce on Twitch if the event has a channel configured
    const twitchChannel = event.twitchChannel || process.env.TWITCH_CHANNEL;
    if (twitchChannel) {
      try {
        const { announceTicketPurchase } = await import("@/lib/twitch/bot");
        const remaining = event.maxTickets - event.ticketsSold - 1;
        await announceTicketPurchase(twitchChannel, remaining);
      } catch {
        // Twitch bot might not be connected — non-critical
      }
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("Failed to record ticket purchase:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get("id");

    if (eventId) {
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!event) {
        return NextResponse.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(event);
    }

    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.isActive, true))
      .orderBy(events.createdAt);

    return NextResponse.json(allEvents);
  } catch (err) {
    console.error("Failed to fetch events:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

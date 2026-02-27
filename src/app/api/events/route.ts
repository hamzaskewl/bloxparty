import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      date,
      creatorWallet,
      audiusUserId,
      audiusPlaylistId,
      spotifyPlaylistUrl,
    } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: "Missing required fields: name, date" },
        { status: 400 }
      );
    }

    const [event] = await db
      .insert(events)
      .values({
        name,
        description: description || null,
        date: new Date(date),
        creatorWallet: creatorWallet || null,
        audiusUserId: audiusUserId || null,
        audiusPlaylistId: audiusPlaylistId || null,
        spotifyPlaylistUrl: spotifyPlaylistUrl || null,
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

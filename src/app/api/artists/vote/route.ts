import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistVotes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { audiusUserId, voterWallet } = await req.json();

    if (!audiusUserId) {
      return NextResponse.json(
        { error: "Missing audiusUserId" },
        { status: 400 }
      );
    }

    const [vote] = await db
      .insert(artistVotes)
      .values({
        audiusUserId,
        voterWallet: voterWallet || null,
      })
      .returning();

    return NextResponse.json({ success: true, vote }, { status: 201 });
  } catch (err) {
    console.error("Failed to record vote:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const audiusUserId = req.nextUrl.searchParams.get("audiusUserId");

    if (audiusUserId) {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(artistVotes)
        .where(eq(artistVotes.audiusUserId, audiusUserId));

      return NextResponse.json({ audiusUserId, votes: result?.count || 0 });
    }

    // All vote counts grouped
    const results = await db
      .select({
        audiusUserId: artistVotes.audiusUserId,
        votes: sql<number>`count(*)::int`,
      })
      .from(artistVotes)
      .groupBy(artistVotes.audiusUserId)
      .orderBy(sql`count(*) desc`);

    return NextResponse.json(results);
  } catch (err) {
    console.error("Failed to fetch votes:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

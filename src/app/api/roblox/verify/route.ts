import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { robloxWhitelist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const robloxUserId = req.nextUrl.searchParams.get("robloxUserId");

    if (!robloxUserId) {
      return NextResponse.json(
        { error: "Missing robloxUserId parameter" },
        { status: 400 }
      );
    }

    const [entry] = await db
      .select()
      .from(robloxWhitelist)
      .where(eq(robloxWhitelist.robloxUserId, robloxUserId));

    return NextResponse.json({
      verified: !!entry && entry.isVerified,
    });
  } catch (err) {
    console.error("Roblox verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

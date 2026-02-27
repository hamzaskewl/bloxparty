import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { robloxWhitelist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { robloxUserId, discordUserId, walletAddress } = await req.json();

    if (!robloxUserId) {
      return NextResponse.json(
        { error: "Missing robloxUserId" },
        { status: 400 }
      );
    }

    const [entry] = await db
      .insert(robloxWhitelist)
      .values({
        robloxUserId,
        discordUserId: discordUserId || null,
        walletAddress: walletAddress || null,
      })
      .onConflictDoUpdate({
        target: robloxWhitelist.robloxUserId,
        set: {
          discordUserId: discordUserId || undefined,
          walletAddress: walletAddress || undefined,
          isVerified: true,
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `${robloxUserId} has been whitelisted`,
      entry,
    });
  } catch (err) {
    console.error("Roblox whitelist error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { discordUserId } = await req.json();
    if (!discordUserId) {
      return NextResponse.json({ error: "Missing discordUserId" }, { status: 400 });
    }
    const deleted = await db
      .delete(robloxWhitelist)
      .where(eq(robloxWhitelist.discordUserId, discordUserId))
      .returning();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "No linked account found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Unlinked" });
  } catch (err) {
    console.error("Roblox unlink error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

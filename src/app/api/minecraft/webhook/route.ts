import { NextRequest, NextResponse } from "next/server";

/**
 * ServerTap webhook handler.
 * ServerTap can be configured to POST events (player join/leave, chat, etc.)
 * to this endpoint. We use it to push updates to Twitch chat.
 */
export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    // ServerTap webhook events have a "type" field
    const { type, playerName } = event;

    switch (type) {
      case "PlayerJoin": {
        // Dynamically import to avoid loading twitch bot on every request
        const { announcePlayerJoin } = await import("@/lib/twitch/bot");
        const channel = process.env.TWITCH_CHANNEL;
        if (channel && playerName) {
          try {
            await announcePlayerJoin(channel, playerName);
          } catch {
            // Twitch bot might not be connected
          }
        }
        break;
      }

      case "PlayerQuit": {
        // Could announce departures too, but skip for now
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

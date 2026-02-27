import { NextRequest, NextResponse } from "next/server";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet parameter" },
        { status: 400 }
      );
    }

    // Look up Audius user by associated Solana wallet
    const idRes = await fetch(
      `${AUDIUS_HOST}/v1/users/id?associated_wallet=${wallet}&app_name=bloxparty`
    );

    if (!idRes.ok) {
      return NextResponse.json({ user: null });
    }

    const idData = await idRes.json();
    const userId = idData?.data;

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    // Fetch full user profile
    const userRes = await fetch(
      `${AUDIUS_HOST}/v1/users/${userId}?app_name=bloxparty`
    );

    if (!userRes.ok) {
      return NextResponse.json({ user: null });
    }

    const userData = await userRes.json();

    return NextResponse.json({ user: userData.data || null });
  } catch (err) {
    console.error("Audius user lookup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

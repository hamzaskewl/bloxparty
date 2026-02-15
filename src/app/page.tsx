"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <nav className="fixed top-0 w-full flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm z-50">
        <span className="text-xl font-bold tracking-tight">deadathon</span>
        <WalletMultiButton />
      </nav>

      <div className="max-w-3xl text-center mt-24">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Dead Experiences.
          <br />
          <span className="text-purple-400">Resurrected.</span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto">
          Buy tickets on Solana. Join events in Minecraft. Hear real music from
          Audius. Stream it all on Twitch. Virtual creator experiences,
          brought back to life.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/events"
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
          >
            Browse Events
          </Link>
          <Link
            href="/events?create=true"
            className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-medium transition-colors border border-neutral-700"
          >
            Create Event
          </Link>
          <Link
            href="/music"
            className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-medium transition-colors border border-neutral-700"
          >
            Music
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-24 max-w-3xl w-full px-4">
        <h2 className="text-2xl font-bold text-center mb-8">How it Works</h2>
        <div className="space-y-4">
          {[
            ["1", "Creator sets up an event", "Concert, art show, game night — any virtual experience."],
            ["2", "Fans buy tickets with SOL", "SPL Token-2022 tickets live on Solana devnet. Optional stealth mode for privacy."],
            ["3", "Link your Minecraft username", "Backend whitelists you on the Paper MC server via ServerTap."],
            ["4", "Join the Minecraft venue", "Walk around, hear real Audius music at the concert stage via OpenAudioMC."],
            ["5", "Twitch bot keeps chat hyped", "Ticket sales and player joins are announced in real time."],
          ].map(([num, title, desc]) => (
            <div key={num} className="flex gap-4 items-start p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
              <span className="text-2xl font-bold text-purple-400 w-8 flex-shrink-0">{num}</span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-neutral-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 max-w-5xl w-full px-4 pb-16">
        <FeatureCard
          title="Solana Tickets"
          description="SPL Token-2022 tickets with on-chain metadata. Optional stealth purchases for privacy."
        />
        <FeatureCard
          title="Minecraft Venues"
          description="Token-gated Minecraft servers. Buy a ticket, get whitelisted, join the world."
        />
        <FeatureCard
          title="Audius Music"
          description="Real music from Audius streaming inside Minecraft via OpenAudioMC."
        />
        <FeatureCard
          title="Twitch Integration"
          description="Chat bot announces ticket sales and player joins. Commands for event info."
        />
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-400">{description}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />

      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 text-xs font-semibold bg-purple-950/50 text-purple-300 border-2 border-purple-800 rounded-full shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Solana Graveyard Hack
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Dead Experiences.
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%] animate-[shimmer_3s_ease-in-out_infinite]">
              Resurrected.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Token-gated creator experiences on Roblox. Powered by Audius and
            Solana. Discover concerts, verify with Discord, and join the
            experience live.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-purple-500/30 border-2 border-purple-700"
            >
              Browse Events
            </Link>
            <Link
              href="/events?create=true"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-neutral-900 border-2 border-neutral-700 text-white font-semibold text-lg transition-all hover:border-pink-500/50 hover:bg-neutral-800"
            >
              Create Event
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="px-4 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-3 block">
            How it works
          </span>
          <h2 className="text-3xl font-bold">Three Steps to Live</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-24">
          <StepCard
            step="1"
            title="Discover"
            desc="Browse upcoming concerts and creator events. Listen to playlists, explore artist profiles."
            gradient="from-purple-500/20 to-transparent"
          />
          <StepCard
            step="2"
            title="Verify"
            desc="Join our Discord. Collab.Land verifies your token holdings and grants access."
            gradient="from-pink-500/20 to-transparent"
          />
          <StepCard
            step="3"
            title="Experience"
            desc="Jump into Roblox and experience the concert live with curated music and the community."
            gradient="from-blue-500/20 to-transparent"
          />
        </div>

        {/* Feature cards */}
        <div className="text-center mb-10">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-3 block">
            Features
          </span>
          <h2 className="text-3xl font-bold">What We Built</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
          <FeatureCard
            title="Token-Gated Access"
            description="Hold creator tokens to unlock exclusive experiences. Verified via Discord + Collab.Land."
            tag="Core"
            icon={<ShieldIcon />}
          />
          <FeatureCard
            title="Audius Integration"
            description="Artist profiles, creator coins, supporter rankings, curated playlists. Deep Audius integration."
            tag="Music"
            icon={<MusicIcon />}
          />
          <FeatureCard
            title="Roblox Experiences"
            description="Immersive concert venues on Roblox. Pre-uploaded curated audio, community events."
            tag="Experience"
            icon={<CubeIcon />}
          />
          <FeatureCard
            title="Discord Community"
            description="One Discord server for all events. Token-gated roles, Roblox username linking, live chat."
            tag="Social"
            icon={<ChatIcon />}
          />
        </div>

        {/* Tech stack */}
        <div className="text-center mb-20">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-6">
            Built with
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "Solana",
              "Phantom",
              "Audius",
              "Roblox",
              "Discord",
              "Collab.Land",
              "Spotify",
              "Twitch",
              "Next.js",
              "Railway",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 text-xs font-semibold bg-neutral-900 text-neutral-400 border-2 border-neutral-800 rounded-full hover:border-purple-500/30 hover:text-neutral-300 transition-all cursor-default"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="inline-flex flex-col sm:flex-row gap-3">
            <Link
              href="/music"
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl font-medium transition-all border-2 border-neutral-700 hover:border-purple-500/40"
            >
              Browse Music
            </Link>
            <Link
              href="/events"
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl font-medium transition-all border-2 border-neutral-700 hover:border-purple-500/40"
            >
              View Events
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function StepCard({
  step,
  title,
  desc,
  gradient,
}: {
  step: string;
  title: string;
  desc: string;
  gradient: string;
}) {
  return (
    <div className="group relative p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border-2 border-purple-800 text-purple-400 text-sm font-bold flex items-center justify-center mb-4">
          {step}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  tag,
  icon,
}: {
  title: string;
  description: string;
  tag: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border-2 border-purple-800 flex items-center justify-center flex-shrink-0 text-purple-400">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold">{title}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border-2 border-purple-800 font-semibold">
              {tag}
            </span>
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

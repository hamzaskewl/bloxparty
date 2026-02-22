"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/lib/db/schema";
import { Nav, BackLink } from "@/components/Nav";

const AUDIUS_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

const DISCORD_INVITE =
  process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/deadathon";

const ROBLOX_PLACE_ID =
  process.env.NEXT_PUBLIC_ROBLOX_PLACE_ID || "";

interface AudiusArtistProfile {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  profile_picture: { "150x150"?: string; "480x480"?: string } | null;
  follower_count: number;
  track_count: number;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Artist profile from Audius
  const [artist, setArtist] = useState<AudiusArtistProfile | null>(null);

  // Audius playlist
  const [playlistTracks, setPlaylistTracks] = useState<
    { id: string; title: string; user: { name: string }; duration?: number }[]
  >([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);

        // Fetch Audius artist profile
        if (data.audiusUserId) {
          try {
            const artistRes = await fetch(
              `${AUDIUS_HOST}/v1/users/${data.audiusUserId}?app_name=deadathon`
            );
            if (artistRes.ok) {
              const artistData = await artistRes.json();
              setArtist(artistData.data || null);
            }
          } catch {
            // Non-critical
          }
        }

        // Fetch Audius playlist tracks
        if (data.audiusPlaylistId) {
          try {
            const playlistRes = await fetch(
              `${AUDIUS_HOST}/v1/playlists/${data.audiusPlaylistId}/tracks?app_name=deadathon`
            );
            if (playlistRes.ok) {
              const playlistData = await playlistRes.json();
              setPlaylistTracks(playlistData.data || []);
            }
          } catch {
            // Non-critical
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch event:", err);
    } finally {
      setLoading(false);
    }
  }

  function togglePlay(trackId: string) {
    if (playingTrackId === trackId && activeAudio) {
      activeAudio.pause();
      setPlayingTrackId(null);
      setActiveAudio(null);
      return;
    }
    if (activeAudio) activeAudio.pause();

    const audio = new Audio(
      `${AUDIUS_HOST}/v1/tracks/${trackId}/stream?app_name=deadathon`
    );
    audio.play();
    audio.onended = () => {
      setPlayingTrackId(null);
      setActiveAudio(null);
    };
    setPlayingTrackId(trackId);
    setActiveAudio(audio);
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <p className="text-neutral-400">Loading event...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">Event not found.</p>
        <Link
          href="/events"
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Browse events
        </Link>
      </main>
    );
  }

  // Extract Spotify embed URL if present
  const spotifyEmbedUrl = event.spotifyPlaylistUrl
    ? event.spotifyPlaylistUrl.replace("open.spotify.com/", "open.spotify.com/embed/")
    : null;

  return (
    <main className="min-h-screen px-4 pt-24 pb-16 max-w-3xl mx-auto">
      <Nav />
      <BackLink href="/events" label="Events" />

      {/* Header */}
      <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
      {event.description && (
        <p className="text-neutral-400 mb-2 text-lg">{event.description}</p>
      )}
      <p className="text-sm text-neutral-500 mb-6">
        {new Date(event.date).toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      {/* Artist Card */}
      {artist && (
        <div className="p-5 rounded-2xl border-2 border-purple-800 bg-purple-950/30 shadow-sm mb-6 flex items-center gap-4">
          {artist.profile_picture?.["150x150"] ? (
            <img
              src={artist.profile_picture["150x150"]}
              alt={artist.name}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-purple-900 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-400 text-xl font-bold">
                {artist.name[0]}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lg">{artist.name}</p>
            <p className="text-sm text-purple-300">@{artist.handle}</p>
            <div className="flex gap-4 mt-1">
              <span className="text-xs text-neutral-400">
                {artist.follower_count.toLocaleString()} followers
              </span>
              <span className="text-xs text-neutral-400">
                {artist.track_count} tracks
              </span>
            </div>
          </div>
          <a
            href={`https://audius.co/${artist.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium transition-all border-2 border-purple-700 flex-shrink-0"
          >
            Audius
          </a>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-xl border-2 border-indigo-800 bg-indigo-950/30 shadow-sm hover:border-indigo-600 transition-all group"
        >
          <p className="text-xs text-neutral-500 mb-1">Discord</p>
          <p className="text-sm font-medium text-indigo-300 group-hover:text-indigo-200 transition-colors">
            Join our server
          </p>
        </a>
        {ROBLOX_PLACE_ID && (
          <a
            href={`https://www.roblox.com/games/${ROBLOX_PLACE_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border-2 border-green-800 bg-green-950/30 shadow-sm hover:border-green-600 transition-all group"
          >
            <p className="text-xs text-neutral-500 mb-1">Roblox</p>
            <p className="text-sm font-medium text-green-300 group-hover:text-green-200 transition-colors">
              Join experience
            </p>
          </a>
        )}
        {event.twitchChannel && (
          <a
            href={`https://twitch.tv/${event.twitchChannel}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border-2 border-purple-800 bg-purple-950/30 shadow-sm hover:border-purple-600 transition-all group"
          >
            <p className="text-xs text-neutral-500 mb-1">Twitch</p>
            <p className="text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
              twitch.tv/{event.twitchChannel}
            </p>
          </a>
        )}
      </div>

      {/* How to Join */}
      <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm mb-6">
        <h2 className="font-semibold text-lg mb-4">How to Join</h2>
        <div className="space-y-4">
          <StepItem
            number={1}
            title="Hold the required creator token"
            description="Make sure your Solana wallet holds the creator's token (Audius creator coin, SPL token, or NFT)."
          />
          <StepItem
            number={2}
            title="Join our Discord"
            description="Collab.Land verifies your token holdings and assigns you a role."
            action={
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-all border border-indigo-700"
              >
                Join Discord
              </a>
            }
          />
          <StepItem
            number={3}
            title="Submit your Roblox username"
            description="Use the bot or channel in Discord to submit your Roblox username for whitelisting."
          />
          <StepItem
            number={4}
            title="Join the Roblox experience"
            description="Once whitelisted, join the Roblox experience and enjoy the concert."
            action={
              ROBLOX_PLACE_ID ? (
                <a
                  href={`https://www.roblox.com/games/${ROBLOX_PLACE_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-all border border-green-700"
                >
                  Open Roblox
                </a>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Audius Playlist */}
      {playlistTracks.length > 0 && (
        <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm mb-6">
          <h2 className="font-semibold mb-1">Event Playlist</h2>
          <p className="text-xs text-neutral-500 mb-3">
            Powered by Audius
          </p>
          <div className="space-y-1">
            {playlistTracks.map((track, i) => (
              <div
                key={track.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  playingTrackId === track.id
                    ? "bg-purple-950/40 border-2 border-purple-800"
                    : "hover:bg-neutral-800 border-2 border-transparent"
                }`}
              >
                <span className="text-xs text-neutral-600 w-5 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {track.user.name}
                  </p>
                </div>
                {track.duration && (
                  <span className="text-xs text-neutral-600 flex-shrink-0">
                    {formatDuration(track.duration)}
                  </span>
                )}
                <button
                  onClick={() => togglePlay(track.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                    playingTrackId === track.id
                      ? "bg-purple-600 text-white"
                      : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                  }`}
                >
                  {playingTrackId === track.id ? "Stop" : "Play"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spotify Embed */}
      {spotifyEmbedUrl && (
        <div className="p-6 rounded-2xl border-2 border-neutral-800 bg-neutral-900 shadow-sm mb-6">
          <h2 className="font-semibold mb-3">Spotify Playlist</h2>
          <iframe
            src={spotifyEmbedUrl}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
        </div>
      )}
    </main>
  );
}

function StepItem({
  number,
  title,
  description,
  action,
}: {
  number: number;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-neutral-400 mt-0.5 mb-2">{description}</p>
        {action}
      </div>
    </div>
  );
}

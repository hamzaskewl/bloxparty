const API_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

const APP_NAME = "deadathon";

export interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  artwork: {
    "150x150"?: string;
    "480x480"?: string;
    "1000x1000"?: string;
  } | null;
  user: {
    id: string;
    name: string;
    handle: string;
  };
  stream_url?: string;
}

export interface AudiusUser {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  profile_picture: {
    "150x150"?: string;
    "480x480"?: string;
    "1000x1000"?: string;
  } | null;
  follower_count: number;
  track_count: number;
}

async function audiusFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`/v1${path}`, API_HOST);
  url.searchParams.set("app_name", APP_NAME);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Audius API error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data;
}

/** Search tracks by query */
export async function searchTracks(
  query: string,
  limit = 20
): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>("/tracks/search", {
    query,
    limit: limit.toString(),
  });
}

/** Get trending tracks */
export async function getTrendingTracks(
  limit = 20
): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>("/tracks/trending", {
    limit: limit.toString(),
  });
}

/** Get a single track by ID */
export async function getTrack(trackId: string): Promise<AudiusTrack> {
  return audiusFetch<AudiusTrack>(`/tracks/${trackId}`);
}

/** Get stream URL for a track */
export function getStreamUrl(trackId: string): string {
  return `${API_HOST}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}

/** Get a user/artist by ID */
export async function getUser(userId: string): Promise<AudiusUser> {
  return audiusFetch<AudiusUser>(`/users/${userId}`);
}

/** Get tracks by a specific user */
export async function getUserTracks(
  userId: string,
  limit = 20
): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>(`/users/${userId}/tracks`, {
    limit: limit.toString(),
  });
}

/** Get playlist tracks */
export async function getPlaylistTracks(
  playlistId: string
): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>(`/playlists/${playlistId}/tracks`);
}

/** Resolve an Audius URL to get the resource */
export async function resolveUrl(url: string): Promise<AudiusTrack | AudiusUser> {
  return audiusFetch<AudiusTrack | AudiusUser>("/resolve", { url });
}

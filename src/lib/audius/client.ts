const API_HOST =
  process.env.NEXT_PUBLIC_AUDIUS_API_HOST ||
  "https://discoveryprovider.audius.co";

const APP_NAME = "bloxparty";

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
  supporter_count?: number;
  supporting_count?: number;
}

export interface Supporter {
  rank: number;
  amount: string;
  sender: {
    id: string;
    name: string;
    handle: string;
  };
}

export interface Coin {
  mint: string;
  ticker: string;
  name: string;
  owner_id: string;
  logo_uri?: string;
  price: number;
  marketCap?: number;
  market_cap?: number;
  holder?: number;
  holder_count?: number;
  v24hUSD?: number;
  volume_24h?: number;
  priceChange24hPercent?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  trade24h?: number;
  buy24h?: number;
  sell24h?: number;
}

export interface CoinMember {
  user_id: string;
  name: string;
  handle: string;
  balance: string;
}

export interface CoinInsights {
  mint: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  holder_count: number;
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

// --- Tracks ---

export async function searchTracks(query: string, limit = 20): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>("/tracks/search", { query, limit: limit.toString() });
}

export async function getTrendingTracks(limit = 20): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>("/tracks/trending", { limit: limit.toString() });
}

export async function getTrack(trackId: string): Promise<AudiusTrack> {
  return audiusFetch<AudiusTrack>(`/tracks/${trackId}`);
}

export function getStreamUrl(trackId: string): string {
  return `${API_HOST}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}

// --- Users ---

export async function getUser(userId: string): Promise<AudiusUser> {
  return audiusFetch<AudiusUser>(`/users/${userId}`);
}

export async function getUserTracks(userId: string, limit = 20): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>(`/users/${userId}/tracks`, { limit: limit.toString() });
}

/** Look up Audius user by connected Solana wallet */
export async function getUserByWallet(walletAddress: string): Promise<AudiusUser | null> {
  try {
    const userId = await audiusFetch<string>("/users/id", { associated_wallet: walletAddress });
    if (!userId) return null;
    return getUser(userId);
  } catch {
    return null;
  }
}

/** Get connected wallets (ERC + SPL) for a user */
export async function getConnectedWallets(userId: string): Promise<{ sol: string[]; erc: string[] }> {
  try {
    const data = await audiusFetch<{ erc_wallets: string[]; spl_wallets: string[] }>(
      `/users/${userId}/connected_wallets`
    );
    return { sol: data.spl_wallets || [], erc: data.erc_wallets || [] };
  } catch {
    return { sol: [], erc: [] };
  }
}

/** Get user's supporters (top fans) */
export async function getSupporters(userId: string, limit = 10): Promise<Supporter[]> {
  try {
    return await audiusFetch<Supporter[]>(`/users/${userId}/supporters`, { limit: limit.toString() });
  } catch {
    return [];
  }
}

/** Search for Audius users by name */
export async function searchUsers(query: string, limit = 10): Promise<AudiusUser[]> {
  try {
    return await audiusFetch<AudiusUser[]>("/users/search", { query, limit: limit.toString() });
  } catch {
    return [];
  }
}

// --- Playlists ---

export async function getPlaylistTracks(playlistId: string): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>(`/playlists/${playlistId}/tracks`);
}

export async function resolveUrl(url: string): Promise<AudiusTrack | AudiusUser> {
  return audiusFetch<AudiusTrack | AudiusUser>("/resolve", { url });
}

// --- Creator Coins (docs.audius.org/developers/api) ---

export async function getCoins(params?: { sort?: string; limit?: number }): Promise<Coin[]> {
  try {
    const p: Record<string, string> = {};
    if (params?.sort) p.sort = params.sort;
    if (params?.limit) p.limit = params.limit.toString();
    return await audiusFetch<Coin[]>("/coins", p);
  } catch {
    return [];
  }
}

export async function getCoinByMint(mint: string): Promise<Coin | null> {
  try {
    return await audiusFetch<Coin>(`/coins/${mint}`);
  } catch {
    return null;
  }
}

export async function getCoinMembers(mint: string): Promise<CoinMember[]> {
  try {
    return await audiusFetch<CoinMember[]>(`/coins/${mint}/members`);
  } catch {
    return [];
  }
}

export async function getCoinInsights(mint: string): Promise<CoinInsights | null> {
  try {
    return await audiusFetch<CoinInsights>(`/coins/${mint}/insights`);
  } catch {
    return null;
  }
}

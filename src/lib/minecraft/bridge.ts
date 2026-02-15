/**
 * ServerTap REST client for managing the Minecraft server.
 * ServerTap runs as a Paper MC plugin and exposes a REST API.
 * Docs: https://github.com/phybros/servertap
 */

const SERVERTAP_URL = process.env.MC_SERVERTAP_URL || "http://localhost:4567";
const SERVERTAP_KEY = process.env.MC_SERVERTAP_KEY || "";

interface ServerTapPlayer {
  uuid: string;
  displayName: string;
  address: string;
  port: number;
  exhaustion: number;
  exp: number;
}

interface ServerInfo {
  name: string;
  version: string;
  maxPlayers: number;
  onlinePlayers: number;
}

async function serverTapFetch<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SERVERTAP_KEY) {
    headers["key"] = SERVERTAP_KEY;
  }

  const res = await fetch(`${SERVERTAP_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ServerTap error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Execute a console command on the MC server */
export async function executeCommand(command: string): Promise<string> {
  const result = await serverTapFetch<{ response: string }>(
    "/v1/server/exec",
    "POST",
    { command }
  );
  return result.response;
}

/** Add a player to the whitelist */
export async function whitelistAdd(username: string): Promise<string> {
  return executeCommand(`whitelist add ${username}`);
}

/** Remove a player from the whitelist */
export async function whitelistRemove(username: string): Promise<string> {
  return executeCommand(`whitelist remove ${username}`);
}

/** Get list of online players */
export async function getOnlinePlayers(): Promise<ServerTapPlayer[]> {
  return serverTapFetch<ServerTapPlayer[]>("/v1/players");
}

/** Get server info */
export async function getServerInfo(): Promise<ServerInfo> {
  return serverTapFetch<ServerInfo>("/v1/server");
}

/** Send a message to all players */
export async function broadcast(message: string): Promise<string> {
  return executeCommand(`say ${message}`);
}

/** Check if the MC server is reachable */
export async function isServerOnline(): Promise<boolean> {
  try {
    await getServerInfo();
    return true;
  } catch {
    return false;
  }
}

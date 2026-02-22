import tmi from "tmi.js";

let client: tmi.Client | null = null;

export interface TwitchBotConfig {
  token: string;
  channel: string;
  onMessage?: (channel: string, user: string, message: string) => void;
}

/** Initialize and connect the Twitch chat bot */
export async function initBot(config: TwitchBotConfig): Promise<tmi.Client> {
  if (client) return client;

  client = new tmi.Client({
    options: { debug: false },
    identity: {
      username: "deadathon_bot",
      password: `oauth:${config.token}`,
    },
    channels: [config.channel],
  });

  client.on("message", (_channel, tags, message, self) => {
    if (self) return; // ignore own messages

    const username = tags["display-name"] || tags.username || "anon";

    if (message.startsWith("!")) {
      handleCommand(
        _channel,
        username,
        message.trim().toLowerCase()
      );
    }

    config.onMessage?.(_channel, username, message);
  });

  await client.connect();
  return client;
}

/** Send a message to the configured channel */
export async function sendMessage(
  channel: string,
  message: string
): Promise<void> {
  if (!client) throw new Error("Twitch bot not initialized");
  await client.say(channel, message);
}

/** Announce a new event going live */
export async function announceEventLive(
  channel: string,
  eventName: string
): Promise<void> {
  await sendMessage(
    channel,
    `${eventName} is now live! Join the Roblox experience and vibe with us.`
  );
}

/** Announce a player joining the Roblox experience */
export async function announcePlayerJoin(
  channel: string,
  playerName: string
): Promise<void> {
  await sendMessage(
    channel,
    `${playerName} just joined the experience!`
  );
}

/** Handle chat commands */
async function handleCommand(
  channel: string,
  _username: string,
  message: string
): Promise<void> {
  const [cmd] = message.split(" ");

  switch (cmd) {
    case "!event":
      await sendMessage(
        channel,
        "Check out the current event at our web app! Link in channel description."
      );
      break;

    case "!discord":
      await sendMessage(
        channel,
        "Join our Discord to get verified and access the Roblox experience!"
      );
      break;

    case "!roblox":
      await sendMessage(
        channel,
        "Get verified in Discord first, then join the Roblox experience. Link in channel description!"
      );
      break;

    case "!song":
      await sendMessage(
        channel,
        "Check the event page on our web app for the full playlist!"
      );
      break;

    case "!help":
      await sendMessage(
        channel,
        "Commands: !event (event info) | !discord (join Discord) | !roblox (join experience) | !song (current track) | !help"
      );
      break;
  }
}

/** Disconnect the bot */
export async function disconnect(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}

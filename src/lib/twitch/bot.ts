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

/** Announce a ticket purchase */
export async function announceTicketPurchase(
  channel: string,
  remaining: number
): Promise<void> {
  await sendMessage(
    channel,
    `Someone just grabbed a ticket! ${remaining} remaining.`
  );
}

/** Announce a player joining the MC server */
export async function announcePlayerJoin(
  channel: string,
  playerName: string
): Promise<void> {
  await sendMessage(
    channel,
    `${playerName} just entered the Minecraft venue!`
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

    case "!tickets":
      await sendMessage(
        channel,
        "Visit the web app to check ticket availability and buy tickets."
      );
      break;

    case "!mc":
      await sendMessage(
        channel,
        "Buy a ticket first, then link your Minecraft username on the web app to get whitelisted!"
      );
      break;

    case "!help":
      await sendMessage(
        channel,
        "Commands: !event (event info) | !tickets (buy tickets) | !mc (Minecraft server info) | !help"
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

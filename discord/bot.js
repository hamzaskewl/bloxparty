require("dotenv").config();
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require("discord.js");

// ─── Config ───
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const API_BASE = process.env.API_BASE || "http://localhost:3000";
const VERIFIED_ROLE_NAME = process.env.VERIFIED_ROLE_NAME || "Verified Holder";

if (!TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

// ─── Roblox username → userId lookup ───
async function robloxUsernameToId(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.data && data.data.length > 0) {
    return { id: String(data.data[0].id), name: data.data[0].name };
  }
  return null;
}

// ─── Register slash commands ───
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("link")
      .setDescription("Link your Roblox account to get whitelisted for concerts")
      .addStringOption((opt) =>
        opt.setName("roblox_username").setDescription("Your Roblox username").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Check if your Roblox account is whitelisted"),
    new SlashCommandBuilder()
      .setName("unlink")
      .setDescription("Remove your Roblox whitelist entry"),
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("[Bot] Registering slash commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("[Bot] Slash commands registered.");
  } catch (err) {
    console.error("[Bot] Failed to register commands:", err);
  }
}

// ─── Bot ───
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[Bot] Logged in as ${c.user.tag}`);
  console.log(`[Bot] API: ${API_BASE}`);
  console.log(`[Bot] Required role: "${VERIFIED_ROLE_NAME}"`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, member, user } = interaction;

  // ─── /link ───
  if (commandName === "link") {
    // Check for verified holder role (from Collab.Land)
    const hasRole = member.roles.cache.some((r) => r.name === VERIFIED_ROLE_NAME);
    if (!hasRole) {
      return interaction.reply({
        content: `You need the **${VERIFIED_ROLE_NAME}** role first.\n\nGo to <#collabland-join> and connect your Solana wallet holding the creator coin.`,
        ephemeral: true,
      });
    }

    const robloxUsername = interaction.options.getString("roblox_username");

    await interaction.deferReply({ ephemeral: true });

    // Look up Roblox user ID from username
    const robloxUser = await robloxUsernameToId(robloxUsername);
    if (!robloxUser) {
      return interaction.editReply(
        `Could not find a Roblox account named **${robloxUsername}**. Double-check the spelling and try again.`
      );
    }

    try {
      const res = await fetch(`${API_BASE}/api/roblox/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUserId: robloxUser.id,
          discordUserId: user.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return interaction.editReply(`Failed to whitelist: ${err.error || "Unknown error"}`);
      }

      return interaction.editReply(
        `You're in! **${robloxUser.name}** (ID: \`${robloxUser.id}\`) has been whitelisted.\n\nYou can now join the Roblox concert experience.`
      );
    } catch (err) {
      console.error("[Bot] Whitelist API error:", err);
      return interaction.editReply("Something went wrong reaching the API. Try again later.");
    }
  }

  // ─── /status ───
  if (commandName === "status") {
    await interaction.deferReply({ ephemeral: true });

    const hasRole = member.roles.cache.some((r) => r.name === VERIFIED_ROLE_NAME);

    return interaction.editReply(
      [
        `**Your Bloxparty Status**`,
        ``,
        `Holder Role: ${hasRole ? "Yes" : "No — connect wallet in <#collabland-join>"}`,
        ``,
        hasRole
          ? `Use \`/link <roblox_username>\` to whitelist your Roblox account.`
          : `Get the **${VERIFIED_ROLE_NAME}** role first, then link your Roblox account.`,
      ].join("\n")
    );
  }

  // ─── /unlink ───
  if (commandName === "unlink") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await fetch(`${API_BASE}/api/roblox/whitelist`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordUserId: user.id }),
      });

      if (res.status === 404) {
        return interaction.editReply("You don't have a linked Roblox account.");
      }
      if (!res.ok) {
        return interaction.editReply("Something went wrong. Try again later.");
      }

      return interaction.editReply("Your Roblox account has been unlinked. You'll need to `/link` again to rejoin.");
    } catch (err) {
      console.error("[Bot] Unlink error:", err);
      return interaction.editReply("Something went wrong reaching the API. Try again later.");
    }
  }
});

// ─── Start ───
registerCommands().then(() => client.login(TOKEN));

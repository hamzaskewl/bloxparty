require("dotenv").config();
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require("discord.js");

// ─── Config ───
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const API_BASE = process.env.API_BASE || "http://localhost:3000";
const VERIFIED_ROLE_NAME = process.env.VERIFIED_ROLE_NAME || "Verified Holder";

if (!TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

// ─── Register slash commands ───
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("link")
      .setDescription("Link your Roblox account to get whitelisted for concerts")
      .addStringOption((opt) =>
        opt.setName("roblox_user_id").setDescription("Your Roblox User ID (number from your profile URL)").setRequired(true)
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

    const robloxUserId = interaction.options.getString("roblox_user_id");

    // Basic validation — should be a number
    if (!/^\d+$/.test(robloxUserId)) {
      return interaction.reply({
        content: "That doesn't look like a valid Roblox User ID. It should be a number (e.g. `12345678`).\n\nFind yours at: https://www.roblox.com/users/profile → the number in the URL.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await fetch(`${API_BASE}/api/roblox/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUserId,
          discordUserId: user.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return interaction.editReply(`Failed to whitelist: ${err.error || "Unknown error"}`);
      }

      return interaction.editReply(
        `You're in! Roblox ID \`${robloxUserId}\` has been whitelisted.\n\nYou can now join the Roblox concert experience.`
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
          ? `Use \`/link <roblox_user_id>\` to whitelist your Roblox account.`
          : `Get the **${VERIFIED_ROLE_NAME}** role first, then link your Roblox account.`,
      ].join("\n")
    );
  }

  // ─── /unlink ───
  if (commandName === "unlink") {
    await interaction.reply({
      content: "To unlink, contact an admin. Your whitelist entry will be removed.",
      ephemeral: true,
    });
  }
});

// ─── Start ───
registerCommands().then(() => client.login(TOKEN));

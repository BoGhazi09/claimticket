const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("Web server running on port 3000");
});

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const PILOT_ROLE_ID = "1478564123259310090";

const CLAIM_PREFIX = "CLAIMED_BY:";

const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket"),

  new SlashCommandBuilder()
    .setName("unclaimticket")
    .setDescription("Unclaim this ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash commands registered");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const channel = interaction.channel;
  const member = interaction.member;

  if (!channel) return;

  const isPilot = member.roles.cache.has(PILOT_ROLE_ID);

  if (!isPilot) {
    return interaction.reply({
      content: "No permission.",
      ephemeral: true
    });
  }

  // =========================
  // CLAIM COMMAND
  // =========================
  if (interaction.commandName === "claimticket") {

    await interaction.deferReply({ ephemeral: true });

    const topic = channel.topic || "";

    // already claimed
    if (topic.startsWith(CLAIM_PREFIX)) {
      return interaction.editReply("This ticket is already claimed.");
    }

    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const newName = `${channel.name}-${username}`;

    try {
      await channel.setName(newName);
      await channel.setTopic(`${CLAIM_PREFIX}${interaction.user.id}`);

      return interaction.editReply(`Claimed by ${username}`);
    } catch (err) {
      console.error(err);
      return interaction.editReply("Rename failed.");
    }
  }

  // =========================
  // UNCLAIM COMMAND
  // =========================
  if (interaction.commandName === "unclaimticket") {

    await interaction.deferReply({ ephemeral: true });

    const topic = channel.topic || "";

    if (!topic.startsWith(CLAIM_PREFIX)) {
      return interaction.editReply("This ticket is not claimed.");
    }

    const claimedUserId = topic.replace(CLAIM_PREFIX, "");

    // only claimer can unclaim OR owner (optional allow owner override)
    const isOwner = member.permissions.has("Administrator");

    if (claimedUserId !== interaction.user.id && !isOwner) {
      return interaction.editReply("Only the claimer can unclaim this ticket.");
    }

    try {
      // remove last "-username"
      let parts = channel.name.split("-");
      parts.pop();

      const newName = parts.join("-");

      await channel.setName(newName);
      await channel.setTopic("");

      return interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      return interaction.editReply("Unclaim failed.");
    }
  }
});

client.login(process.env.TOKEN);

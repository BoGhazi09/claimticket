const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot is running"));

app.listen(3000, () => {
  console.log("Web server running");
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

const PREFIX = {
  CLAIMED: "CLAIMED:",
  ORIGINAL: "ORIGINAL:"
};

const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim ticket"),

  new SlashCommandBuilder()
    .setName("unclaimticket")
    .setDescription("Unclaim ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Commands registered");
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
  // CLAIM
  // =========================
  if (interaction.commandName === "claimticket") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const topic = channel.topic || "";

      if (topic.startsWith(PREFIX.CLAIMED)) {
        return interaction.editReply("Already claimed.");
      }

      const username = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      const originalName = channel.name;

      const newName = `${originalName}-${username}`;

      await channel.setName(newName);

      await channel.setTopic(
        `${PREFIX.CLAIMED}${interaction.user.id}|${PREFIX.ORIGINAL}${originalName}`
      );

      return interaction.editReply(`Claimed by ${username}`);
    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return interaction.editReply("Claim failed.");
    }
  }

  // =========================
  // UNCLAIM (ROBUST)
  // =========================
  if (interaction.commandName === "unclaimticket") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const topic = channel.topic || "";

      if (!topic.includes(PREFIX.CLAIMED)) {
        return interaction.editReply("Not claimed.");
      }

      const originalPart = topic
        .split("|")
        .find(x => x.startsWith(PREFIX.ORIGINAL));

      if (!originalPart) {
        return interaction.editReply("Original name missing.");
      }

      const originalName = originalPart.replace(PREFIX.ORIGINAL, "");

      await channel.setName(originalName).catch(() => {});
      await channel.setTopic("").catch(() => {});

      return interaction.editReply("Unclaimed successfully.");

    } catch (err) {
      console.error("UNCLAIM ERROR:", err);

      try {
        return interaction.editReply("Unclaim failed.");
      } catch {
        return interaction.reply({
          content: "Unclaim failed.",
          ephemeral: true
        });
      }
    }
  }
});

client.login(process.env.TOKEN);

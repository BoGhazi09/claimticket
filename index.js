const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("Web server running on port 3000");
});

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// your pilot role
const PILOT_ROLE_ID = "1478564123259310090";

const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash command registered");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "claimticket") {

    const member = interaction.member;
    const channel = interaction.channel;

    if (!channel) {
      return interaction.reply({ content: "No channel found.", ephemeral: true });
    }

    // 🚫 ROLE CHECK
    if (!member.roles.cache.has(PILOT_ROLE_ID)) {
      return interaction.reply({
        content: "You are not allowed to use this command.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // 👉 KEEP FULL ORIGINAL NAME + ADD USER
    const newName = `${channel.name}-${username}`;

    try {
      const updated = await channel.setName(newName);

      console.log("Renamed to:", updated.name);

      return interaction.editReply(`Claimed by ${username}`);
    } catch (err) {
      console.error("RENAME ERROR:", err);

      return interaction.editReply("Rename failed (permissions or channel type).");
    }
  }
});

client.login(process.env.TOKEN);

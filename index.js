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

const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket and rename the channel")
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

    const channel = interaction.channel;
    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // SIMPLE TEST NAME (no logic, no splitting)
    const newName = `claimed-${username}`;

    try {
      await interaction.deferReply({ ephemeral: true });

      await channel.setName(newName);

      return interaction.editReply(`Renamed to ${newName}`);
    } catch (err) {
      console.error("RENAME ERROR:", err);

      return interaction.editReply("Rename failed (check permissions).");
    }
  }
});

client.login(process.env.TOKEN);

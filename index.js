const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("Web server running");
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

    const pilotRoleId = "1478564123259310090";
    const ownerRoleId = "1478554422303916185";

    const member = interaction.member;
    const channel = interaction.channel;

    if (!channel) return;

    const isOwner = member.roles.cache.has(ownerRoleId);
    const isPilot = member.roles.cache.has(pilotRoleId);

    if (!isPilot && !isOwner) {
      return interaction.reply({
        content: "No permission.",
        ephemeral: true
      });
    }

    // IMPORTANT FIX (prevents Unknown Interaction)
    await interaction.deferReply({ ephemeral: true });

    const topic = channel.topic || "";
    const alreadyClaimed = topic.includes("CLAIMED_BY:");

    if (alreadyClaimed && !isOwner) {
      return interaction.editReply("This ticket is already claimed.");
    }

    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    let baseName = channel.name;
    const parts = baseName.split("-");
    if (parts.length > 1) {
      baseName = parts.slice(0, -1).join("-");
    }

    const newName = `${baseName}-${username}`;

    try {
      await channel.setTopic(`CLAIMED_BY:${interaction.user.id}`);
      await channel.setName(newName);
    } catch (err) {
      console.error(err);
      return interaction.editReply("Rename failed. Check bot permissions.");
    }

    return interaction.editReply(`Ticket claimed by ${interaction.user.username}`);
  }
});

client.login(process.env.TOKEN);

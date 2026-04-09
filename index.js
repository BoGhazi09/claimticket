const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(3000, () => console.log("Web server started"));

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags // Added for modern ephemeral handling
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const PILOT_ROLE_ID = "1478564123259310090";

const commands = [
  new SlashCommandBuilder().setName("claimticket").setDescription("Claim this ticket"),
  new SlashCommandBuilder().setName("unclaimticket").setDescription("Unclaim this ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// Changed 'ready' to 'clientReady' per your console warning
client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Commands registered");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { channel, member, commandName } = interaction;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
  }

  // Defer immediately to prevent "Unknown Interaction" errors
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (e) {
    return; // Interaction expired or failed, stop here
  }

  if (commandName === "claimticket") {
    try {
      if (channel.name.includes("-claimed")) {
        return interaction.editReply("This ticket is already claimed.");
      }

      const cleanUser = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      await channel.setName(`${channel.name}-claimed-${cleanUser}`);
      await interaction.editReply(`You have claimed this ticket.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to rename channel. Check bot permissions (Manage Channels).");
    }
  }

  if (commandName === "unclaimticket") {
    try {
      if (!channel.name.includes("-claimed")) {
        return interaction.editReply("This ticket isn't claimed.");
      }

      const baseName = channel.name.split("-claimed")[0];
      await channel.setName(baseName);
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to unclaim. I might be rate-limited.");
    }
  }
});

client.login(process.env.TOKEN);

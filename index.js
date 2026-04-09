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
  MessageFlags
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const PILOT_ROLE_ID = "1478564123259310090";
// Shortened prefix to keep channel names under the 100-character limit
const PREFIX = "clm-"; 

const commands = [
  new SlashCommandBuilder().setName("claimticket").setDescription("Claim this ticket"),
  new SlashCommandBuilder().setName("unclaimticket").setDescription("Unclaim this ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Commands registered");
  } catch (err) { console.error(err); }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { channel, member, commandName, user } = interaction;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (e) { return; }

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      if (channel.name.startsWith(PREFIX)) {
        return interaction.editReply("This ticket is already claimed!");
      }

      // Format: clm-username-original-name
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newName = `${PREFIX}${cleanUser}-${channel.name}`;

      await channel.setName(newName);
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to claim. Check permissions or wait (Rate Limited).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      if (!channel.name.startsWith(PREFIX)) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Logic: Find the second hyphen and take everything after it
      // Format was: clm - username - originalname
      const parts = channel.name.split("-");
      // Remove 'clm' and the 'username'
      const originalName = parts.slice(2).join("-");

      await channel.setName(originalName || "ticket-restored");
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to unclaim. Discord limits name changes to 2 per 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);

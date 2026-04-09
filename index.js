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
const DIVIDER = "--"; // Hidden divider to handle names with hyphens safely

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
      if (channel.name.includes(DIVIDER)) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // format: war-boghazi09--reealms
      const newName = `${channel.name}${DIVIDER}${cleanUser}`;

      await channel.setName(newName);
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error("CLAIM ERR:", err);
      await interaction.editReply("Discord is blocking this rename. Wait 5-10 minutes and try again (Rate Limit).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      if (!channel.name.includes(DIVIDER)) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Splits at the double hyphen and takes the first part (the original name)
      const parts = channel.name.split(DIVIDER);
      const originalName = parts[0];

      await channel.setName(originalName);
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error("UNCLAIM ERR:", err);
      await interaction.editReply("Unclaim failed. You are likely rate-limited by Discord.");
    }
  }
});

client.login(process.env.TOKEN);

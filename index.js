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
      // Check if we've already claimed it (using a metadata check or name check)
      // We check if the last 4+ characters match a username pattern
      // To be safe, we'll use a simple check: is there a claimer in the name?
      // Since you want 'war-boghazi-09-reealms', we check if it was already modified.
      
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // If the name already ends with a username, we stop
      if (channel.name.endsWith(`-${cleanUser}`)) {
        return interaction.editReply("You already claimed this!");
      }

      const originalName = channel.name;
      const newName = `${originalName}-${cleanUser}`;

      await channel.setName(newName);
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. If the name didn't change, Discord is rate-limiting you (Wait 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const nameParts = channel.name.split("-");
      
      // If there's no hyphen, it can't be unclaimed
      if (nameParts.length < 2) {
        return interaction.editReply("This ticket doesn't look claimed.");
      }

      // We remove the LAST part of the name (the username)
      nameParts.pop(); 
      const restoredName = nameParts.join("-");

      await channel.setName(restoredName);
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. Note: You can only rename a channel 2 times every 10 minutes.");
    }
  }
});

client.login(process.env.TOKEN);

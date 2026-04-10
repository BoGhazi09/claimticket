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

client.once("ready", async () => {
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
      // Check if already claimed by looking for our hidden marker in the topic
      if (channel.topic && channel.topic.startsWith("ORIGINAL_NAME:")) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const originalName = channel.name;
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newName = `${originalName}-${cleanUser}`;

      // Save the original name in the topic so unclaim is 100% accurate
      await channel.setTopic(`ORIGINAL_NAME:${originalName}`);
      await channel.setName(newName);
      
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. You are likely rate-limited. Wait 10 mins.");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      // If the topic doesn't have our marker, it's not claimed
      if (!channel.topic || !channel.topic.startsWith("ORIGINAL_NAME:")) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Get the EXACT original name back from the topic vault
      const restoredName = channel.topic.replace("ORIGINAL_NAME:", "");

      await channel.setName(restoredName);
      await channel.setTopic(""); // Clear the vault
      
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. Discord limits renames to 2 per 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);

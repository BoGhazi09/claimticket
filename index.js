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
      // If the topic contains "ORIGINAL:", it means it's already claimed
      if (channel.topic && channel.topic.includes("ORIGINAL:")) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const originalName = channel.name;
      
      // Exact format: war-boghazi09-reealms
      const newName = `${originalName}-${cleanUser}`;

      // Save the original name in the topic so we can revert it later
      await channel.setTopic(`ORIGINAL:${originalName}`);
      await channel.setName(newName);
      
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to claim. You are likely rate-limited (2 renames per 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      if (!channel.topic || !channel.topic.includes("ORIGINAL:")) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Retrieve the original name from the topic
      const originalName = channel.topic.replace("ORIGINAL:", "");

      await channel.setName(originalName);
      await channel.setTopic(""); // Clear the "memory"
      
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to unclaim. Discord limits name changes to 2 per 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);

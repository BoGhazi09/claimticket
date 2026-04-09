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
      // Check if already claimed by looking at the topic
      if (channel.topic && channel.topic.startsWith("CLAIMED_BY:")) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const originalName = channel.name;
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newName = `${originalName}-${cleanUser}`;

      // Store the original name in the topic so we know exactly what to revert to
      await channel.setTopic(`CLAIMED_BY:${originalName}`);
      await channel.setName(newName);
      
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. You are likely rate-limited (Max 2 renames per 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      // If the topic doesn't have our tag, it's not claimed
      if (!channel.topic || !channel.topic.startsWith("CLAIMED_BY:")) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Extract the original name we saved earlier
      const restoredName = channel.topic.replace("CLAIMED_BY:", "");

      await channel.setName(restoredName);
      await channel.setTopic(""); // Clear the topic switch
      
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. (Note: Discord limits renames to 2 per 10 mins).");
    }
  }
});

client.login(process.env.TOKEN);

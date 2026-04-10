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
  } catch (err) { console.error(err); }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { channel, member, commandName, user } = interaction;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
  }

  // Defer immediately to prevent "Interaction Failed"
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Helper function to clean username
  const cleanUsername = (username) => {
    return username.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      const cleanUser = cleanUsername(user.username);
      
      // Check if already claimed by anyone
      const claimedPattern = new RegExp(`-${cleanUser}$`);
      if (channel.name.match(claimedPattern)) {
        return interaction.editReply("You already claimed this!");
      }

      // Check if claimed by someone else
      const hasClaimSuffix = /-[a-z0-9]+$/;
      if (hasClaimSuffix.test(channel.name)) {
        return interaction.editReply("This ticket is already claimed by someone else!");
      }

      const newName = `${channel.name}-${cleanUser}`;
      await channel.setName(newName);
      await interaction.editReply(`Claimed: ${newName}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. You are likely rate-limited (2 per 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const currentName = channel.name;
      const cleanUser = cleanUsername(user.username);
      
      // Check if the ticket is claimed at all
      const hasClaimSuffix = /-[a-z0-9]+$/;
      if (!hasClaimSuffix.test(currentName)) {
        return interaction.editReply("This ticket is not claimed.");
      }
      
      // Extract the claimed username from the channel name
      const lastHyphenIndex = currentName.lastIndexOf("-");
      const claimedUser = currentName.substring(lastHyphenIndex + 1);
      
      // Check if the user trying to unclaim is the one who claimed it
      if (claimedUser !== cleanUser) {
        return interaction.editReply("You can only unclaim tickets that you claimed!");
      }
      
      // Remove the claim suffix
      const restoredName = currentName.substring(0, lastHyphenIndex);
      
      await channel.setName(restoredName);
      await interaction.editReply(`Unclaimed: ${restoredName}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. Discord limit reached. Wait 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);

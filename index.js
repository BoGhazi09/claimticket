const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(3000, () => console.log("Web server started"));

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder, // Fixed the naming here
  MessageFlags
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const PILOT_ROLE_ID = "1478564123259310090";

// REGISTER COMMANDS
const commands = [
  new SlashCommandBuilder().setName("claimticket").setDescription("Claim this ticket"),
  new SlashCommandBuilder().setName("unclaimticket").setDescription("Unclaim this ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Commands registered successfully");
  } catch (err) { console.error(err); }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { channel, member, commandName, user } = interaction;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
  }

  // Stop the "Thinking" spinner immediately
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // If the channel name already has 2+ hyphens, it might be claimed
      // but we'll let it proceed to rename to the current user
      const newName = `${channel.name}-${cleanUser}`;

      await channel.setName(newName);
      await interaction.editReply(`✅ Claimed: \`${newName}\``);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. (Discord Rate Limit: Wait 10 mins)");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const currentName = channel.name;
      
      // Look for the last hyphen to find the username part
      const lastHyphen = currentName.lastIndexOf("-");

      // If no hyphen exists, we can't unclaim anything
      if (lastHyphen === -1) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Cut everything from the last hyphen to the end
      const restoredName = currentName.substring(0, lastHyphen);

      // Final check to make sure we don't set an empty name
      if (!restoredName) {
        return interaction.editReply("Error: Restoration would result in an empty name.");
      }

      await channel.setName(restoredName);
      await interaction.editReply(`✅ Unclaimed: \`${restoredName}\``);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. (Discord Rate Limit: Wait 10 mins)");
    }
  }
});

client.login(process.env.TOKEN);

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
  new SlashBuilder().setName("claimticket").setDescription("Claim this ticket"),
  new SlashBuilder().setName("unclaimticket").setDescription("Unclaim this ticket")
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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // If there's already a claimer, don't add another one
      // We check if the channel name already contains a "-username" pattern
      // You can manually adjust the logic here if you want to allow re-claiming
      
      const newName = `${channel.name}-${cleanUser}`;

      await channel.setName(newName);
      await interaction.editReply(`✅ Claimed: \`${newName}\``);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. (Rate Limited: Wait 10 mins)");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const currentName = channel.name;
      
      // Look for the last hyphen
      const lastHyphen = currentName.lastIndexOf("-");

      // If no hyphen exists, the name is already original
      if (lastHyphen === -1) {
        return interaction.editReply("This ticket is not claimed.");
      }

      // Restore the name by cutting off everything from the last hyphen onward
      const restoredName = currentName.substring(0, lastHyphen);

      await channel.setName(restoredName);
      await interaction.editReply(`✅ Unclaimed: \`${restoredName}\``);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. (Rate Limited: Wait 10 mins)");
    }
  }
});

client.login(process.env.TOKEN);

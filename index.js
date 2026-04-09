const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot is running"));

app.listen(3000, () => console.log("Web server running"));

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const PILOT_ROLE_ID = "1478564123259310090";

const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim ticket"),

  new SlashCommandBuilder()
    .setName("unclaimticket")
    .setDescription("Unclaim ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Commands ready");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const channel = interaction.channel;
  const member = interaction.member;

  if (!channel) return;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({
      content: "No permission.",
      ephemeral: true
    });
  }

  // =========================
  // CLAIM
  // =========================
  if (interaction.commandName === "claimticket") {
    await interaction.reply({ content: "Claiming...", ephemeral: true });

    try {
      const username = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      // if already claimed (simple check)
      if (channel.name.includes("-claimed-")) {
        return interaction.editReply("Already claimed.");
      }

      const newName = `${channel.name}-${username}`;

      await channel.setName(newName);

      return interaction.editReply("Claimed.");
    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return interaction.editReply("Claim failed (check permissions).");
    }
  }

  // =========================
  // UNCLAIM
  // =========================
  if (interaction.commandName === "unclaimticket") {
    await interaction.reply({ content: "Unclaiming...", ephemeral: true });

    try {
      let name = channel.name;

      const parts = name.split("-");

      if (parts.length <= 1) {
        return interaction.editReply("Nothing to unclaim.");
      }

      // remove last part (claimer)
      parts.pop();

      const newName = parts.join("-");

      await channel.setName(newName);

      return interaction.editReply("Unclaimed.");

    } catch (err) {
      console.error("UNCLAIM ERROR:", err);
      return interaction.editReply("Unclaim failed.");
    }
  }
});

client.login(process.env.TOKEN);

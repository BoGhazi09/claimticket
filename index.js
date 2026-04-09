const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot running"));

app.listen(3000, () => console.log("Web server started"));

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

const CLAIM_PREFIX = "CLAIMED_BY:";

const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket"),

  new SlashCommandBuilder()
    .setName("unclaimticket")
    .setDescription("Unclaim this ticket")
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

  // ======================
  // CLAIM
  // ======================
  if (interaction.commandName === "claimticket") {
    await interaction.reply({ content: "Claiming...", ephemeral: true });

    try {
      const topic = channel.topic || "";

      // already claimed
      if (topic.startsWith(CLAIM_PREFIX)) {
        return interaction.editReply("Already claimed.");
      }

      const username = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      const newName = `${channel.name}-${username}`;

      await channel.setName(newName);

      await channel.setTopic(`${CLAIM_PREFIX}${interaction.user.id}`);

      return interaction.editReply("Claimed.");

    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return interaction.editReply("Claim failed.");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (interaction.commandName === "unclaimticket") {
    await interaction.reply({ content: "Unclaiming...", ephemeral: true });

    try {
      const topic = channel.topic || "";

      if (!topic.startsWith(CLAIM_PREFIX)) {
        return interaction.editReply("Not claimed.");
      }

      // remove last "-username"
      let parts = channel.name.split("-");
      parts.pop();

      await channel.setName(parts.join("-"));

      await channel.setTopic("");

      return interaction.editReply("Unclaimed.");

    } catch (err) {
      console.error("UNCLAIM ERROR:", err);
      return interaction.editReply("Unclaim failed.");
    }
  }
});

client.login(process.env.TOKEN);

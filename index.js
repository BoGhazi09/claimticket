const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CLAIMED_TAG = "CLAIMED_BY:";

// Slash command
const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket and rename the channel")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash command registered");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "claimticket") {

    const pilotRoleId = "1478564123259310090";
    const ownerRoleId = "1478554422303916185";

    const member = interaction.member;
    const channel = interaction.channel;

    if (!channel) {
      return interaction.reply({ content: "Channel not found.", ephemeral: true });
    }

    const topic = channel.topic || "";

    const alreadyClaimed = topic.includes(CLAIMED_TAG);

    const isOwner = member.roles.cache.has(ownerRoleId);
    const isPilot = member.roles.cache.has(pilotRoleId);

    // ❌ not allowed role
    if (!isPilot && !isOwner) {
      return interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true
      });
    }

    // ❌ already claimed and NOT owner
    if (alreadyClaimed && !isOwner) {
      return interaction.reply({
        content: "This ticket is already claimed.",
        ephemeral: true
      });
    }

    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const newName = `${channel.name.split("-")[0]}-${username}`;

    // mark as claimed in channel topic
    await channel.setTopic(`${CLAIMED_TAG}${interaction.user.id}`);

    await channel.setName(newName);

    return interaction.reply({
      content: `Ticket claimed by ${interaction.user.username}`,
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// slash command setup
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
  const allowedRoleId = "1478564123259310090";

  const member = interaction.member;

  if (!member.roles.cache.has(allowedRoleId)) {
    return interaction.reply({
      content: "You can't use this command.",
      ephemeral: true
    });
  }

  const channel = interaction.channel;

  const username = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const newName = `${channel.name}-${username}`;

  await channel.setName(newName);

  return interaction.reply({
    content: `Ticket claimed by ${interaction.user.username}`,
    ephemeral: true
  });
}
    const channel = interaction.channel;

    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const newName = `${channel.name}-${username}`;

    await channel.setName(newName);

    return interaction.reply({
      content: `Ticket claimed by ${interaction.user.username}`,
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);

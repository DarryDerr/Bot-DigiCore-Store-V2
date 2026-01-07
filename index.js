require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { log, success, warn, error } = require("./utils/logger");
const config = require("./config");
const { handleMemberAdd, handleMemberRemove } = require("./events/welcomeLeaveHandler");
const { handleMemberInvitedAdd, handleMemberInvitedRemove } = require("./events/inviteTrackerHandler");
const { updateServerStats } = require("./events/updateServerStats")
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

client.commands = new Collection();

(async () => {
  const handlersPath = path.join(__dirname, "handlers");
  const handlerFiles = fs.readdirSync(handlersPath).filter(f => f.endsWith(".js"));

  for (const file of handlerFiles) {
    const handler = require(`./handlers/${file}`);

    if (typeof handler === "function") {
      await handler(client, { deploy: true });
      success(`Loaded handler: ${file}`);
    } else {
      warn(`Handler ${file} tidak mengekspor fungsi!`);
    }
  }

  await client.login(process.env.TOKEN);
})();

client.on("guildMemberAdd", async (member) => {
  try {
    await handleMemberInvitedAdd(client, member, config);
    await handleMemberAdd(client, member);
    await updateServerStats(member.guild);
  } catch (err) {
    error("Error di guildMemberAdd:", err);
  }
});

client.on("guildMemberRemove", async (member) => {
  try {
    await handleMemberInvitedRemove(client, member, config);
    await handleMemberRemove(client, member);
    await updateServerStats(member.guild);
  } catch (err) {
    error("Error di guildMemberRemove:", err);
  }
});

client.on("presenceUpdate", async (_, presence) => {
  try {
    if (presence?.guild) {
      await updateServerStats(presence.guild);
    }
  } catch (err) {
    error("Error di presenceUpdate:", err);
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({ content: "❌ Command tidak ditemukan!", ephemeral: true });
    }

    await command.execute(interaction, client);

  } catch (err) {
    error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "❌ Terjadi kesalahan saat menjalankan command.", ephemeral: true });
    } else {
      await interaction.reply({ content: "❌ Terjadi kesalahan saat menjalankan command.", ephemeral: true });
    }
  }
});

setInterval(async () => {
  for (const [, guild] of client.guilds.cache) await updateServerStats(guild);
}, 60 * 1000);
log("[ServerStats] Auto update server stats dijalankan setiap 1 menit!");
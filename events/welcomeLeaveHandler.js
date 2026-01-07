const { embedMaker } = require("../utils/embedMaker");
const config = require("../config");
const { log, warn, error, success } = require("../utils/logger");

async function handleMemberAdd(client, member) {
  try {
    const role = member.guild.roles.cache.get(config.UNVERIFIED_ROLE_ID);
    if (role) {
      await member.roles.add(role);
      log(`[WelcomeLeaveMessage] Role ${role.name} diberikan ke ${member.user.tag}`);
    } else {
      warn(`[WelcomeLeaveMessage] Role ID ${config.UNVERIFIED_ROLE_ID} tidak ditemukan di guild ${member.guild.name}`);
    }

    const channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL_ID);
    if (!channel) {
      warn(`[WelcomeLeaveMessage] Welcome channel ID ${config.WELCOME_CHANNEL_ID} tidak ditemukan.`);
      return;
    }

    const embed = embedMaker({
      title: `👋 WELCOME ${member.user.username.toUpperCase()}!`,
      description: `Selamat datang ${member}, kamu sekarang menjadi bagian dari **${member.guild.name}** 🎉`,
      color: "#0062FF",
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
      footer: { text: `${new Date().toLocaleString("id-ID")}` },
    });

    await channel.send({ embeds: [embed] });
    success(`[WelcomeLeaveMessage] Welcome embed terkirim untuk ${member.user.tag}`);
  } catch (err) {
    error("[WelcomeLeaveMessage] Gagal memproses member baru:", err);
  }
}

async function handleMemberRemove(client, member) {
  try {
    const channel = member.guild.channels.cache.get(config.LEAVE_CHANNEL_ID);
    if (!channel) {
      warn(`[WelcomeLeaveMessage] Leave channel ID ${config.LEAVE_CHANNEL_ID} tidak ditemukan.`);
      return;
    }

    const embed = embedMaker({
      title: `😢 GOOD BYE ${member.user.username.toUpperCase()}`,
      description: `Semoga kita bisa bertemu lagi di **${member.guild.name}** 👋`,
      color: "#FF4C4C",
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
      footer: { text: new Date().toLocaleString("id-ID") },
    });

    await channel.send({ embeds: [embed] });
    success(`[WelcomeLeaveMessage] Leave embed terkirim untuk ${member.user.tag}`);
  } catch (err) {
    error("[WelcomeLeaveMessage] Gagal mengirim pesan leave:", err);
  }
}

module.exports = { handleMemberAdd, handleMemberRemove };
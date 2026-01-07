const { embedMaker } = require("../../utils/embedMaker");

module.exports = {
  name: "uptime",
  description: "Cek berapa lama bot aktif sejak online",

  async execute(interaction) {
    const totalSeconds = Math.floor(process.uptime());
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;

    const uptimeString = [
      days > 0 ? `${days} hari` : null,
      hours > 0 ? `${hours} jam` : null,
      minutes > 0 ? `${minutes} menit` : null,
      `${seconds} detik`
    ].filter(Boolean).join(', ');

    const embed = embedMaker({
        title: 'Bot Uptime',
        description: `**Bot sudah aktif selama:**\n\`${uptimeString}\``,
        color: '#0062FF'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
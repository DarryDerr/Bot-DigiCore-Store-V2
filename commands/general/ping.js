const { embedMaker } = require("../../utils/embedMaker");

module.exports = {
  name: "ping",
  description: "Cek kecepatan respon bot dan koneksi API Discord.",

  async execute(interaction) {
    const start = Date.now();

    await interaction.reply({ content: "⏱️ Mengukur kecepatan..." });

    const pingMs = Date.now() - start;

    const apiLatency = Math.round(interaction.client.ws.ping);
    const color = pingMs < 150 ? "#00FF62" : pingMs < 300 ? "#FFD962" : "#FF4C4C";
    const embed = embedMaker({
      title: "📡 Status Koneksi Bot",
      color,
      fields: [
        { name: "Latency Bot", value: `\`${pingMs}ms\``, inline: true },
        { name: "Discord API", value: `\`${apiLatency}ms\``, inline: true },
      ],
    });

    await interaction.editReply({ content: "**Tes selesai!**", embeds: [embed] });
  },
};
const { embedMaker } = require("../../utils/embedMaker");
const { error } = require("../../utils/logger");
const config = require('../../config');

module.exports = {
  name: "announce",
  description: "Kirim pengumuman langsung di channel ini",
  defaultMemberPermissions: "Administrator",
  public: false,
  options: [
    {
      type: "string",
      name: "judul",
      description: "Judul Pengumuman",
      required: true,
    },
    {
      type: "string",
      name: "deskripsi",
      description: "Isi pengumuman (gunakan \\n untuk baris baru)",
      required: true,
    },
    {
      type: "attachment",
      name: "gambar",
      description: "Gambar untuk pengumuman (opsional)",
      required: false,
    },
    {
      type: "string",
      name: "mention",
      description: "Pilih siapa yang akan di-mention (opsional)",
      required: false,
      choices: [
        { name: "@everyone", value: "@everyone" },
        { name: "@here", value: "@here" },
        { name: "Tanpa Mention", value: "none" },
      ],
    },
  ],

  async execute(interaction) {
    // Cek hak akses
    if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
        return interaction.reply({
            content: '🚫 Kamu tidak memiliki izin untuk menggunakan perintah ini.',
            ephemeral: true
        });
    }

    const judul = interaction.options.getString("judul");
    const deskripsi = interaction.options.getString("deskripsi").replace(/\\n/g, "\n");
    const gambar = interaction.options.getAttachment("gambar");
    const mention = interaction.options.getString("mention") || "none";
    const channel = interaction.channel;

    try {
      await interaction.reply({ content: "⏳ Mengirim pengumuman...", ephemeral: true });

      const embed = embedMaker({
        title: `📢 ${judul}`,
        description: deskripsi,
        color: "#0062FF",
        image: gambar ? gambar.url : null,
        timestamp: true,
      });

      const mentionText =
        mention === "@everyone" ? "@everyone" : mention === "@here" ? "@here" : "";

      await channel.send({
        content: mentionText,
        embeds: [embed],
      });

      await interaction.editReply({ content: `✅ Pengumuman berhasil dikirim ${mentionText ? `dengan ${mentionText}` : "tanpa mention"}.` });
    } catch (err) {
      error("[announce] Gagal mengirim pengumuman:", err);
      await interaction.reply({ content: "❌ Terjadi kesalahan saat mengirim Pengumuman. Pastikan Bot punya izin kirim pesan di Channel ini." }).catch(() => null);
    }
  },
};
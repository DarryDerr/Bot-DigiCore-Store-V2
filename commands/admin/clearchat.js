const { error } = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  name: "clearchat",
  description: "Menghapus pesan di channel ini.",
  defaultMemberPermissions: "ManageMessages",
  options: [
    {
      type: "integer",
      name: "jumlah",
      description: "Jumlah pesan yang ingin dihapus (1-100)",
      required: false,
      minValue: 1,
      maxValue: 100,
    },
    {
      type: "user",
      name: "user",
      description: "Hanya hapus pesan dari user tertentu",
      required: false,
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

    const jumlah = interaction.options.getInteger("jumlah") || 1;
    const user = interaction.options.getUser("user");

    try {
      let messages;

      if (user) {
        const fetched = await interaction.channel.messages.fetch({ limit: 100 });
        const userMessages = fetched.filter(msg => msg.author.id === user.id).first(jumlah);
        await interaction.channel.bulkDelete(userMessages, true);
        messages = userMessages;
      } else {
        messages = await interaction.channel.bulkDelete(jumlah, true);
      }

      const reply = await interaction.reply(
        `✅ Berhasil menghapus **${messages.length || messages.size}** pesan${user ? ` dari ${user.tag}` : ""}.`
      );

      setTimeout(async () => {
        try {
          const fetchedMsg = await interaction.fetchReply();
          await fetchedMsg.delete().catch(() => {});
        } catch {}
      }, 5000);

    } catch (err) {
      error(err);
      await interaction.reply(
        "❌ Terjadi kesalahan saat menghapus pesan. Pastikan pesan tidak lebih dari 14 hari."
      );
    }
  },
};

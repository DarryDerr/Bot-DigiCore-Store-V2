const { embedMaker } = require('../../utils/embedMaker');
const { TESTIMONI_CHANNEL_ID, SELLER_ROLE_ID, TESTIMONI_THUMB } = require('../../config');

module.exports = {
    name: 'testimoni',
    description: 'Kirim testimoni terhadap pembeli ke channel testimoni (Seller Only)',
    options: [
        {
            type: 'integer',
            name: 'nomor',
            description: 'Nomor urut testimoni',
            required: true,
        },
        {
            type: 'user',
            name: 'pembeli',
            description: 'Pembeli yang memberikan testimoni',
            required: true,
        },
        {
            type: 'integer',
            name: 'harga',
            description: 'Harga transaksi (contoh: 10000)',
            required: true,
        },
        {
            type: 'string',
            name: 'produk',
            description: 'Produk yang dibeli',
            required: true,
        },
        {
            type: 'attachment',
            name: 'bukti',
            description: 'Lampirkan bukti transaksi (Opsional)',
            required: false,
        },
    ],

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(SELLER_ROLE_ID)) {
      return interaction.reply({
        content: '🚫 Kamu tidak memiliki izin untuk menggunakan perintah ini.',
        ephemeral: true
      });
    }

    const nomor = interaction.options.getInteger('nomor');
    const pembeli = interaction.options.getUser('pembeli');
    const harga = interaction.options.getInteger('harga');
    const produk = interaction.options.getString('produk');
    const bukti = interaction.options.getAttachment('bukti');
    const formatHarga = new Intl.NumberFormat('id-ID').format(harga);

    const embed = embedMaker({
        description:
            `「 **Customer Testimoni #${nomor}** 」\n` +
            `**Transaksi Berhasil!**\n` +
            `\`\`Pembeli telah menyelesaikan transaksi dan memberikan rating positif.\`\`\n` +
            `***“Terima kasih telah mempercayai DigiCore Store! Kepuasan kamu adalah prioritas kami 💚”***`,
        color: '#00D351',
        fields: [
            { name: '› Penjual', value: `<@${interaction.user.id}>`, inline: true },
            { name: '› Pembeli', value: `<@${pembeli.id}>`, inline: true },
            { name: '› Harga', value: `Rp ${formatHarga}`, inline: true },
            { name: '› Produk', value: `\`${produk}\``, inline: false },
        ],
        thumbnail: TESTIMONI_THUMB,
        footer: 'DigiCore Store • Bukti nyata kepercayaan pelanggan',
        timestamp: true,
    });

    if (bukti) embed.setImage(bukti.url);

    const channel = interaction.client.channels.cache.get(TESTIMONI_CHANNEL_ID);

    if (!channel) {
      return interaction.reply({
        content: '❌ Channel testimoni tidak ditemukan. Cek ID di config!',
        ephemeral: true
      });
    }

    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: '✅ Testimoni berhasil dikirim ke channel testimoni!',
      ephemeral: true
    });
  }
};
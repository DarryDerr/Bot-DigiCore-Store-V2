const { embedMaker } = require('../../utils/embedMaker');
const { BUYER_ROLE_ID, RATING_CHANNEL_ID, RATING_THUMB } = require('../../config');

module.exports = {
    name: 'rating',
    description: 'Berikan rating & ulasan kepada penjual',
    options: [
        {
            type: 'user',
            name: 'penjual',
            description: 'Tag penjual yang ingin kamu rating',
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
            description: 'Nama produk yang dibeli',
            required: true,
        },
        {
            type: 'integer',
            name: 'rating',
            description: 'Rating mulai dari 1 sampai dengan 5',
            minValue: 1,
            maxValue: 5,
            required: true,
        },
        {
            type: 'string',
            name: 'ulasan',
            description: 'Tulis ulasan singkat kamu (Opsional)',
            required: false,
        },
    ],

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(BUYER_ROLE_ID)) {
      return interaction.reply({
        content: '🚫 Kamu tidak memiliki izin untuk memberikan rating.',
        ephemeral: true
      });
    }

    const seller = interaction.options.getUser('penjual');
    const price = interaction.options.getInteger('harga');
    const formatHarga = new Intl.NumberFormat('id-ID').format(price);
    const product = interaction.options.getString('produk');
    const rating = interaction.options.getInteger('rating');
    const review = interaction.options.getString('ulasan') || 'Tidak ada ulasan yang diberikan.';
    const stars = '⭐'.repeat(rating) + '✩'.repeat(5 - rating);
    const colors = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#00E676'];
    const color = colors[rating - 1];

    const embed = embedMaker({
        description:
            `「 **Customer Review** 」\n` +
            `**Ulasan Pembeli:**\n` +
            `\`${review}\``,
        color: color,
        fields: [
            { name: '› Penjual', value: `<@${seller.id}>`, inline: true },
            { name: '› Pembeli', value: `<@${interaction.user.id}>`, inline: true },
            { name: '› Harga Transaksi', value: `**Rp ${formatHarga}**`, inline: true },
            { name: '› Produk', value: `\`${product}\``, inline: false },
            { name: '› Penilaian', value: `${stars}  \`(${rating}/5)\``, inline: false },
        ],
        thumbnail: RATING_THUMB,
        footer: 'DigiCore Store • Trusted Customer Feedback',
        timestamp: true,
    });

    const channel = interaction.guild.channels.cache.get(RATING_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({
        content: '❌ Channel rating tidak ditemukan. Cek ID di config!',
        ephemeral: true
      });
    }

    await channel.send({ embeds: [embed] });
    await interaction.reply({
      content: '💚 Terima kasih telah meluangkan waktu untuk memberikan rating! Ulasan kamu menjadi bagian penting dari perjalanan DigiCore Store untuk selalu memberikan pengalaman terbaik bagi pelanggan.',
      ephemeral: true
    });
  }
};
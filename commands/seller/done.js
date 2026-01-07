const { embedMaker } = require('../../utils/embedMaker');
const { error } = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    name: 'done',
    description: 'Menandai transaksi telah berhasil dan memberikan Role Buyer ke Pembeli',
    defaultMemberPermissions: 'ManageGuild',
    options: [
        {
            type: 'user',
            name: 'pembeli',
            description: 'Pembeli yang melakukan transaksi',
            required: true,
        },
        {
            type: 'integer',
            name: 'nominal',
            description: 'Nominal pembelian',
            required: true,
        },
        {
            type: 'string',
            name: 'status',
            description: 'Status transaksi',
            required: true,
            choices: [
                { name: 'Berhasil', value: 'Berhasil' },
                { name: 'Gagal', value: 'Gagal' },
            ],
        },
    ],

    async execute(interaction) {
        try {
            // Cek hak akses
            if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
                return interaction.reply({
                    content: '🚫 Kamu tidak memiliki izin untuk menggunakan perintah ini.',
                    ephemeral: true,
                });
            }

            const pembeli = interaction.options.getUser('pembeli');
            const status = interaction.options.getString('status');
            const nominal = interaction.options.getInteger('nominal'); // FIX UTAMA
            const roleId = config.BUYER_ROLE_ID;

            const guild = interaction.guild;
            const member = await guild.members.fetch(pembeli.id);
            const role = guild.roles.cache.get(roleId);

            if (!role) {
                return interaction.reply({
                    content: `❌ Role dengan ID **${roleId}** tidak ditemukan.`,
                    ephemeral: true,
                });
            }

            if (status === 'Berhasil') {
                await member.roles.add(role).catch(err => {
                    throw new Error(`Gagal menambahkan role Buyer: ${err.message}`);
                });
            }

            const embed = embedMaker({
                title: 'Payment Received!',
                description:
                    (status === 'Berhasil'
                        ? 'Pembayaran Anda Telah **Berhasil!**'
                        : 'Pembayaran **Gagal.**')
                    + '\n\nTerima kasih telah membeli di **DigiCore Store**! Berikut detail pembayaran Anda:',
                color: status === 'Berhasil' ? '#00FF62' : '#FF4C4C',
                fields: [
                    { name: '› Pembeli', value: `${pembeli}`, inline: false },
                    { name: '› Harga Transaksi', value: `Rp ${nominal.toLocaleString('id-ID')}`, inline: false },
                    { name: '› Status', value: status === 'Berhasil' ? 'Lunas' : 'Gagal', inline: false },
                    { name: '› Tanggal', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                ],
                image: config.TRANSACTION_DONE_GIF,
                footer: `Diverifikasi oleh ${interaction.user.tag} • © DigiCore Store`,
            });

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            error(err);
            interaction.reply({
                content: '⚠️ Terjadi kesalahan saat memproses transaksi.',
                ephemeral: true,
            });
        }
    },
};
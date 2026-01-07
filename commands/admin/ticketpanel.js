const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embedMaker } = require('../../utils/embedMaker');
const path = require('path');
const { ADMIN_ROLE_ID, TICKET_ORDER_GIF, TICKET_ORDER_THUMB } = require(path.join(__dirname, '../../config'));

module.exports = {
    name: 'ticketpanel',
    description: 'Tampilkan panel ticket Order & Pertanyaan',

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '🚫 Kamu tidak memiliki izin untuk menjalankan perintah ini.',
                ephemeral: true,
            });
        }

        const embed = embedMaker({
            title: 'TICKET SYSTEM',
            description:
                'Silakan pilih jenis tiket yang ingin kamu buka:\n\n' +
                '🛒 **Order Produk** → untuk melakukan pembelian.\n' +
                '❓ **Pertanyaan / Bantuan** → untuk menanyakan sesuatu kepada admin.\n\n' +
                '> ⚠️ Gunakan fitur ini dengan bijak.',
            color: '#0062FF',
            thumbnail: TICKET_ORDER_THUMB,
            image: TICKET_ORDER_GIF,
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_order')
                .setLabel('🛒 Order Produk')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('create_ticket_ask')
                .setLabel('❓ Pertanyaan / Bantuan')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
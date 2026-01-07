const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { embedMaker } = require('../../utils/embedMaker');
const config = require('../../config');

module.exports = {
    name: 'report',
    description: 'Laporkan user ke Admin',
    options: [
        {
            type: 'user',
            name: 'pelaku',
            description: 'User yang ingin kamu laporkan',
            required: true,
        },
        {
            type: 'string',
            name: 'alasan',
            description: 'Alasan laporan kamu',
            required: true,
        },
        {
            type: 'attachment',
            name: 'bukti',
            description: 'Lampiran bukti kejahatan yang dilakukan user',
            required: true,
        },
    ],

    async execute(interaction) {
        const pelapor = interaction.user;
        const pelaku = interaction.options.getUser('pelaku');
        const alasan = interaction.options.getString('alasan');
        const bukti = interaction.options.getAttachment('bukti');

        const logChannel = await interaction.client.channels.fetch(config.REPORT_SENT_CHANNEL_ID).catch(() => null);
        if (!logChannel) {
            return interaction.reply({
                content: '❌ Channel log tidak ditemukan atau bot tidak punya akses.',
                ephemeral: true,
            });
        }

        const embed = embedMaker({
            title: '📨 Laporan Pengguna Masuk',
            description: 'Sebuah laporan baru telah diterima. Admin mohon segera bertindak!',
            color: '#FF4C4C',
            fields: [
                { name: 'Pelapor', value: `<@${pelapor.id}>`, inline: true },
                { name: 'Pelaku', value: `<@${pelaku.id}>`, inline: true },
                { name: 'Alasan', value: `\`\`${alasan}\`\``, inline: false },
            ],
            image: bukti.url,
            footer: 'Darry Report System',
            thumbnail: pelaku.displayAvatarURL({ dynamic: true }),
            timestamp: true,
        });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`report_resolved_${pelapor.id}`)
                .setLabel('Tandai Selesai')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`report_reply_${pelapor.id}`)
                .setLabel('Balas Pelapor')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`report_delete_${pelapor.id}`)
                .setLabel('Hapus Laporan')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.deferReply({ ephemeral: true });

        const payload = { embeds: [embed], components: [buttons] };
        await logChannel.send(payload);

        await interaction.editReply({
            content: '✅ Laporan kamu telah dikirim ke Team Admin. Terima kasih telah membantu menjaga komunitas kami tetap aman.',
        });
    },
};
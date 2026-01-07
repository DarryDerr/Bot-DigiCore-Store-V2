const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { embedMaker } = require('../../utils/embedMaker');
const db = require('../../utils/sqliteDB');
const config = require('../../config');

module.exports = {
    name: 'payment',
    description: 'Menampilkan metode pembayaran',

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '🚫 Kamu tidak memiliki izin', ephemeral: true });
        }

        const payments = db.all(`SELECT * FROM payments`);

        if (!payments.length) {
            return interaction.reply({
                content: '❌ Belum ada metode pembayaran',
                ephemeral: true
            });
        }

        const paymentList = payments
            .map(p => `• ${p.icon ? p.icon + ' ' : ''}**${p.type}**`)
            .join('\n');

        const embed = embedMaker({
            title: '💳 Metode Pembayaran',
            description: `Metode pembayaran yang tersedia:\n\n${paymentList}\n\nPilih salah satu di bawah 👇`,
            color: '#f7ff00',
            timestamp: true
        });

        const rows = [];
        let row = new ActionRowBuilder();

        payments.forEach((pay, i) => {
            const button = new ButtonBuilder()
                .setCustomId(`payment_${pay.id}`)
                .setLabel(pay.type)
                .setStyle(ButtonStyle.Primary);

            if (pay.icon) button.setEmoji(pay.icon);

            row.addComponents(button);

            if ((i + 1) % 5 === 0) {
                rows.push(row);
                row = new ActionRowBuilder();
            }
        });

        if (row.components.length) rows.push(row);

        const message = await interaction.reply({
            embeds: [embed],
            components: rows,
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000
        });

        collector.on('collect', async btn => {
            if (btn.user.id !== interaction.user.id) {
                return btn.reply({ content: '🚫 Ini bukan untuk kamu', ephemeral: true });
            }

            const id = btn.customId.split('_')[1];
            const payment = db.get(`SELECT * FROM payments WHERE id = ?`, [id]);

            if (!payment) {
                return btn.reply({ content: '❌ Payment tidak ditemukan', ephemeral: true });
            }

            const detailEmbed = embedMaker({
                title: `${payment.icon ? payment.icon + ' ' : ''}${payment.type}`,
                description: payment.message || 'Tidak ada keterangan',
                image: payment.image,
                color: '#00ff99',
                timestamp: true
            });

            await btn.reply({
                embeds: [detailEmbed],
                ephemeral: true
            });
        });

        collector.on('end', async () => {
            const expiredEmbed = embedMaker({
                title: '💳 Metode Pembayaran',
                description: '⏱️ Waktu pemilihan pembayaran telah **berakhir**.\nSilakan jalankan ulang command `/payment`.',
                color: '#aaaaaa',
                timestamp: true
            });

            await message.edit({
                embeds: [expiredEmbed],
                components: []
            });
        });
    }
};
const db = require('../../utils/sqliteDB');
const config = require('../../config');

module.exports = {
    name: 'addpayment',
    description: 'Menambahkan metode pembayaran',

    options: [
        {
            name: 'type',
            description: 'Jenis pembayaran (DANA / QRIS / GOPAY)',
            type: 'string',
            required: true
        },
        {
            name: 'icon',
            description: 'Icon / emoji payment (💳 atau <:dana:123>)',
            type: 'string'
        },
        {
            name: 'message',
            description: 'Keterangan / nomor / catatan',
            type: 'string'
        },
        {
            name: 'image',
            description: 'Link gambar / QR',
            type: 'string'
        }
    ],

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '🚫 Kamu tidak memiliki izin', ephemeral: true });
        }

        const type = interaction.options.getString('type').trim();
        const icon = interaction.options.getString('icon');
        const message = interaction.options.getString('message');
        const image = interaction.options.getString('image');

        const exists = db.get(
            `SELECT * FROM payments WHERE LOWER(type) = LOWER(?)`,
            [type]
        );

        if (exists) {
            return interaction.reply({
                content: `❌ Payment **${type}** sudah ada`,
                ephemeral: true
            });
        }

        db.run(
            `INSERT INTO payments (type, icon, message, image) VALUES (?, ?, ?, ?)`,
            [type, icon, message, image]
        );

        await interaction.reply({
            content: `✅ Payment **${icon ? icon + ' ' : ''}${type}** berhasil ditambahkan`,
            ephemeral: true
        });
    }
};
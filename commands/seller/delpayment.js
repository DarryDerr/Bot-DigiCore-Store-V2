const db = require('../../utils/sqliteDB');
const config = require('../../config');

module.exports = {
    name: 'delpayment',
    description: 'Menghapus metode pembayaran',

    options: [
        {
            name: 'type',
            description: 'Type pembayaran (DANA / QRIS / GOPAY)',
            type: 'string',
            required: true
        }
    ],

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '🚫 Kamu tidak memiliki izin',
                ephemeral: true
            });
        }

        const type = interaction.options.getString('type');

        const payment = db.get(
            `SELECT * FROM payments WHERE LOWER(type) = LOWER(?)`,
            [type]
        );

        if (!payment) {
            return interaction.reply({
                content: `❌ Payment **${type}** tidak ditemukan`,
                ephemeral: true
            });
        }

        db.run(`DELETE FROM payments WHERE id = ?`, [payment.id]);

        await interaction.reply({
            content: `🗑️ Payment **${payment.type}** berhasil dihapus`,
            ephemeral: true
        });
    }
};
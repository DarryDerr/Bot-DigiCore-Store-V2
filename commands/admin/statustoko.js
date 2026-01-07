const { sendStatus } = require('../../events/autoStatusToko');
const config = require('../../config');

module.exports = {
    name: 'statustoko',
    description: 'Ubah status toko',
    defaultMemberPermissions: 'Administrator',
    options: [
        {
            type: 'string',
            name: 'status',
            description: 'Pilih status toko',
            required: true,
            choices: [
                { name: '🟢 Buka', value: 'open' },
                { name: '🔴 Tutup', value: 'close' }
            ]
        }
    ],

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '🚫 Kamu tidak punya izin.',
                ephemeral: true
            });
        }

        const isOpen = interaction.options.getString('status') === 'open';

        const result = await sendStatus(interaction.client, isOpen, {
            auto: false,
            channelId: interaction.channel.id
        });

        if (result.same) {
            return interaction.reply({
                content: `⚠️ Status toko **sudah ${isOpen ? 'BUKA' : 'TUTUP'}**.`,
                ephemeral: true
            });
        }

        if (!result.sent) {
            return interaction.reply({
                content: '❌ Gagal mengubah status toko.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `✅ Status toko berhasil diubah menjadi **${isOpen ? 'BUKA' : 'TUTUP'}**.`,
            ephemeral: true
        });
    }
};
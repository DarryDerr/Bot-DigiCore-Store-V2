const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embedMaker } = require('../../utils/embedMaker');
const config = require('../../config');

module.exports = {
    name: 'verify',
    description: 'Kirim panel verifikasi Captcha',
    defaultMemberPermissions: "Administrator",

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '🚫 Hanya admin yang bisa memulai verifikasi.',
                ephemeral: true
            });
        }

        if (interaction.channel.id !== config.VERIFY_CHANNEL_ID) {
            return interaction.reply({
                content: `🚫 Command hanya bisa digunakan di <#${config.VERIFY_CHANNEL_ID}>.`,
                ephemeral: true
            });
        }

        const embed = embedMaker({
            title: '🔐 Verifikasi Member',
            description: `Klik tombol di bawah untuk memverifikasi diri dan mendapatkan role <@&${config.MEMBER_ROLE_ID}>.`,
            color: '#00FF62',
        });

        const button = new ButtonBuilder()
            .setCustomId('verify-open-modal')
            .setLabel('Mulai Verifikasi')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });
    }
};
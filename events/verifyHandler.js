const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { embedMaker } = require('../utils/embedMaker');
const { generateCode } = require('../utils/randomCodeGenerator');
const config = require('../config');
const { error, warn } = require('../utils/logger');

const userCooldown = new Map();

async function sendVerificationLog({ client, user, kode, role, mode = 'Manual' }) {
    try {
        if (!client || !user) return;

        const embed = embedMaker({
            title: 'Verifikasi Berhasil',
            color: '#00FF62',
            thumbnail: user.displayAvatarURL({ dynamic: true }),
            fields: [
                { name: 'User', value: `<@${user.id}> (${user.username})` },
                { name: 'Kode', value: `||${kode}||`, inline: true },
                { name: 'Role', value: role, inline: true },
                { name: 'Mode', value: mode, inline: false },
            ],
        });

        const logChannel = client.channels.cache.get(
            config.LOG_VERIFY_CHANNEL_ID
        );

        if (logChannel?.isTextBased()) {
            await logChannel.send({ embeds: [embed] });
        }
    } catch (err) {
        error('Gagal kirim log verifikasi:', err);
    }
}

async function init(client) {
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isButton() &&
            interaction.customId === 'verify-open-modal') {

            const userId = interaction.user.id;
            const now = Date.now();

            if (userCooldown.has(userId) &&
                now - userCooldown.get(userId) < 3000) return;

            userCooldown.set(userId, now);
            setTimeout(() => userCooldown.delete(userId), 3000);

            const memberRole =
                interaction.guild.roles.cache.get(config.MEMBER_ROLE_ID);

            if (interaction.member.roles.cache.has(memberRole?.id)) {
                return interaction.reply({
                    content: `⚠️ Kamu sudah memiliki role <@&${memberRole.id}>.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const captcha = generateCode(6);

                const modal = new ModalBuilder()
                    .setCustomId(`verify-modal-${captcha}`)
                    .setTitle('Verifikasi Captcha');

                const input = new TextInputBuilder()
                    .setCustomId('captcha-input')
                    .setLabel(`Masukkan kode: ${captcha}`)
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(6)
                    .setMaxLength(6)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(input)
                );

                await interaction.showModal(modal);
            } catch (err) {
                error('Gagal tampilkan modal:', err);
            }
        }

        if (interaction.isModalSubmit() &&
            interaction.customId.startsWith('verify-modal-')) {

            const userInput =
                interaction.fields.getTextInputValue('captcha-input').trim();

            const captcha =
                interaction.customId.split('-')[2];

            const memberRole =
                interaction.guild.roles.cache.get(config.MEMBER_ROLE_ID);

            const safeReply = async (msg) => {
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ ...msg, flags: MessageFlags.Ephemeral });
                    } else {
                        await interaction.followUp({ ...msg, flags: MessageFlags.Ephemeral });
                    }
                } catch (e) {
                    warn('Safe reply gagal:', e.message);
                }
            };

            if (!memberRole)
                return safeReply({ content: '❌ Role MEMBER tidak ditemukan.' });

            if (userInput.toLowerCase() !== captcha.toLowerCase()) {
                return safeReply({
                    content: `❌ Captcha salah!\nKamu menulis: \`${userInput}\`\nKode benar: \`${captcha}\``
                });
            }

            try {
                await interaction.member.roles.add(memberRole);

                const unverifiedRole =
                    interaction.guild.roles.cache.get(config.UNVERIFIED_ROLE_ID);

                if (unverifiedRole &&
                    interaction.member.roles.cache.has(unverifiedRole.id)) {
                    await interaction.member.roles.remove(unverifiedRole);
                }

                await safeReply({
                    content: `✅ Verifikasi berhasil! Kamu sekarang memiliki role <@&${memberRole.id}>.`
                });

                await sendVerificationLog({
                    client: interaction.client,
                    user: interaction.user,
                    kode: captcha,
                    role: `<@&${memberRole.id}>`,
                    mode: 'Manual'
                });

            } catch (err) {
                error('Error saat verifikasi:', err);
                await safeReply({ content: '❌ Terjadi kesalahan.' });
            }
        }
    });
}

module.exports = {
    init,
    sendVerificationLog
};
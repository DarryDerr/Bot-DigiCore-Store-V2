const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');
const { embedMaker } = require('../utils/embedMaker');
const { error } = require('../utils/logger')

module.exports = async (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        const { customId } = interaction;

        if (customId.startsWith('report_resolved_')) {
            try {
                const msg = await interaction.channel.messages.fetch(interaction.message.id);
                const oldEmbed = msg.embeds[0];
                const attachment = msg.attachments.first();

                if (!oldEmbed) {
                    return interaction.reply({ content: '❌ Tidak dapat menemukan embed laporan.', ephemeral: true });
                }

                const resolvedEmbed = EmbedBuilder.from(oldEmbed)
                    .setColor('#00FF62')
                    .setTitle('✅ LAPORAN SELESAI')
                    .setFooter({ text: `Diselesaikan oleh ${interaction.user.tag}` })
                    .setTimestamp();

                await msg.edit({ embeds: [resolvedEmbed], components: [] });

                const pelapor = oldEmbed.fields.find(f => f.name === 'Pelapor')?.value || 'Tidak diketahui';
                const pelaku = oldEmbed.fields.find(f => f.name === 'Pelaku')?.value || 'Tidak diketahui';
                const alasan = oldEmbed.fields.find(f => f.name === 'Alasan')?.value || 'Tidak ada alasan';

                let imageUrl = null;
                if (attachment && attachment.url && attachment.url.startsWith('https://cdn.discordapp.com/')) {
                    imageUrl = attachment.url;
                } else if (oldEmbed.image && oldEmbed.image.url?.startsWith('https://cdn.discordapp.com/')) {
                    imageUrl = oldEmbed.image.url;
                }

                const blacklistEmbed = embedMaker({
                    title: '⛔ USER DIBLACKLIST',
                    description: 'Berikut detail pengguna yang telah dimasukkan ke daftar blacklist:',
                    color: '#FF4C4C',
                    fields: [
                        { name: 'Pelaku', value: pelaku, inline: false },
                        { name: 'Alasan', value: alasan, inline: false },
                        { name: 'Diproses oleh', value: `<@${interaction.user.id}>`, inline: false },
                        { name: 'Laporan dari', value: pelapor, inline: false },
                    ],
                    footer: 'DigiCore Store • Blacklist System',
                    timestamp: true,
                    image: imageUrl || null,
                });

                const blacklistChannel = await interaction.client.channels.fetch(config.BLACKLIST_CHANNEL_ID).catch(() => null);
                if (blacklistChannel) {
                    await blacklistChannel.send({
                        content: `${pelaku} telah masuk daftar **Blacklist**!!\n\n@everyone`,
                        embeds: [blacklistEmbed],
                    });
                }

                await interaction.reply({
                    content: '✅ Laporan telah ditandai selesai dan dikirim ke channel blacklist.',
                    ephemeral: true,
                });
            } catch (err) {
                error(err);
                await interaction.reply({
                    content: '❌ Gagal memproses laporan selesai.',
                    ephemeral: true,
                });
            }
        }

        if (customId.startsWith('report_reply_')) {
            const reporterId = customId.split('_')[2];
            const user = await client.users.fetch(reporterId).catch(() => null);
            if (!user)
                return interaction.reply({ content: '❌ Pelapor tidak ditemukan.', ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId(`report_reply_modal_${reporterId}`)
                .setTitle('💬 Balas Pelapor')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('reply_message')
                            .setLabel('Pesan untuk pelapor')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

            return interaction.showModal(modal);
        }

        if (customId.startsWith('report_delete_')) {
            await interaction.message.delete().catch(() => {});
            return interaction.reply({ content: '🗑️ Laporan telah dihapus.', ephemeral: true });
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        const { customId } = interaction;

        if (!customId.startsWith('report_reply_modal_')) return;
        const reporterId = customId.split('_')[3];
        const message = interaction.fields.getTextInputValue('reply_message');
        const user = await client.users.fetch(reporterId).catch(() => null);

        if (!user) {
            return interaction.reply({
                content: '❌ Tidak dapat mengirim balasan ke pelapor.',
                ephemeral: true,
            });
        }

        const embedDMSend = embedMaker({
            title: '💬 Balasan dari Admin',
            description: `${message}`,
            color: '#0062FF'
        });

        await user.send({ embeds: [embedDMSend] }).catch(() => {});
        await interaction.reply({ content: '✅ Balasan berhasil dikirim ke pelapor.', ephemeral: true });
    });
};
const { embedMaker } = require('../../utils/embedMaker');
const { error } = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    name: 'listproduk',
    description: 'Kirim daftar produk ke channel yang dipilih',
    defaultMemberPermissions: 'ManageMessages',
    options: [
        {
            type: 'channel',
            name: 'channel',
            description: 'Channel tujuan untuk kirim List Produk',
            required: true,
        },
        {
            type: 'string',
            name: 'title',
            description: 'Judul Produk',
            required: true,
        },
        {
            type: 'string',
            name: 'message',
            description: 'Isi List Produk yang akan kamu kirim',
            required: true,
        },
        {
            type: 'role',
            name: 'mention',
            description: 'Role untuk di-mention (opsional)',
            required: false,
        },
        {
            type: 'boolean',
            name: 'use_embed',
            description: 'Kirim sebagai Embed (opsional)',
            required: false,
        },
    ],

    async execute(interaction) {
        // Cek hak akses
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '🚫 Kamu tidak memiliki izin untuk menggunakan perintah ini.',
                ephemeral: true
            });
        }

        const targetChannel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const content = interaction.options.getString('message').replace(/\\n/g, '\n');
        const role = interaction.options.getRole('mention');
        const useEmbed = interaction.options.getBoolean('use_embed') ?? false;

        if (!targetChannel.isTextBased()) {
            return interaction.reply({ content: '❌ Channel tujuan tidak dapat menerima pesan teks.' });
        }

        const botMember = await interaction.guild.members.fetchMe();
        const botPerms = targetChannel.permissionsFor(botMember);
        if (!botPerms || !botPerms.has('SendMessages')) {
            return interaction.reply({ content: '🚫 Saya tidak punya izin untuk mengirim pesan di channel tersebut.' });
        }

        let payload = {};
        if (useEmbed) {
            const embed = embedMaker({
                title: title,
                description: content,
                color: '#0062FF'
            });

            payload.embeds = [embed];
            if (role) payload.content = `<@&${role.id}>`;
        } else {
            payload.content = role ? `<@&${role.id}>\n\n${content}` : content;
        }

        try {
            await targetChannel.send(payload);
            await interaction.reply({ content: `✅ List Produk berhasil dikirim ke ${targetChannel}.` });
        } catch (err) {
            error('Gagal mengirim pengumuman:', err);
            await interaction.reply({ content: '❌ Terjadi kesalahan saat mengirim pengumuman.' });
        }
    },
};
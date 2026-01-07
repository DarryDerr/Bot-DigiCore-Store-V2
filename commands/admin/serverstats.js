const { PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../../config');
const { error } = require('../../utils/logger')

module.exports = {
    name: 'serverstats',
    description: 'Manage statistik Server',
    defaultMemberPermissions: 'ManageGuild',
    subcommands: [
        {
            name: 'create',
            description: 'Membuat statistik Server',
        },
        {
            name: 'delete',
            description: 'Menghapus statistik Server'
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
                
        const { guild, options } = interaction;
        const sub = options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        if (sub === 'create') {
        const existingCategory = guild.channels.cache.find(c => c.name === '╰➤ SERVER STATS' && c.type === ChannelType.GuildCategory);
        if (existingCategory) {
            await interaction.editReply('⚠️ Kategori **SERVER STATS** sudah ada!');
            return;
        }

        try {
            const category = await guild.channels.create({
                name: '╰➤ SERVER STATS',
                type: ChannelType.GuildCategory,
                position: 0,
            });

            const totalMembers = guild.memberCount;
            const users = guild.members.cache.filter(m => !m.user.bot).size;
            const bots = guild.members.cache.filter(m => m.user.bot).size;
            const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
            const boosts = guild.premiumSubscriptionCount;

            await guild.channels.create({
                name: `👥︱Total Members: ${totalMembers}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.Connect] }],
            });
            await guild.channels.create({
                name: `🧍︱Users: ${users}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.Connect] }],
            });
            await guild.channels.create({
                name: `🤖︱Bots: ${bots}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.Connect] }],
            });
                await guild.channels.create({
                name: `🚀︱Boosts: ${boosts}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.Connect] }],
            });

            await interaction.editReply('✅ **Server Stats** berhasil dibuat dan diletakkan di paling atas!');
        } catch (err) {
            error(err);
            await interaction.editReply('❌ Terjadi kesalahan saat membuat Server Stats.');
        }
        }

        else if (sub === 'delete') {
            try {
                const category = guild.channels.cache.find(c => c.name === '╰➤ SERVER STATS' && c.type === ChannelType.GuildCategory);
                if (!category) {
                    await interaction.editReply('❌ Tidak ada kategori **╰➤ SERVER STATS** yang ditemukan.');
                    return;
                }

                for (const channel of category.children.cache.values()) {
                    await channel.delete().catch(() => {});
                }
                await category.delete().catch(() => {});

                await interaction.editReply('🗑️ Semua channel **Server Stats** telah dihapus.');
            } catch (err) {
                error(err);
                await interaction.editReply('❌ Gagal menghapus kategori Server Stats.');
            }
        }
    },
};
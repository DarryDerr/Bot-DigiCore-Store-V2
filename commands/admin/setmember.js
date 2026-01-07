const config = require('../../config');
const { generateCode } = require('../../utils/randomCodeGenerator');
const { log, error } = require('../../utils/logger');
const { sendVerificationLog } = require('../../events/verifyHandler');

module.exports = {
    name: 'setmember',
    description: 'Bypass verifikasi (auto-pass)',
    defaultMemberPermissions: 'Administrator',

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '🚫 Command ini hanya untuk admin.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const unverifiedRole =
            guild.roles.cache.get(config.UNVERIFIED_ROLE_ID);
        const memberRole =
            guild.roles.cache.get(config.MEMBER_ROLE_ID);

        if (!unverifiedRole || !memberRole) {
            return interaction.editReply(
                '❌ Role UNVERIFIED atau MEMBER tidak ditemukan.'
            );
        }

        const targets = guild.members.cache.filter(m =>
            m.roles.cache.has(unverifiedRole.id)
        );

        let success = 0;

        for (const member of targets.values()) {
            try {
                const captcha = generateCode(6);

                await member.roles.remove(unverifiedRole);
                await member.roles.add(memberRole);

                await sendVerificationLog({
                    client: interaction.client,
                    user: member.user,
                    kode: captcha,
                    role: `<@&${memberRole.id}>`,
                    mode: 'Auto (SetMember)'
                });

                success++;
            } catch (err) {
                error(`Gagal bypass ${member.user.tag}`, err);
            }
        }

        log(`[SetMember] ${success} member auto-verified`);

        await interaction.editReply(
            `✅ **Auto-verifikasi selesai**\n👥 Member diproses: **${success}**`
        );
    }
};
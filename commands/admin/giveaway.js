const { createGiveaway, endGiveaway, rerollGiveaway } = require("../../events/giveawayHandler");
const config = require('../../config');

module.exports = {
    name: "giveaway",
    description: "Kelola sistem Giveaway",
    subcommands: [
        {
            name: "create",
            description: "Mulai Giveaway baru",
            options: [
                { type: "string", name: "hadiah", description: "Hadiah Giveaway", required: true },
                { type: "integer", name: "pemenang", description: "Jumlah pemenang", required: true },
                { type: "string", name: "durasi", description: "Durasi (30s, 10m, 1h, 1d)", required: true },
            ],
        },
        {
            name: "end",
            description: "Akhiri Giveaway secara manual",
            options: [
                { type: "string", name: "id", description: "Message ID Giveaway", required: true }
            ],
        },
        {
            name: "reroll",
            description: "Undi ulang pemenang Giveaway",
            options: [
                { type: "string", name: "id", description: "Message ID Giveaway", required: true }
            ],
        },
    ],
    public: true,

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '🚫 Kamu tidak memiliki izin untuk menggunakan perintah ini.',
                ephemeral: true
            });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === "create") {
            return createGiveaway(interaction);
        }

        if (sub === "end") {
            const id = interaction.options.getString("id");

            await endGiveaway(interaction.client, id);

            return interaction.reply({
                content: `🛑 Giveaway dengan ID \`${id}\` telah diakhiri secara manual.`,
                ephemeral: true
            });
        }

        if (sub === "reroll") {
            return rerollGiveaway(interaction);
        }
    },
};
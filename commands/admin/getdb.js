const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require("discord.js");
const config = require("../../config");

module.exports = {
    name: "getdb",
    description: "Ambil backup database (mysqldump-like)",

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.BUYER_ROLE_ID)) {
            return interaction.reply({
                content: "🚫 Kamu tidak memiliki izin.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("getdb-modal")
            .setTitle("Backup Database");

        const endpoint = new TextInputBuilder()
            .setCustomId("db-endpoint")
            .setLabel("ENDPOINT (host:port)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const user = new TextInputBuilder()
            .setCustomId("db-user")
            .setLabel("USERNAME")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const pass = new TextInputBuilder()
            .setCustomId("db-pass")
            .setLabel("PASSWORD")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const name = new TextInputBuilder()
            .setCustomId("db-name")
            .setLabel("DATABASE NAME")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(endpoint),
            new ActionRowBuilder().addComponents(user),
            new ActionRowBuilder().addComponents(pass),
            new ActionRowBuilder().addComponents(name)
        );

        await interaction.showModal(modal);
    }
};

const { ActivityType } = require('discord.js');
const { log } = require("../utils/logger");

module.exports = (client) => {
    const activities = [
        { text: 'DigiCore Store | Harga Terjangkau', type: ActivityType.Watching },
        { text: 'DigiCore Store | Produk Lengkap', type: ActivityType.Watching },
        { text: 'DigiCore Store | Dijamin Amanah', type: ActivityType.Watching },
        { text: 'DigiCore Store | Bergaransi', type: ActivityType.Watching },
    ];

    let index = 0;

    const updateStatus = () => {
        if (!client.user) return;
        const totalMembers = client.guilds.cache.reduce(
            (acc, guild) => acc + guild.memberCount,
            0
        );

        const current = activities[index];
        const displayText = `${current.text} | ${totalMembers} Members`;

        client.user.setPresence({
            status: 'idle',
            activities: [{ name: displayText, type: current.type }],
        });

        log(`[AutoActivity] Status diperbarui → ${displayText}`);
        index = (index + 1) % activities.length;
    };

    updateStatus();
    setInterval(updateStatus, 30 * 1000);
};
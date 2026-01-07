const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { embedMaker } = require("../utils/embedMaker");
const { log } = require("../utils/logger");
const config = require("../config");
const db = require("../utils/sqliteDB");

db.createTable(`
    CREATE TABLE IF NOT EXISTS giveaways (
        messageId TEXT PRIMARY KEY,
        channelId TEXT,
        prize TEXT,
        winners INTEGER,
        endTime INTEGER,
        hostId TEXT,
        ended INTEGER
    )
`);

db.createTable(`
    CREATE TABLE IF NOT EXISTS participants (
        messageId TEXT,
        userId TEXT
    )
`);

db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_participant 
    ON participants (messageId, userId)
`);

function getGiveaway(id) {
    return db.get("SELECT * FROM giveaways WHERE messageId = ?", [id]);
}

function saveGiveaway(gw) {
    db.run(
        `INSERT OR REPLACE INTO giveaways 
        (messageId, channelId, prize, winners, endTime, hostId, ended)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [gw.messageId, gw.channelId, gw.prize, gw.winners, gw.endTime, gw.hostId, gw.ended ? 1 : 0]
    );
}

function deleteGiveaway(id) {
    db.run("DELETE FROM giveaways WHERE messageId = ?", [id]);
    db.run("DELETE FROM participants WHERE messageId = ?", [id]);
}

function addParticipant(messageId, userId) {
    try {
        db.run("INSERT INTO participants (messageId, userId) VALUES (?, ?)", [messageId, userId]);
        return true;
    } catch (err) {
        return false;
    }
}

function removeParticipant(messageId, userId) {
    db.run("DELETE FROM participants WHERE messageId = ? AND userId = ?", [messageId, userId]);
}

function getParticipants(messageId) {
    return db.all("SELECT userId FROM participants WHERE messageId = ?", [messageId]).map(x => x.userId);
}

function getParticipantCount(messageId) {
    return db.get(
        "SELECT COUNT(*) as total FROM participants WHERE messageId = ?",
        [messageId]
    )?.total || 0;
}

function parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;

    const n = parseInt(match[1]);
    const u = match[2].toLowerCase();

    return u === "s" ? n * 1000
        : u === "m" ? n * 60000
            : u === "h" ? n * 3600000
                : u === "d" ? n * 86400000
                    : null;
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    if (d > 0) return `${d} hari ${h} jam`;
    if (h > 0) return `${h} jam ${m} menit`;
    if (m > 0) return `${m} menit ${sec} detik`;
    return `${sec} detik`;
}

function formatCountdown(ms) {
    if (ms < 0) ms = 0;

    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    return `${d}d ${h}h ${m}m ${sec}s`;
}

const MAX_CHUNK_MS = 24 * 60 * 60 * 1000;
const EMBED_UPDATE_INTERVAL_MS = 60 * 1000;

async function updateEmbedCountdown(msg, gw) {
    try {
        const participants = getParticipantCount(gw.messageId);

        const embed = embedMaker({
            title: "🎉 GIVEAWAY DIMULAI 🎉",
            description: "Gabung giveaway melalui menu di bawah!",
            color: "#0062FF",
            fields: [
                { name: "🎁 Hadiah", value: `\`${gw.prize}\`` },
                { name: "🏆 Pemenang", value: `\`${gw.winners}\`` },
                {
                    name: "👥 Peserta",
                    value: `\`${participants}\` orang`
                },
                {
                    name: "⏰ Berakhir Dalam",
                    value: `\`${formatCountdown(gw.endTime - Date.now())}\``
                },
                { name: "👤 Host", value: `<@${gw.hostId}>` }
            ],
            image: config.GIVEAWAY_GIF
        });

        await msg.edit({ embeds: [embed] }).catch(() => null);
    } catch { }
}

function setupCollector(client, msg, gw) {
    const remaining = gw.endTime - Date.now();
    if (remaining <= 0) {
        setImmediate(() => endGiveaway(client, gw.messageId));
        return;
    }

    const chunk = Math.min(remaining, MAX_CHUNK_MS);

    const collector = msg.createMessageComponentCollector({ time: chunk });

    const interval = setInterval(async () => {
        try {
            const latest = getGiveaway(gw.messageId);
            if (!latest || latest.ended) {
                clearInterval(interval);
                try { collector.stop(); } catch (e) { }
                return;
            }
            await updateEmbedCountdown(msg, latest);
        } catch (e) {
            // ignore
        }
    }, EMBED_UPDATE_INTERVAL_MS);

    collector.on("collect", async i => {
        const latest = getGiveaway(msg.id);
        if (!latest || latest.ended) {
            return i.reply({ content: "❌ Giveaway sudah selesai.", ephemeral: true });
        }

        if (i.values[0] === "join") {
            if (!addParticipant(msg.id, i.user.id))
                return i.reply({ content: "⚠ Kamu sudah join sebelumnya!", ephemeral: true });

            await updateEmbedCountdown(msg, latest);
            return i.reply({ content: "✅ Kamu berhasil join!", ephemeral: true });
        }

        if (i.values[0] === "cancel") {
            removeParticipant(msg.id, i.user.id);

            await updateEmbedCountdown(msg, latest);
            return i.reply({ content: "❌ Kamu keluar dari giveaway.", ephemeral: true });
        }
    });

    collector.on("end", async (collected, reason) => {
        clearInterval(interval);

        const latest = getGiveaway(msg.id);
        if (!latest) return;

        const remainAfter = latest.endTime - Date.now();
        if (remainAfter <= 0) {
            return endGiveaway(client, msg.id);
        } else {
            const channel = await client.channels.fetch(latest.channelId).catch(() => null);
            if (!channel) return;
            const freshMsg = await channel.messages.fetch(latest.messageId).catch(() => null);
            if (!freshMsg) return;
            setupCollector(client, freshMsg, latest);
        }
    });
}

async function createGiveaway(interaction) {
    const hadiah = interaction.options.getString("hadiah");
    const pemenang = interaction.options.getInteger("pemenang");
    const durasiMs = parseDuration(interaction.options.getString("durasi"));

    if (!durasiMs)
        return interaction.reply({ content: "❌ Durasi tidak valid!", ephemeral: true });

    const host = interaction.user;
    const endTime = Date.now() + durasiMs;

    const endUnix = Math.floor(endTime / 1000);
    const embed = embedMaker({
        title: "🎉 GIVEAWAY DIMULAI 🎉",
        description: "Gabung giveaway melalui menu di bawah!",
        color: "#0062FF",
        fields: [
            { name: "🎁 Hadiah", value: `\`${hadiah}\`` },
            { name: "🏆 Pemenang", value: `\`${pemenang}\`` },
            { name: "⏰ Berakhir Dalam", value: `\`${formatCountdown(durasiMs)}\`` },
            { name: "👤 Host", value: host.toString() },
        ],
        image: config.GIVEAWAY_GIF,
    });

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("giveaway_action")
            .setPlaceholder("Pilih aksi...")
            .addOptions([
                { label: "Gabung Giveaway 🎉", value: "join" },
                { label: "Keluar Giveaway ❌", value: "cancel" },
            ])
    );

    const msg = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
    });

    saveGiveaway({
        messageId: msg.id,
        channelId: msg.channel.id,
        prize: hadiah,
        winners: pemenang,
        endTime,
        hostId: host.id,
        ended: 0
    });

    setupCollector(interaction.client, msg, {
        messageId: msg.id,
        channelId: msg.channel.id,
        prize: hadiah,
        winners: pemenang,
        endTime,
        hostId: host.id,
        ended: 0
    });
}

async function endGiveaway(client, messageId) {
    const gw = getGiveaway(messageId);
    if (!gw || gw.ended) return;

    const participants = getParticipants(messageId);
    const shuffled = participants.slice().sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, gw.winners);

    saveGiveaway({ ...gw, ended: 1 });

    const channel = await client.channels.fetch(gw.channelId).catch(() => null);
    if (!channel) return;

    try {
        const originalMsg = await channel.messages.fetch(gw.messageId).catch(() => null);
        if (originalMsg) await originalMsg.delete().catch(() => { });
    } catch (e) {
        // ignore
    }

    const embed = embedMaker({
        title: "🎉 GIVEAWAY SELESAI 🎉",
        description: winners.length
            ? `Selamat kepada para pemenang! Silakan DM <@${gw.hostId}> untuk claim hadiah!`
            : "❌ Tidak ada peserta.",
        fields: [
            { name: "🎁 Hadiah", value: `\`${gw.prize}\`` },
            {
                name: "🏆 Pemenang",
                value: winners.length ? winners.map(x => `<@${x}>`).join(", ") : "-"
            },
            { name: "👤 Host", value: `<@${gw.hostId}>` }
        ],
        footer: {
            text: `Giveaway ID: ${gw.messageId}`
        },
        image: config.GIVEAWAY_WINNER_GIF,
    });

    if (winners.length) channel.send({ content: "@everyone", embeds: [embed] }).catch(() => null);
    else channel.send({ embeds: [embed] }).catch(() => null);

    saveGiveaway({ ...gw, ended: 1 });

    log(`[Giveaway] Ended: ${messageId} | winners: ${winners.join(", ")}`);
}

async function rerollGiveaway(interaction) {
    const id = interaction.options.getString("id");
    const gw = getGiveaway(id);

    if (!gw)
        return interaction.reply({
            content: "❌ Giveaway tidak ditemukan!",
            ephemeral: true
        });

    if (!gw.ended)
        return interaction.reply({
            content: "⚠ Giveaway belum selesai.",
            ephemeral: true
        });

    const participants = getParticipants(id);
    if (!participants.length)
        return interaction.reply({ content: "❌ Tidak ada peserta!", ephemeral: true });

    const shuffled = participants.slice().sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, gw.winners);

    const embed = embedMaker({
        title: "🎉 REROLL GIVEAWAY 🎉",
        description: "Pemenang baru telah dipilih!",
        fields: [
            { name: "🎁 Hadiah", value: gw.prize },
            { name: "👥 Total Peserta", value: `${participants.length}` },
            { name: "🏆 Pemenang Baru", value: winners.map(x => `<@${x}>`).join(", ") },
        ],
        image: config.GIVEAWAY_WINNER_GIF,
    });

    return interaction.reply({ content: "@everyone", embeds: [embed] });
}

async function restoreGiveaways(client) {
    const active = db.all("SELECT * FROM giveaways WHERE ended = 0");
    for (const gw of active) {
        const channel = await client.channels.fetch(gw.channelId).catch(() => null);
        if (!channel) {
            deleteGiveaway(gw.messageId);
            continue;
        }

        const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
        if (!msg) {
            deleteGiveaway(gw.messageId);
            continue;
        }

        const remaining = gw.endTime - Date.now();
        if (remaining <= 0) {
            endGiveaway(client, gw.messageId);
            continue;
        }

        await updateEmbedCountdown(msg, gw);

        setupCollector(client, msg, gw);
    }

    log("[Giveaway] Auto-Restore Completed");
}

module.exports = {
    createGiveaway,
    endGiveaway,
    rerollGiveaway,
    restoreGiveaways
};
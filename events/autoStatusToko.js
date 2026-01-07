const { embedMaker } = require('../utils/embedMaker');
const { log, error } = require('../utils/logger');
const config = require('../config');
const db = require("../utils/sqliteDB");

db.createTable(`
    CREATE TABLE IF NOT EXISTS store_status (
        id INTEGER PRIMARY KEY,
        isOpen INTEGER,
        messageId TEXT,
        updatedAt INTEGER
    )
`);

function getStatusData() {
    return db.get("SELECT isOpen, messageId FROM store_status WHERE id = 1");
}

function saveStatus(isOpen, messageId) {
    db.run(
        `INSERT OR REPLACE INTO store_status (id, isOpen, messageId, updatedAt)
         VALUES (1, ?, ?, ?)`,
        [isOpen ? 1 : 0, messageId, Date.now()]
    );
}

const openDescription = `
DigiCore Store siap melayani semua kebutuhan kamu mulai sekarang.

📌 **Cara Order**
• Order via Private Message
• Atau buat tiket di channel <#1434207488085070028>

⏰ **Jam Operasional**
Sesuai jadwal yang telah ditentukan di <#1434244127389908992>

Terima kasih atas kepercayaannya 🙏
`;

const closeDescription = `
Saat ini toko sedang tidak melayani order.

📌 **Catatan**
• Semua order akan diproses saat toko buka kembali
• Jadwal buka mengikuti jam operasional di <#1434244127389908992>

Terima kasih telah menunggu 🙏
`;

async function sendStatus(client, isOpen, { auto = false, channelId } = {}) {
    try {
        const lastData = getStatusData();

        if (lastData && Boolean(lastData.isOpen) === isOpen) {
            log(`[StatusToko] Skip (${isOpen ? 'BUKA' : 'TUTUP'}) - status sama`);
            return { sent: false, same: true };
        }

        const channel = await client.channels.fetch(
            channelId || config.STATUS_STORE_CHANNEL_ID
        );

        if (!channel) {
            error('[StatusToko] Channel tidak ditemukan!');
            return { sent: false };
        }

        if (lastData?.messageId) {
            try {
                const oldMsg = await channel.messages.fetch(lastData.messageId);
                if (oldMsg) await oldMsg.delete();
            } catch {
                log('[StatusToko] Pesan lama tidak ditemukan / sudah terhapus');
            }
        }

        const embed = embedMaker({
            title: isOpen
                ? 'DIGICORE STORE TELAH BUKA'
                : 'DIGICORE STORE TELAH TUTUP',
            description: isOpen ? openDescription : closeDescription,
            image: isOpen ? config.STATUS_OPEN_GIF : config.STATUS_CLOSE_GIF,
            color: isOpen ? '#00FF62' : '#FF4C4C',
            footer: auto
                ? 'DigiCore Store | Status Otomatis'
                : 'DigiCore Store',
            timestamp: true,
        });

        const message = await channel.send({
            content: '@everyone',
            embeds: [embed],
            allowedMentions: { parse: ['everyone'] },
        });

        saveStatus(isOpen, message.id);

        log(`[StatusToko] Status dikirim → ${isOpen ? 'BUKA' : 'TUTUP'} (${auto ? 'AUTO' : 'MANUAL'})`);
        return { sent: true };

    } catch (err) {
        error('[StatusToko] Gagal mengirim status:', err);
        return { sent: false };
    }
}

module.exports = {
    sendStatus
};
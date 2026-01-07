const config = require('../config');
const { embedMaker } = require("../utils/embedMaker");
const { log, error } = require('../utils/logger');

module.exports = (client) => {
  const sendOnlineStatus = async () => {
    try {
      if (!client.user) return;

      const channel = await client.channels.fetch(config.STATUS_BOT_CHANNEL_ID).catch(err => {
        error('[StatusBot] Gagal fetch channel untuk ONLINE:', err);
        return null;
      });
      if (!channel) return;

      const embed = embedMaker({
        title: 'BOT ONLINE',
        description: '_**DigiCore Store Bot sekarang aktif dan siap digunakan**_',
        color: '#00FF62'
      });

      log('[StatusBot] Mengirim embed status ONLINE...');
      await channel.send({ embeds: [embed] });
    } catch (err) {
      error('[StatusBot] Error saat mengirim status ONLINE:', err);
    }
  };

  client.on('shardDisconnect', async () => {
    try {
      const channel = await client.channels.fetch(config.STATUS_BOT_CHANNEL_ID).catch(err => {
        error('[StatusBot] Gagal fetch channel saat SHARD_DISCONNECT:', err);
        return null;
      });
      if (!channel) return;

      const embed = embedMaker({
        title: 'KONEKSI TERPUTUS',
        description: '_**Bot kehilangan koneksi dengan Discord.**_',
        color: '#FF4C4C'
      });

      log('[StatusBot] Mengirim embed status KONEKSI TERPUTUS...');
      await channel.send({ embeds: [embed] });
    } catch (err) {
      error('[StatusBot] Error saat mengirim status KONEKSI TERPUTUS:', err);
    }
  });

  const sendOfflineStatus = async (reason = 'exit') => {
    try {
      const channel = await client.channels.fetch(config.STATUS_BOT_CHANNEL_ID).catch(err => {
        error('[StatusBot] Gagal fetch channel saat OFFLINE:', err);
        return null;
      });
      if (!channel) return;

      const embed = embedMaker({
        title: 'BOT OFFLINE',
        description: `_**DigiCore Store Bot telah dimatikan.**_\n*Alasan:*\n\`${reason}\``,
        color: '#FF4C4C'
      });

      log('[StatusBot] Mengirim embed status OFFLINE...');
      await channel.send({ embeds: [embed] });
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      error('[StatusBot] Error saat mengirim status OFFLINE:', err);
    }
  };

  const shutdownHandler = async (reason) => {
    try {
      log(`[StatusBot] Shutdown triggered by: ${reason}`);
      await sendOfflineStatus(reason);
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      error('[StatusBot] Gagal saat shutdown:', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('exit', () => shutdownHandler('process exit'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));

  return { sendOnlineStatus };
};
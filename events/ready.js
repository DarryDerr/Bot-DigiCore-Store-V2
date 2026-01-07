const chalk = require("chalk");
const config = require("../config");
const { fetchInitialInvites } = require("../events/inviteTrackerHandler");
const { restoreGiveaways } = require("../events/giveawayHandler");
const { updateServerStats } = require("./updateServerStats");
const { log, success } = require("../utils/logger");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    success(chalk.green(`[BOT]`), `Logged in as ${client.user.tag}`);

    if (!client.invites) client.invites = new Map();

    await fetchInitialInvites(client);
    await restoreGiveaways(client);

    require("../handlers/autoActivityHandler")(client);

    const botStatusMonitor = require("../events/botStatusMonitor")(client);
    if (botStatusMonitor?.sendOnlineStatus) {
      await botStatusMonitor.sendOnlineStatus();
    }

    for (const [, guild] of client.guilds.cache) await updateServerStats(guild);
    setInterval(async () => {
      for (const [, guild] of client.guilds.cache) await updateServerStats(guild);
    }, 60 * 1000);

    log('[ServerStats] Auto update server stats dijalankan setiap 1 menit!');

    const verifyHandler = require("./verifyHandler");
    verifyHandler.init(client);
  },
};
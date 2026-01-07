const { ChannelType } = require("discord.js");
const { log, error } = require("../utils/logger");

async function updateServerStats(guild) {
  try {
    const category = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildCategory &&
        ch.name.toLowerCase().includes("server stats")
    );
    if (!category) return;

    const total = guild.memberCount;

    const members = guild.members.cache;

    const bots = members.filter((m) => m.user.bot).size;
    const users = total - bots;

    const online = members.filter(
      (m) =>
        m.presence &&
        ["online", "idle", "dnd"].includes(m.presence.status)
    ).size;

    const boosts = guild.premiumSubscriptionCount || 0;

    const children =
      category.children?.cache ||
      guild.channels.cache.filter((ch) => ch.parentId === category.id);

    const updates = [
      { prefix: "👥", label: `Total Members: ${total}` },
      { prefix: "🧍", label: `Users: ${users}` },
      { prefix: "🤖", label: `Bots: ${bots}` },
      { prefix: "🟢", label: `Online: ${online}` },
      { prefix: "🚀", label: `Boosts: ${boosts}` },
    ];

    for (const { prefix, label } of updates) {
      const newName = `${prefix}︱${label}`;
      const ch = children.find((c) => c.name.startsWith(prefix));

      if (ch && ch.name !== newName) {
        await ch.setName(newName).catch(() => {});
      }
    }

    log(`[ServerStats] Updated successfully for ${guild.name}`);
  } catch (err) {
    error("[ServerStats] Error updating stats:", err);
  }
}

module.exports = { updateServerStats };
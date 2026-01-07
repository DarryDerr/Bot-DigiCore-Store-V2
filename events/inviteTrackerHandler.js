const { embedMaker } = require("../utils/embedMaker");
const { log, error, warn } = require("../utils/logger");
const sqlite = require("../utils/sqliteDB");

sqlite.createTable(`
  CREATE TABLE IF NOT EXISTS invites (
    inviter_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    PRIMARY KEY (inviter_id, member_id)
  );
`);

function getColorForAction(action) {
  return ({
    join: "#00FF62",
    leave: "#FF4C4C"
  })[action] || "#0062FF";
}

async function fetchInitialInvites(client) {
  if (!client.invites) client.invites = new Map();

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const invites = await guild.invites.fetch();
      client.invites.set(
        guildId,
        new Map(invites.map(inv => [inv.code, inv.uses]))
      );
    } catch (err) {
      warn(`[InviteTracker] Gagal fetch undangan di ${guild.name}: ${err.message}`);
    }
  }

  log("[InviteTracker] Cache undangan berhasil diperbarui.");
}

async function handleMemberInvitedAdd(client, member, config) {
  try {
    const guildId = member.guild.id;
    const channel = member.guild.channels.cache.get(config.INVITE_CHANNEL_ID);
    if (!channel) return;

    const cachedInvites = client.invites.get(guildId);
    const newInvites = await member.guild.invites.fetch();

    const usedInvite = newInvites.find(inv =>
      cachedInvites && inv.uses > (cachedInvites.get(inv.code) || 0)
    );

    client.invites.set(
      guildId,
      new Map(newInvites.map(inv => [inv.code, inv.uses]))
    );

    let inviter = usedInvite?.inviter || null;

    if (inviter?.id) {
      sqlite.run(
        `INSERT OR IGNORE INTO invites (inviter_id, member_id) VALUES (?, ?)`,
        [inviter.id, member.id]
      );
    }

    const total = inviter
      ? sqlite.get(
        `SELECT COUNT(*) AS total FROM invites WHERE inviter_id = ?`,
        [inviter.id]
      ).total
      : usedInvite?.uses || 0;

    const embed = embedMaker({
      title: `Member Baru di ${member.guild.name}`,
      description: inviter
        ? `**➣ Welcome :** <@${member.id}>\n**➣ Invite By :** <@${inviter.id}>\n**➣ Total Invite :** ${total}x\n**➣ Total Member :** ${member.guild.memberCount}`
        : `**${member.user.username}** bergabung, namun saya tidak dapat mendeteksi siapa yang mengundang mereka.`,
      color: getColorForAction("join"),
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
    });

    await channel.send({ embeds: [embed] });

  } catch (err) {
    error("[InviteTracker] Error saat member join:", err);
  }
}

async function handleMemberInvitedRemove(client, member, config) {
  try {
    const channel = member.guild.channels.cache.get(config.INVITE_CHANNEL_ID);
    if (!channel) return;

    const row = sqlite.get(
      `SELECT inviter_id FROM invites WHERE member_id = ?`,
      [member.id]
    );

    const inviterId = row?.inviter_id || null;

    if (inviterId) {
      sqlite.run(
        `DELETE FROM invites WHERE member_id = ?`,
        [member.id]
      );
    }

    const total = inviterId
      ? sqlite.get(
        `SELECT COUNT(*) AS total FROM invites WHERE inviter_id = ?`,
        [inviterId]
      ).total
      : 0;

    let inviterUser = null;

    if (inviterId) {
      inviterUser = await member.guild.members.fetch(inviterId).catch(() => null);
    }

    const embed = embedMaker({
      title: `Member Keluar dari ${member.guild.name}`,
      description: inviterId
        ? `**➣ Goodbye :** <@${member.id}>\n**➣ Invite By :** <@${inviterId}>\n**➣ Total Invite :** ${total}x\n**➣ Total Member :** ${member.guild.memberCount}`
        : `**${member.user.username}** keluar, namun saya tidak memiliki catatan siapa yang mengundang mereka.`,
      color: getColorForAction("leave"),
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
    });

    await channel.send({ embeds: [embed] });

  } catch (err) {
    error("[InviteTracker] Error saat member keluar:", err);
  }
}

module.exports = {
  fetchInitialInvites,
  handleMemberInvitedAdd,
  handleMemberInvitedRemove
};
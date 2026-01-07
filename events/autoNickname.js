const { Events } = require('discord.js');
const config = require('../config');
const { log, error } = require('../utils/logger');

/**
 * @param {GuildMember} member
 */
async function updateNickname(member) {
  try {
    const rolePrefixes = config.RolePrefixes || {};
    const memberRoleIds = member.roles.cache.map(r => r.id);

    let matchedPrefix = null;
    for (const roleId of Object.keys(rolePrefixes)) {
      if (memberRoleIds.includes(roleId)) {
        matchedPrefix = rolePrefixes[roleId];
        break;
      }
    }

    const displayName = member.user.globalName ?? member.user.username;
    const currentNickname = member.nickname;
    const allPrefixes = Object.values(rolePrefixes);
    const isManualNickname =
      currentNickname &&
      !allPrefixes.some(p => currentNickname.startsWith(p));

    if (isManualNickname) return;

    if (matchedPrefix) {
      const newNickname = `${matchedPrefix}${displayName}`;
      if (currentNickname !== newNickname) {
        await member.setNickname(newNickname).catch(() => { });
        log(`[AutoNickname] ${member.user.tag} → ${newNickname}`);
      }
    } else {
      if (currentNickname) {
        await member.setNickname(null).catch(() => { });
        log(`[AutoNickname] ${member.user.tag} → reset nickname`);
      }
    }
  } catch (err) {
    error('[AutoNickname] updateNickname error:', err);
  }
}

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    try {
      const oldRoles = oldMember.roles.cache.map(r => r.id).sort().join(',');
      const newRoles = newMember.roles.cache.map(r => r.id).sort().join(',');
      const roleChanged = oldRoles !== newRoles;
      const oldDisplay =
        oldMember.user.globalName ?? oldMember.user.username;
      const newDisplay =
        newMember.user.globalName ?? newMember.user.username;
      const nameChanged = oldDisplay !== newDisplay;

      if (!roleChanged && !nameChanged) return;

      await updateNickname(newMember);
    } catch (err) {
      error('[AutoNickname] GuildMemberUpdate error:', err);
    }
  },
};
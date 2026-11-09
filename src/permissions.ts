import type { Guild, GuildBasedChannel, GuildMember } from 'discord.js'

const TTS_ROLE_NAME = 'Text to Speech'

export const ensureTTSRole = async (guild: Guild) => {
  let role = guild.roles.cache.find((role) => role.name === TTS_ROLE_NAME)
  if (!role) role = await guild.roles.create({ name: TTS_ROLE_NAME, permissions: [] })

  return role
}

export const hasTTSPermissions = (member: GuildMember, channel: GuildBasedChannel) => {
  const role = member.guild.roles.cache.find((role) => role.name === TTS_ROLE_NAME)
  if (!role) return false
  if (member.roles.cache.has(role.id)) return true

  const permissions = channel.isThread()
    ? channel.parent?.permissionOverwrites
    : channel.permissionOverwrites
  return permissions?.cache.has(role.id) || false
}

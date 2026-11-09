import { Client, GatewayIntentBits, OAuth2Scopes, PermissionFlagsBits } from 'discord.js'
import { handleInteraction, initCommands } from './discord/commands/index.ts'
import { playInChannel } from './discord/play-in-channel.ts'
import { DISCORD_TOKEN } from './environment.ts'
import { namespace } from './log.ts'
import { ensureTTSRole, hasTTSPermissions } from './permissions.ts'
import { createSSML, synthesizeSpeech } from './synthesize-speech.ts'
import { getUserSettings } from './user-settings.ts'

const log = namespace('discord')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
})

client.once('clientReady', async (readyClient) => {
  const invite = readyClient.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: [
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.ManageRoles,
    ],
  })

  log(invite)

  try {
    await initCommands(readyClient)

    for (const guild of readyClient.guilds.cache.values()) {
      await ensureTTSRole(guild)
    }

    log('bot initialized')
  } catch (error) {
    console.error('Failed to initialize bot:', error)
  }
})

client.on('guildCreate', (guild) => ensureTTSRole(guild).catch(console.error))

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.inGuild() || !message.content) return

  const channel = message.member?.voice.channel
  if (!channel) return

  try {
    const isPermitted = hasTTSPermissions(message.member, message.channel)
    if (!isPermitted) return

    log('message from user: "%s"', message.member.displayName)

    const settings = await getUserSettings(message.author.id)
    const stream = await synthesizeSpeech(
      await createSSML(message.content, message.guild),
      settings.voice
    )
    await playInChannel(channel, stream)
  } catch (error) {
    console.error(error)
  }
})

client.on('interactionCreate', handleInteraction)

client.login(DISCORD_TOKEN).catch((error) => {
  console.error(error)
  process.exit(1)
})

import type { VoiceId } from '@aws-sdk/client-polly'
import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  OAuth2Scopes,
  PermissionFlagsBits,
} from 'discord.js'
import { playInChannel } from './discord/play-in-channel.ts'
import { DISCORD_TOKEN, TTS_CHANNELS } from './environment.ts'
import { namespace } from './log.ts'
import { createSSML, synthesizeSpeech } from './synthesize-speech.ts'
import { getUserSettings, setUserSettings } from './user-settings.ts'

const log = namespace('discord')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
})

client.on('clientReady', () => {
  const invite = client.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: [
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.UseApplicationCommands,
    ],
  })

  log(invite)
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  if (!TTS_CHANNELS!.includes(message.channel.id)) return
  if (!message.content) log('message content: "%s"', message.content)

  const channel = message.member?.voice.channel
  if (!channel) return

  log('message from user: "%s"', message.member.displayName)

  try {
    const settings = await getUserSettings(message.member!.id)
    const stream = await synthesizeSpeech(
      await createSSML(message.content, message.guild!),
      settings.voice
    )
    await playInChannel(channel, stream)
  } catch (error) {
    console.error(error)
  }
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  log('slash command activated', interaction.commandName)

  if (interaction.commandName === 'voice') {
    const voice = interaction.options.getString('name', true) as VoiceId
    await setUserSettings(interaction.user.id, 'voice', voice)
    interaction.reply({ content: `${voice} online!`, flags: MessageFlags.Ephemeral })
  }
})

client.login(DISCORD_TOKEN).catch((error) => {
  console.error(error)
  process.exit(1)
})

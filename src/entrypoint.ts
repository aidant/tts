import 'source-map-support/register.js'
import { Client, Intents, Permissions } from 'discord.js'
import { DISCORD_TOKEN, TTS_CHANNELS } from './environment.js'
import { playInChannel } from './discord/play-in-channel.js'
import { synthesizeSpeech } from './synthesize-speech.js'
import { getUserSettings, setUserSettings } from './user-settings.js'
import { namespace } from './log.js'

const log = namespace('discord')

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
})

client.on('ready', () => {
  const invite = client.generateInvite({
    scopes: ['bot', 'applications.commands'],
    permissions: [Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK, Permissions.FLAGS.USE_APPLICATION_COMMANDS],
  })

  log(invite)
})

client.on('messageCreate', async message => {
  if (message.author.bot) return
  if (!TTS_CHANNELS!.includes(message.channel.id)) return
  if (!message.content)

  log('message content: "%s"', message.content)

  const channel = message.member?.voice.channel
  if (!channel) return

  try {
    const settings = await getUserSettings(message.member!.id)
    const stream = await synthesizeSpeech(message.content, settings.voice)
    await playInChannel(channel, stream)
  } catch (error) {
    console.error(error)
  }
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return

  log('slash command activated', interaction.commandName)

  if (interaction.commandName === 'voice') {
    const voice = interaction.options.getString('name', true)
    await setUserSettings(interaction.user.id, 'voice', voice)
    interaction.reply({ content: `${voice} online!`, ephemeral: true })
  }
})

client.login(DISCORD_TOKEN).catch(error => {
  console.error(error)
  process.exit(1)
})

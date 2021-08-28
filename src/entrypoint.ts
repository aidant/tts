import { Client, Intents, Permissions } from 'discord.js'
import { DISCORD_TOKEN } from './environment.js'
import { playInChannel } from './play-in-channel.js'
import { listVoices, synthesizeSpeech } from './synthesize-speech.js'
import { getUserSettings, setUserSettings } from './user-settings.js'

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
})

client.on('ready', () => {
  console.log(
    client.generateInvite({
      scopes: ['bot', 'applications.commands'],
      permissions: [Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK, Permissions.FLAGS.USE_APPLICATION_COMMANDS],
    })
  )
})

client.on('messageCreate', async message => {
  if (message.author.bot) return

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

  if (interaction.commandName === 'voice') {
    const voice = interaction.options.getString('name', true)
    await setUserSettings(interaction.user.id, 'voice', voice)
    interaction.reply(`${voice} online!`)
  }
})

client.login(DISCORD_TOKEN).catch(error => {
  console.error(error)
  process.exit(1)
})

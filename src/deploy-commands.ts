import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { DISCORD_TOKEN } from './environment.js'
import { listVoices } from './synthesize-speech.js'

export const deployCommands = async () => {
  const voices = await listVoices()

  const commands = [
    new SlashCommandBuilder()
      .setName('voice')
      .setDescription('Choose a voice of your own!')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('The name of the voice.')
          .setRequired(true)
          .addChoices(
            voices
              .sort((a, b) => (a.Name! > b.Name! ? 1 : -1))
              .map(
                (voice) => [`${voice.Name} - ${voice.LanguageName}`, voice.Name] as [string, string]
              )
          )
      ),
  ].map((command) => command.toJSON())

  const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN)

  const applicationId = await rest
    .get(Routes.oauth2CurrentApplication())
    .then((response: any) => response.id)

  // console.dir(commands, { depth: null })

  return rest.put(Routes.applicationCommands(applicationId), { body: commands })
}

deployCommands()
  .then((response) => console.dir(response, { depth: null }))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

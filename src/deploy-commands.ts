import { Gender } from '@aws-sdk/client-polly'
import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { APIApplicationCommandOptionChoice, Routes } from 'discord-api-types/v10'
import { DISCORD_TOKEN } from './environment.js'
import { listVoices } from './synthesize-speech.js'

export const deployCommands = async () => {
  const voices = await listVoices()

  const groups: Partial<
    Record<
      Lowercase<Gender>,
      Partial<
        Record<'english' | 'romance' | 'international', APIApplicationCommandOptionChoice<string>[]>
      >
    >
  > = {}

  for (const voice of voices) {
    const gender = voice.Gender!.toLowerCase() as Lowercase<Gender>

    const category =
      (
        {
          en: 'english',

          es: 'romance',
          pt: 'romance',
          fr: 'romance',
          it: 'romance',
          ro: 'romance',
          ca: 'romance',
          gl: 'romance',
          oc: 'romance',
          sc: 'romance',
        } as const
      )[voice.LanguageCode!.split('-')[0]] || ('international' as const)

    groups[gender] ??= {}
    groups[gender]![category] ??= []
    groups[gender]![category]!.push({
      name: `${voice.Name} - ${voice.LanguageName}`,
      value: voice.Name as string,
    })

    groups[gender]![category] = groups[gender]![category]!.sort((a, b) =>
      a.value! > b.value! ? 1 : -1
    )
  }

  const commands = [
    new SlashCommandBuilder()
      .setName('voice')
      .setDescription('Choose a voice of your own!')
      .addSubcommandGroup((female) =>
        female
          .setName('female')
          .setDescription('Choose a voice of your own!')
          .addSubcommand((english) =>
            english
              .setName('english')
              .setDescription('Choose a voice of your own!')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the voice.')
                  .setRequired(true)
                  .addChoices(...groups.female!.english!)
              )
          )
          .addSubcommand((romance) =>
            romance
              .setName('romance')
              .setDescription('Choose a voice of your own!')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the voice.')
                  .setRequired(true)
                  .addChoices(...groups.female!.romance!)
              )
          )
          .addSubcommand((international) =>
            international
              .setName('international')
              .setDescription('Choose a voice of your own!')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the voice.')
                  .setRequired(true)
                  .addChoices(...groups.female!.international!)
              )
          )
      )
      .addSubcommandGroup((male) =>
        male
          .setName('male')
          .setDescription('Choose a voice of your own!')
          .addSubcommand((english) =>
            english
              .setName('english')
              .setDescription('Choose a voice of your own!')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the voice.')
                  .setRequired(true)
                  .addChoices(...groups.male!.english!)
              )
          )
          .addSubcommand((romance) =>
            romance
              .setName('romance')
              .setDescription('Choose a voice of your own!')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the voice.')
                  .setRequired(true)
                  .addChoices(...groups.male!.romance!)
              )
          )
          .addSubcommand((international) =>
            international
              .setName('international')
              .setDescription('Choose a voice of your own!')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the voice.')
                  .setRequired(true)
                  .addChoices(...groups.male!.international!)
              )
          )
      ),
  ].map((command) => command.toJSON())

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN)

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

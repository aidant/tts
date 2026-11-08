import type { Voice, VoiceId } from '@aws-sdk/client-polly'
import { SlashCommandBuilder } from '@discordjs/builders'
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js'
import { MessageFlags } from 'discord.js'
import MiniSearch from 'minisearch'
import { listVoices } from '../../synthesize-speech.ts'
import { setUserSettings } from '../../user-settings.ts'

type VoiceChoice = { name: string; value: VoiceId }
type VoiceDocument = Voice & VoiceChoice & { id: string }

let search: MiniSearch<VoiceDocument> | undefined

const getSearch = async () => {
  if (search) return search

  const voices = await listVoices()

  search = new MiniSearch<VoiceDocument>({
    fields: ['Id', 'Name', 'LanguageCode', 'LanguageName', 'Gender'],
    storeFields: ['name', 'value'],
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  })

  voices.sort((a, b) => (a.Name || a.Id || '').localeCompare(b.Name || b.Id || ''))

  for (const voice of voices) {
    if (!voice.Id) continue

    search.add({
      ...voice,
      id: voice.Id.toLowerCase(),
      name: [voice.Name || voice.Id, voice.LanguageName || voice.LanguageCode, voice.Gender]
        .filter(Boolean)
        .join(' - ')
        .slice(0, 100),
      value: voice.Id,
    })
  }

  return search
}

export const init = async () => {
  await getSearch()
}

export const voiceCommand = new SlashCommandBuilder()
  .setName('voice')
  .setDescription('Choose a voice of your own!')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The name of the voice.')
      .setRequired(true)
      .setAutocomplete(true)
  )

export const handleVoiceCommand = async (
  interaction: AutocompleteInteraction | ChatInputCommandInteraction
) => {
  if (interaction.isAutocomplete()) {
    const search = await getSearch()
    const query = interaction.options.getFocused().trim()

    await interaction.respond(
      search.search(query || MiniSearch.wildcard)
        .slice(0, 25)
        .map(({ id }) => search.getStoredFields(id) as VoiceChoice)
    )

    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const search = await getSearch()
  const name = interaction.options.getString('name', true).trim().toLowerCase()

  const voice = search.getStoredFields(name) as VoiceChoice | undefined
  if (!voice) {
    await interaction.editReply(
      'Unknown voice. Please choose a voice from the autocomplete suggestions.'
    )

    return
  }

  await setUserSettings(interaction.user.id, 'voice', voice.value)
  await interaction.editReply(`${voice.value} online!`)
}

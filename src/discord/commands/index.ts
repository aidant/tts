import type { Client, Interaction } from 'discord.js'
import * as voice from './voice.ts'

export const initCommands = async (client: Client<true>) => {
  await Promise.all([
    client.application.commands.set([voice.voiceCommand.toJSON()]),
    voice.init(),
  ])
}

export const handleInteraction = async (interaction: Interaction) => {
  if (!interaction.isAutocomplete() && !interaction.isChatInputCommand()) return

  try {
    if (interaction.commandName === 'voice') {
      await voice.handleVoiceCommand(interaction)
    }
  } catch (error) {
    console.error(error)

    if (interaction.isChatInputCommand() && interaction.deferred) {
      await interaction.editReply('Unable to run this command. Please try again.').catch(console.error)
    } else if (interaction.isAutocomplete() && !interaction.responded) {
      await interaction.respond([]).catch(console.error)
    }
  }
}

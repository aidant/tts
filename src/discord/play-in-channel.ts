import type { StageChannel, VoiceChannel } from 'discord.js'
import type { Readable } from 'stream'
import { ensureAudioPlayer } from './ensure-audio-player.js'
import { ensureAudioQueue } from './ensure-audio-queue.js'
import { ensureVoiceConnection } from './ensure-voice-connection.js'

export const playInChannel = async (channel: VoiceChannel | StageChannel, stream: Readable) => {
  const connection = await ensureVoiceConnection(channel.guild, channel.id)
  const player = ensureAudioPlayer(connection)
  const queue = ensureAudioQueue(connection, player)

  queue.add(stream)
}
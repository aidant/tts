import type { StageChannel, VoiceChannel } from 'discord.js'
import type { Readable } from 'stream'
import { ensureAudioPlayer } from './ensure-audio-player.ts'
import { ensureAudioQueue } from './ensure-audio-queue.ts'
import { ensureVoiceConnection } from './ensure-voice-connection.ts'

export const playInChannel = async (channel: VoiceChannel | StageChannel, stream: Readable) => {
  const connection = await ensureVoiceConnection(channel.guild, channel.id)
  const player = ensureAudioPlayer(connection)
  const queue = ensureAudioQueue(connection, player)

  queue.add(stream)
}

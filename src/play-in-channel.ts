import { AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, StreamType, VoiceConnectionStatus } from '@discordjs/voice'
import type { StageChannel, VoiceChannel } from 'discord.js'
import type { Readable } from 'stream'

export const playInChannel = async (channel: VoiceChannel | StageChannel, stream: Readable) => {
  const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary })
  const player = createAudioPlayer()

  player.play(resource)
  await entersState(player, AudioPlayerStatus.Playing, 5000)

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30000)
  } catch (error) {
    connection.destroy()
    throw error
  }

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ])
    } catch (error) {
      connection.destroy()
    }
  })

  connection.subscribe(player)
}
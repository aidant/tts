import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice'
import type { StageChannel, VoiceChannel } from 'discord.js'
import type { Readable } from 'stream'
import { namespace } from './log.js'
import { Queue } from './queue.js'

const log = namespace('play-in-channel')

const getVoiceConnection = async (channel: VoiceChannel | StageChannel): Promise<VoiceConnection> => {
  log('get voice connection for channel:', channel.name)

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30000)
    log('voice connection ready')
  } catch (error) {
    try {
      log('closing connection')
      connection.destroy()
    } catch {}
    log('voice connection failed')
    throw error
  }

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    log('disconnected')
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ])
      log('reconnected')
    } catch (error) {
      try {
        log('closing connection')
        connection.destroy()
      } catch {}
    }
  })

  return connection
}

const players = new WeakMap<VoiceConnection, AudioPlayer>()
const getAudioPlayer = (connection: VoiceConnection): AudioPlayer => {
  log('get audio player')
  if (players.has(connection)) return players.get(connection)!

  log('create auto player')
  const player = createAudioPlayer()
  
  connection.subscribe(player)
  connection.on(VoiceConnectionStatus.Destroyed, () => {
    log('connection destroyed, stopping audio player')
    player.stop(true)
  })
  
  players.set(connection, player)
  
  return player
}

const queues = new WeakMap<AudioPlayer, Queue>()
const getQueue = (player: AudioPlayer) => {
  log('get queue')
  if (!queues.has(player)) queues.set(player, new Queue(player))
  log('create queue')
  return queues.get(player)!
}

export const playInChannel = async (channel: VoiceChannel | StageChannel, stream: Readable) => {
  log('play in channel')

  const connection = await getVoiceConnection(channel)
  const player = getAudioPlayer(connection)
  const queue = getQueue(player)

  queue.push(stream)
  queue.process()
}
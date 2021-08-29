import type { AudioPlayer, VoiceConnection } from '@discordjs/voice'
import { createAudioPlayer, NoSubscriberBehavior, VoiceConnectionStatus } from '@discordjs/voice'
import { namespace } from '../log.js'

const log = namespace('discord:audio-player')

const players = new WeakMap<VoiceConnection, AudioPlayer>()

export const ensureAudioPlayer = (connection: VoiceConnection): AudioPlayer => {
  log('begin creating audio player')

  const player = players.get(connection) || createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Stop,
    },
  })
  const isNewPlayer = !players.has(connection)

  log('existing audio player: %s', isNewPlayer ? 'no' : 'yes')

  if (isNewPlayer) {
    connection.subscribe(player)

    connection.once(VoiceConnectionStatus.Destroyed, () => {
      log('connection destroyed, stopping audio player')

      player.off('error', log)
      player.stop(true)
      players.delete(connection)
    })

    player.on('error', log)
    
    players.set(connection, player)
  }

  log('completed creating audio player')

  return player
}

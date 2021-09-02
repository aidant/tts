import type { AudioPlayer, VoiceConnection } from '@discordjs/voice'
import { createAudioPlayer, NoSubscriberBehavior, VoiceConnectionStatus } from '@discordjs/voice'
import { namespace } from '../log.js'

const log = namespace('discord:audio-player')
/*
  By keeping a weak reference to the audio player from the voice connection, we
  can ensure the voice connection and the audio player are correctly garbage
  collected. Otherwise we would be keeping a reference to the voice connection
  and preventing both objects from being destroyed. 
*/
const players = new WeakMap<VoiceConnection, AudioPlayer>()

/*
  Ensure we have a audio player for a given connection.
*/
export const ensureAudioPlayer = (connection: VoiceConnection): AudioPlayer => {
  log('begin creating audio player')

  const player = players.get(connection) || createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Stop,
    },
  })
  const isNewPlayer = !players.has(connection)

  log('existing audio player: %s', isNewPlayer ? 'no' : 'yes')

  /*
    If we have just created the audio player, we need to hook it up to the
    connection and make sure we destroy it with the connection.
  */
  if (isNewPlayer) {
    connection.subscribe(player)

    connection.once(VoiceConnectionStatus.Destroyed, () => {
      log('connection destroyed, stopping audio player')

      player.off('error', log)
      players.delete(connection)
      player.stop(true)
    })

    player.on('error', log)
    players.set(connection, player)
  }

  log('completed creating audio player')

  return player
}

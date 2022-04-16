import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioResource,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice'
import type { Readable } from 'stream'
import { namespace } from '../log.js'

const log = namespace('discord:audio-queue')
/*
  By keeping a weak reference to the audio queue from the audio player, we can
  ensure the audio player and the audio queue are correctly garbage collected.
  Otherwise we would be keeping a reference to the audio player and preventing
  both objects from being destroyed. 
*/
const queues = new WeakMap<AudioPlayer, AudioQueue>()

interface AudioQueue {
  add(stream: Readable): void
}

/*
  Ensure we have an audio queue for a given audio player.
*/
export const ensureAudioQueue = (connection: VoiceConnection, player: AudioPlayer): AudioQueue => {
  log('begin creating audio queue')

  const isNewQueue = !queues.has(player)

  log('existing audio queue: %s', isNewQueue ? 'no' : 'yes')

  if (isNewQueue) {
    const resources: AudioResource[] = []
    let timeout: NodeJS.Timeout | undefined

    const queue: AudioQueue = {
      add: (stream: Readable) => {
        log('adding resource to queue')

        resources.push(createAudioResource(stream, { inputType: StreamType.Arbitrary }))

        log('queue length: %d', resources.length)

        if (timeout) {
          log('clearing idle timeout')

          clearTimeout(timeout)
        }

        if (player.state.status === AudioPlayerStatus.Idle) {
          log('player is idle, queueing resource now')

          player.play(resources.shift()!)
        }
      },
    }

    queues.set(player, queue)

    /*
      Kill the queue once the connection is destroyed.
    */
    const handleConnectionDestroyed = () => {
      log('connection destroyed, killing queue')

      player.off(AudioPlayerStatus.Idle, handlePlayerIdle)
      queues.delete(player)
    }

    /*
      Once the current audio resource has finished playing, begin playing the
      next audio resource in the queue. Otherwise if the queue is empty, set an
      idle timeout.
    */
    const handlePlayerIdle = () => {
      log('player is idle')

      const resource = resources.shift()

      if (resource) {
        log('queueing resource now')

        player.play(resource)

        log('queue length: %d', resources.length)
      } else {
        log('queue is empty, setting idle timeout')

        timeout = setTimeout(() => {
          log('idle timeout triggered, killing queue')

          player.off(AudioPlayerStatus.Idle, handlePlayerIdle)
          connection.off(VoiceConnectionStatus.Destroyed, handleConnectionDestroyed)
          try {
            connection.destroy()
          } catch {}
          queues.delete(player)
        }, 1000 * 60 * 10)
      }
    }

    player.on(AudioPlayerStatus.Idle, handlePlayerIdle)
    connection.once(VoiceConnectionStatus.Destroyed, handleConnectionDestroyed)
  }

  log('completed creating audio queue')

  return queues.get(player)!
}

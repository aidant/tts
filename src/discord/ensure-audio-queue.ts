import { AudioPlayer, AudioResource, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice'
import { AudioPlayerStatus, createAudioResource, StreamType } from '@discordjs/voice'
import type { Readable } from 'stream'
import { namespace } from '../log.js'

const log = namespace('discord:audio-queue')

const queues = new WeakMap<AudioPlayer, AudioQueue>()

interface AudioQueue {
  add(stream: Readable): void
}

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
      } 
    }
    
    queues.set(player, queue)

    const handleConnectionDestroyed = () => {
      log('connection destroyed, killing queue')

      player.off(AudioPlayerStatus.Idle, handlePlayerIdle)
      queues.delete(player)
    }

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
          connection.destroy()
          queues.delete(player)
        }, 1000 * 60)
      }
    }

    player.on(AudioPlayerStatus.Idle, handlePlayerIdle)
    connection.once(VoiceConnectionStatus.Destroyed, handleConnectionDestroyed)
  }

  log('completed creating audio queue')

  return queues.get(player)!
}

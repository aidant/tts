import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioResource, entersState, StreamType } from '@discordjs/voice'
import { Readable } from 'stream'
import { namespace } from './log.js'

const log = namespace('queue')

export class Queue {
  private isProcessing = false
  private resources: AudioResource[] = []

  constructor (
    private player: AudioPlayer
  ) {
    log('create queue')
  }

  push (stream: Readable) {
    log('push resource to player at index:', this.resources.length)
    this.resources.push(
      createAudioResource(stream, { inputType: StreamType.Arbitrary })
    )
  }

  async process () {
    if (this.isProcessing) return
    this.isProcessing = true

    log('begin processing queue')

    while (this.resources.length) {
      const resource = this.resources.shift()!
      log('play resouce')
      this.player.play(resource)

      try {
        await entersState(this.player, AudioPlayerStatus.Playing, 1000 * 5)
        log('resource began playing')
        await entersState(this.player, AudioPlayerStatus.Idle, 1000 * 60 * 5)
        log('resource stopped playing')
      } catch {}
    }

    log('queue finished processing')

    this.isProcessing = false
  }
}
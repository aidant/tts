import type { VoiceConnection } from '@discordjs/voice'
import {
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus
} from '@discordjs/voice'
import type { Guild } from 'discord.js'
import { namespace } from '../log.js'

const log = namespace('discord:voice-connection')

/*
  Ensure a voice connection is ready and is connected to the correct channel.
*/
export const ensureVoiceConnection = async (
  guild: Guild,
  channelId: string
): Promise<VoiceConnection> => {
  log('begin creating connection')

  let connection = getVoiceConnection(guild.id)
  const isNewConnection = !connection

  log('existing connection: %s', connection ? 'yes' : 'no')
  log('connection status: "%s"', connection?.state.status)

  /*
    If the connection is not active or connected to the wrong channel, create a
    new connection.
  */
  if (
    connection?.joinConfig.channelId !== channelId ||
    connection.state.status === VoiceConnectionStatus.Disconnected ||
    connection.state.status === VoiceConnectionStatus.Destroyed
  ) {
    log('create new connection')

    connection = joinVoiceChannel({
      guildId: guild.id,
      channelId: channelId,
      adapterCreator: guild.voiceAdapterCreator,
    })
  }

  /*
    If the connection is not yet ready, we wait until the connection is ready,
    otherwise, if the connection does not successfully enter the ready state we
    destroy the connection and bubble the error back up.
  */
  if (connection.state.status === VoiceConnectionStatus.Ready) {
    log('connection is already established')
  } else
    try {
      log('waiting for connection to enter ready state')

      await entersState(connection, VoiceConnectionStatus.Ready, 1000 * 30)

      log('connection established')
    } catch (error) {
      log('failed to establish connection:\n\t%O', error)

      connection.destroy()
      throw error
    }

  /*
    If we have created a new connection, we need to gracefully handle
    "potentially reconnectable disconnects". In the situation where the
    connection does not recover from the disconnect, we kill the connection.
  */
  if (isNewConnection) {
    log('attaching graceful disconnect handler')

    const handleDisconnect = async () => {
      log('disconnected')

      try {
        await Promise.race([
          entersState(connection!, VoiceConnectionStatus.Signalling, 1000 * 5),
          entersState(connection!, VoiceConnectionStatus.Connecting, 1000 * 5),
        ])

        log('re-established connection')
      } catch {
        log('destroying connection')

        connection!.off(VoiceConnectionStatus.Disconnected, handleDisconnect)
        connection!.destroy()
      }
    }
    connection.on(VoiceConnectionStatus.Disconnected, handleDisconnect)
  }

  log('completed creating connection')

  return connection
}

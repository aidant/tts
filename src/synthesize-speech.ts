import {
  DescribeVoicesCommand,
  Engine,
  OutputFormat,
  PollyClient,
  SynthesizeSpeechCommand,
  TextType,
  VoiceId,
} from '@aws-sdk/client-polly'
import { Guild } from 'discord.js'
import type { Readable } from 'stream'
import { AWS_REGION } from './environment.js'
import { namespace } from './log.js'

const log = namespace('polly')

const client = new PollyClient({
  region: AWS_REGION,
})

export const listVoices = async () => {
  const response = await client.send(
    new DescribeVoicesCommand({
      Engine: Engine.NEURAL,
    })
  )

  return response.Voices || []
}

export const createSSML = async (
  text: string,
  guild: Guild,
  { isEmphasisAvailable = false } = {}
): Promise<string> => {
  let parsedText = text
    .replace(/"/g, '&quot;')
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  while (true) {
    const match =
      /&lt;(?:(?:@!?(?<user>\d+?))|(?:#(?<channel>\d+?))|(?:@&amp;(?<role>\d+?))|(?:a?:(?<custom_emoji>\S+?):\d+?)|(?:t:(?<timestamp>\d+?)(?::\w)?))&gt;/.exec(
        parsedText
      )

    if (match?.groups) {
      const { user, channel, role, custom_emoji, timestamp } = match.groups

      if (user) {
        const discordUser = await guild.members.fetch(user)
        const discordUserName = discordUser?.displayName
        if (discordUserName) {
          parsedText = parsedText.replace(match[0], discordUserName)
        } else {
          parsedText = parsedText.replace(match[0], 'Unknown User')
        }
      } else if (channel) {
        const discordChanel = await guild.channels.fetch(channel)
        const discordChannelName = discordChanel?.name
        if (discordChannelName) {
          parsedText = parsedText.replace(match[0], discordChannelName)
        } else {
          parsedText = parsedText.replace(match[0], 'deleted channel')
        }
      } else if (role) {
        const discordRole = await guild.roles.fetch(role)
        const discordRoleName = discordRole?.name
        if (discordRoleName) {
          parsedText = parsedText.replace(match[0], discordRoleName)
        } else {
          parsedText = parsedText.replace(match[0], 'deleted role')
        }
      } else if (custom_emoji) {
        parsedText = parsedText.replace(match[0], custom_emoji)
      } else if (timestamp) {
        parsedText = parsedText.replace(
          match[0],
          `<say-as interpret-as="date" format="yyyymmdd">${new Date(parseInt(timestamp, 10) * 1000)
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, '')}</say-as>`
        )
      }
    } else {
      break
    }
  }

  if (isEmphasisAvailable) {
    while (true) {
      const match = /__(?<underline>.+?)__|\*\*(?<bold>.+?)\*\*/.exec(parsedText)

      if (match?.groups) {
        const { underline, bold } = match.groups

        if (underline) {
          parsedText = parsedText.replace(
            match[0],
            `<emphasis level="reduced">${underline}</emphasis>`
          )
        } else if (bold) {
          parsedText = parsedText.replace(match[0], `<emphasis level="strong">${bold}</emphasis>`)
        }
      } else {
        break
      }
    }
  }

  return `<speak><amazon:effect name="drc">${parsedText}</amazon:effect></speak>`
}

export const synthesizeSpeech = async (ssml: string, name: VoiceId = 'Brian') => {
  log('synthesize speech for %s:\n\t%O', name, ssml)

  const response = await client.send(
    new SynthesizeSpeechCommand({
      OutputFormat: OutputFormat.OGG_VORBIS,
      Text: ssml,
      TextType: TextType.SSML,
      VoiceId: name,
      Engine: Engine.NEURAL,
    })
  )

  log('synthesized')

  return response.AudioStream as Readable
}

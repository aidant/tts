import { Engine, OutputFormat, PollyClient, SynthesizeSpeechCommand, TextType, VoiceId, DescribeVoicesCommand } from '@aws-sdk/client-polly'
import type { Readable } from 'stream'
import { AWS_REGION } from './environment.js'
import { namespace } from './log.js'

const log = namespace('polly')

const client = new PollyClient({
  region: AWS_REGION,
})

export const listVoices = async () => {
  const response = await client.send(new DescribeVoicesCommand({
    Engine: Engine.NEURAL
  }))

  return response.Voices || []
}

export const synthesizeSpeech = async (text: string, name = 'Brian') => {
  log('synthesize speech for %s:\n\t%O', name, text)

  const response = await client.send(new SynthesizeSpeechCommand({
    OutputFormat: OutputFormat.OGG_VORBIS,
    Text: text,
    TextType: TextType.TEXT,
    VoiceId: name,
    Engine: Engine.NEURAL,
  }))

  log('synthesized')

  return response.AudioStream as Readable
}

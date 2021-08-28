import { Engine, OutputFormat, PollyClient, SynthesizeSpeechCommand, TextType, VoiceId, DescribeVoicesCommand } from '@aws-sdk/client-polly'
import type { Readable } from 'stream'
import { AWS_REGION } from './environment.js'

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
  const response = await client.send(new SynthesizeSpeechCommand({
    OutputFormat: OutputFormat.OGG_VORBIS,
    Text: text,
    TextType: TextType.TEXT,
    VoiceId: name,
    Engine: Engine.NEURAL,
    LanguageCode: 'en-AU',
  }))

  return response.AudioStream as Readable
}

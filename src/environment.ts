import 'dotenv/config'

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN!
export const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
export const TTS_CHANNELS = process.env.TTS_CHANNELS?.split(',')

import debug from 'debug'
if (!process.env.DEBUG) debug.enable('tts*')
export const log = debug('tts')
export const namespace = log.extend.bind(log)

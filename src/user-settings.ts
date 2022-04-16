import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { namespace } from './log.js'

const log = namespace('user-settings')

const getFilepath = (userId: string) =>
  path.resolve(path.join(os.homedir(), '.tts'), 'users', userId)

interface Settings {
  voice?: string
}

export const getUserSettings = async (userId: string): Promise<Settings> => {
  const settings = JSON.parse(
    await fs.readFile(getFilepath(userId), { encoding: 'utf8' }).catch(() => '{}')
  )
  log('get user settings for user: %s\n%O', userId, settings)
  return settings
}

export const setUserSettings = async <K extends keyof Settings>(
  userId: string,
  key: K,
  value: Settings[K]
) => {
  log('set user settings for user: %s where %s = %s', userId, key, value)
  const settings = await getUserSettings(userId)
  settings[key] = value
  await fs.mkdir(path.dirname(getFilepath(userId)), { recursive: true })
  await fs.writeFile(getFilepath(userId), JSON.stringify(settings), { encoding: 'utf8' })
}

import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

const getFilepath = (userId: string) =>
  path.resolve(path.join(os.homedir(), '.tts'), 'users', userId)

interface Settings {
  voice?: string
}

export const getUserSettings = async (userId: string): Promise<Settings> => {
  return JSON.parse(await fs.readFile(getFilepath(userId), { encoding: 'utf8' }).catch(() => '{}'))
}

export const setUserSettings = async <K extends keyof Settings>(userId: string, key: K, value: Settings[K]) => {
  const settings = await getUserSettings(userId)
  settings[key] = value
  await fs.mkdir(path.dirname(getFilepath(userId)), { recursive: true })
  await fs.writeFile(getFilepath(userId), JSON.stringify(settings), { encoding: 'utf8' })
}

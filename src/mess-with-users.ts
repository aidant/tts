import randomWords from 'random-words'
import { USERS_TO_MESS_WITH } from './environment.js'

export const messWithUsers = (userId: string, messageContent: string): string => {
  if (USERS_TO_MESS_WITH?.includes(userId)) {
    return randomWords(messageContent.split(' ').length).join(' ')
  } else {
    return messageContent
  }
}

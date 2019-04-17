import { log } from './config'
const PQueue = require('p-queue')
enum FunctionType {
  syncContactAndRoom   = 'syncContactAndRoom',
  syncRoomMembers      = 'syncRoomMembers',
  getAvatar            = 'getAvatar',
  deleteChatRoomMember = 'deleteChatRoomMember',
  addChatRoomMember    = 'addChatRoomMember',
  modifyRoomTopic      = 'modifyRoomTopic',
  createRoom           = 'createRoom',
  modifyContactAlias   = 'modifyContactAlias',
  roomQrcode           = 'roomQrcode',
  setAnnouncement      = 'setAnnouncement',
  friendshipAdd        = 'friendshipAdd',
  friendshipAccept     = 'friendshipAccept',
  roomQuit             = 'roomQuit',
}

class Queue {
  private queue: {
    [type: string]: (typeof PQueue)
  } = {}

  constructor () {
    if (Object.keys(this.queue).length === 0) {
      const types = Object.keys(FunctionType)
      types.forEach(type => {
        this.queue[type] = new PQueue({concurrency: 1})
      })
    }
  }

  public async add<T, TResult>(func: (this: T, ...args: any[]) => Promise<TResult>, thisArg: T, ...args: any[]): Promise<TResult> {
    if (this.queue[func.name]) {
      log.info('Queue', `enqueue: ${func.name}_${args}`)
      return this.queue[func.name].add(async () => {
        return await func.call(thisArg, ...args)
      })
    } else {
      log.warn('Queue', `not supported the type: ${func.name}_${args}, and will run it directly`)
      return await func.call(thisArg, ...args)
    }
  }
}

export const queueApi = new Queue()
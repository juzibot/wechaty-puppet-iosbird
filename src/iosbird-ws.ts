import { EventEmitter }       from 'events'
import WebSocket              from 'ws'
import {
  log,
}                             from './config'
import {
  IosbirdMessageType,
  IosbirdContactPayload,
  IosbirdMessagePayload,
  IosbirdRoomMemberPayload
}                             from './iosbird-schema';

const uuid = require('uuidv4')

export enum Action {
  ENTER             = 'enter',            // 与插件连接成功
  CHAT              = 'chat',             // 收发消息
  ANNOUNCEMENT      = 'announcement',     // 发送群公告
  GAIN_CONTACT_LIST = 'gain_user_list',   // 请求联系人信息列表
  CONTACT_LIST      = 'user_list',        // 收到联系人信息列表
  AVATAR_LIST       = 'avatar_list',      // 群头像
  ROOM_MEMBER       = 'group_user_list',  // 获取群成员信息列表
}

export enum Type {
  WEB = 'web',
  IOS = 'ios',
}

export interface MessagePayloadOfSending {
  id       : string,
  botId    : string,               // 机器人ID
  u_id?    : string,               // 接收人
  to_id?   : string,               // 接收人，@群成员时使用
  type     : Type,
  action   : Action,               // 操作类型了
  content? : string,               // 消息内容
  to_type? : Type,
  cnt_type?: IosbirdMessageType,   // 消息格式
  call_id? : string,
}

export enum ContactType {
  contact = '0',      // 好友
  member  = '1',      // 群成员
}




export interface IosbirdIOSContactList {
  id    : string,                      // bot id
  list  : IosbirdContactPayload[],
  type  : Type,
  action: Action,
}

export class IosbirdWebSocket extends EventEmitter {
  private ws: WebSocket | undefined

  constructor (
    protected endpoint: string,
    protected botId   : string,
  ) {
    super()
    log.verbose('IosBirdWebSocket', 'constructor(%s, %s)', this.endpoint, this.botId)
  }

  protected async initWebSocket () {
    log.verbose('IosbirdWebSocket', 'initWebSocket()')
    this.ws = new WebSocket(`ws://${this.endpoint}`)
    if (!this.ws) {
      throw new Error('There is no websocket connect')
    }
    /**
     * Wait the Websocket to be connected
     */
    await new Promise((resolve, reject) => {
      this.ws!.once('open', () => {
        log.verbose('IosbirdWebSocket', 'initWebSocket() Promise() ws.on(open)')
        const msg: MessagePayloadOfSending = {
          action: Action.ENTER,
          botId: this.botId,
          id: '1',
          type: Type.WEB,
        }
        this.ws!.send(JSON.stringify(msg))
        this.emit('login', this.botId)
        return resolve()
      })
      this.ws!.once('error', (error) => {
        log.verbose('IosbirdWebSocket', 'initWebSocket() Promise() ws.on(error) %s', error)
        this.emit('error', error)
        return reject(error)
      })
      this.ws!.once('close', (reason, code) => {
        log.verbose('IosbirdWebSocket', 'initWebSocket() Promise() ws.on(close) code: %s, reason: %s', reason, code)
        return reject()
      })
    })

    /**
     * Message: Deal with payload
     */
    this.ws.on('message', (message) => {
      const messagePayload = JSON.parse(message as string)
      if ( messagePayload.action === Action.CONTACT_LIST ||
           messagePayload.action === Action.AVATAR_LIST ||
           messagePayload.status
          ) {
        return
      }
      messagePayload.msgId = uuid() as string
      this.emit('message', messagePayload as IosbirdMessagePayload)
    })
  }

  public async sendMessage(id: string, message: string, messageType: IosbirdMessageType) {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    const messagePayload: MessagePayloadOfSending = {
      id      : '1',
      type    : Type.WEB,
      to_id   : id,
      u_id    : id,
      to_type : Type.IOS,
      content : message,
      cnt_type: messageType,
      botId   : this.botId,
      action  : Action.CHAT,
    }

    this.ws.send(JSON.stringify(messagePayload))
  }


  public async syncContactAndRoom (): Promise<IosbirdIOSContactList> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id    : '1',
      type  : Type.WEB,
      action: Action.GAIN_CONTACT_LIST,
      botId : this.botId,

    }
    this.ws.send(JSON.stringify(options))
    return new Promise<IosbirdIOSContactList>((resolve) => {
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string) as IosbirdIOSContactList
        if (messagePayload.action === Action.CONTACT_LIST) {
          resolve(messagePayload)
        }
      })
    })
  }

  public async syncRoomMembers (roomId: string): Promise<{[contactId: string]: IosbirdRoomMemberPayload}> {
    if (!this.ws) {
      throw new Error('syncRoomMember(): WS is not connected')
    }
    const options = {
      action: Action.ROOM_MEMBER,
      u_id  : roomId,
      botId : this.botId,
      type  : Type.WEB,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<{[contactId: string]: IosbirdRoomMemberPayload}>((resolve) => {
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_MEMBER) {
          const memberList = messagePayload.list
          const roomMemberDic: {[contactId: string]: IosbirdRoomMemberPayload} = {}
          memberList.map((member: IosbirdRoomMemberPayload) => {
            const contactId = member.wechat_id.split('$')[1]
            member.wechat_id = contactId
            roomMemberDic[contactId] = member
          })
          resolve(roomMemberDic)
        }
      })
    })
  }
}

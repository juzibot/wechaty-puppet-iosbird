import { EventEmitter }       from 'events'
import WebSocket              from 'ws'
import {
  log,
}                             from './config'
import {
  IosbirdMessageType,
  IosbirdContactPayload,
  IosbirdMessagePayload,
  IosbirdRoomMemberPayload,
  IosbirdAvatarSchema,
}                             from './iosbird-schema'

const uuid = require('uuidv4')

export enum Action {
  ENTER              = 'enter',             // 与插件连接成功
  CHAT               = 'chat',              // 收发消息
  ANNOUNCEMENT       = 'announcement',      // 发送群公告
  GAIN_CONTACT_LIST  = 'gain_user_list',    // 请求联系人信息列表
  CONTACT_LIST       = 'user_list',         // 收到联系人信息列表
  AVATAR_LIST        = 'avatar_list',       // 群头像
  ROOM_MEMBER_LIST   = 'group_user_list',   // 获取群成员信息列表
  ROOM_MEMBER_REMOVE = 'del_group_mem',     // 删除群成员
  ROOM_MEMBER_ADD    = 'add_group_mem',     //添加群成员
}

export enum Type {
  WEB = 'web',
  IOS = 'ios',
}

interface RoomMemberDict {
  roomId: string,
  roomMemberDict: {
    [contactId: string]: IosbirdRoomMemberPayload
  },
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

    this.ws.setMaxListeners(1000)
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
        this.emit('connect', this.botId)
        return resolve()
      })
      this.ws!.once('error', (error) => {
        log.verbose('IosbirdWebSocket', 'initWebSocket() Promise() ws.on(error) %s', error)
        this.emit('error', error)
        return reject(error)
      })
      this.ws!.once('close', (reason, code) => {
        log.verbose('IosbirdWebSocket', 'initWebSocket() Promise() ws.on(close) code: %s, reason: %s', reason, code)
        this.emit('close', reason, code)
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
           messagePayload.action === Action.ROOM_MEMBER_LIST ||
           messagePayload.action === Action.ROOM_MEMBER_REMOVE ||
           messagePayload.action === Action.ROOM_MEMBER_ADD
          ) {
        return
      }
      messagePayload.msgId = uuid() as string
      /**
       * 系统消息
       * {
       *  "action": "chat",
       *  "to_type": "web",
       *  "s_type": "ios",
       *  "id": "wxid_tdax1huk5hgs12",
       *  "content": "\"林贻民记录\"邀请\"桔小秘\"加入了群聊",
       *  "m_type": "10000",
       *  "mem_id": "wxid_tdax1huk5hgs12$",
       *  "u_id": "5212109738@chatroom",
       *  "type": "ios",
       *  "name": "系统消息"
       * }
       *
       * 文本消息
       * {
       *   "action": "chat",
       *   "to_type": "web",
       *   "content": "哈哈",
       *   "id": "wxid_tdax1huk5hgs12",
       *   "s_type": "web",
       *   "mem_id": "",
       *   "u_id": "wxid_j76jk7muhgqz22",
       *   "type": "ios",
       *   "name": "林贻民"
       * }
       */
      if ((! messagePayload.cnt_type) && (!messagePayload.m_type)) {
        messagePayload.cnt_type = IosbirdMessageType.TEXT
      }
      if (messagePayload.name === '系统消息'){
        messagePayload.cnt_type = IosbirdMessageType.SYS
      }
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

  public async syncRoomMembers (roomId: string): Promise<RoomMemberDict> {
    if (!this.ws) {
      throw new Error('syncRoomMember(): WS is not connected')
    }
    const options = {
      action: Action.ROOM_MEMBER_LIST,
      u_id  : roomId,
      botId : this.botId,
      type  : Type.WEB,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<RoomMemberDict>((resolve) => {
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_MEMBER_LIST) {
          const memberList = messagePayload.list
          /**
           * There is a special situation
           * {
           *   "status": 10001,
           *   "id": "wxid_tdax1huk5hgs12",
           *   "u_id": "9500068146@chatroom",
           *   "msg": "群的成员数为空？？请联系技术",
           *   "type": "ios",
           *   "action": "group_user_list"
           * }
           */
          const roomMemberDict: {[contactId: string]: IosbirdRoomMemberPayload} = {}
          const result: RoomMemberDict = {
            roomId        : messagePayload.u_id as string,
            roomMemberDict: roomMemberDict,
          }
          if (!memberList) {
            return resolve(result)
          }
          memberList.map((member: IosbirdRoomMemberPayload) => {
            const contactId = member.wechat_id.split('$')[1]
            member.wechat_id = contactId
            roomMemberDict[contactId] = member
          })
          resolve(result)
        }
      })
    })
  }

  public getAvatar () {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id    : '1',
      type  : Type.WEB,
      action: Action.AVATAR_LIST,
      botId : this.botId,
    }
    this.ws.send(JSON.stringify(options))

    this.ws!.on('message', (message) => {
      const messagePayload = JSON.parse(message as string)
      if (messagePayload.action === Action.AVATAR_LIST) {
        this.emit('avatar', messagePayload as IosbirdAvatarSchema)
      }
    })
  }

  public async deleteChatRoomMember (roomId: string, contactId: string): Promise<void | Error> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id    : '1',
      type  : Type.WEB,
      action: Action.ROOM_MEMBER_REMOVE,
      botId : this.botId,
      u_id: roomId,
      wxids: `${this.botId}\$${contactId}`
    }
    this.ws.send(JSON.stringify(options))

    /**
     * 删除失败
     * {
     *   "status": 10001,
     *   "id": "wxid_tdax1huk5hgs12",
     *   "u_id": "5212109738@chatroom",
     *   "message": "操作失败,请确保自己有权限进行此操作",
     *   "type": "ios",
     *   "action": "del_group_mem"
     * }
     *
     * 删除成功
     * {
     *   "status": 10000,
     *   "id": "wxid_tdax1huk5hgs12",
     *   "u_id": "5212109738@chatroom",
     *   "message": "success",
     *   "type": "ios",
     *   "action": "del_group_mem"
     * }
     */
    return new Promise<void> ((resolve, reject) => {
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_MEMBER_REMOVE) {
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.message)
          }
        }
      })
    })
  }

  public async addChatRoomMember (roomId: string, contactId: string): Promise<void | Error> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id    : '1',
      type  : Type.WEB,
      action: Action.ROOM_MEMBER_ADD,
      botId : this.botId,
      u_id: roomId,
      wxids: `${this.botId}\$${contactId}`
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<void> ((resolve, reject) => {
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_MEMBER_ADD) {
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.message)
          }
        }
      })
    })
  }
}

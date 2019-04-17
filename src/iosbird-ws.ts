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
  ENTER                = 'enter',                   // 与插件连接成功
  CHAT                 = 'chat',                    // 收发消息
  ANNOUNCEMENT         = 'announcement',            // 发送群公告
  GAIN_CONTACT_LIST    = 'gain_user_list',          // 请求联系人信息列表
  CONTACT_LIST         = 'user_list',               // 收到联系人信息列表
  CONTACT_ALIAS_MODIFY = 'change_nickname',         // 修改昵称
  AVATAR_LIST          = 'avatar_list',             // 群头像
  ROOM_MEMBER_LIST     = 'group_user_list',         // 获取群成员信息列表
  ROOM_MEMBER_REMOVE   = 'del_group_mem',           // 删除群成员
  ROOM_MEMBER_ADD      = 'add_group_mem',           // 添加群成员
  ROOM_CREATE          = 'create_group',            // 新建群
  ROOM_TOPIC_MODIFY    = 'modify_name',             // 修改群名称
  ROOM_QRCODE          = 'http_get_qrcode',         // 获取群二维码
  ROOM_CREATE_RES      = 'add_users_res',           // 创建群返回值
  ROOM_QUIT            = 'quit_chatroom',           // 退出群聊
  FRIENDSHIP_ADD       = 'add_friend',              // 添加好友
  FRIENDSHIP_ACCEPT    = 'accept_friend_request',   // 接受好友请求
  HEARTBEAT            = 'heartbeat',               // 心跳信息(自己定义的, 不是IOS底层接口那边定义)

}

export enum Type {
  WEB = 'web',
  IOS = 'ios',
}

enum Heartbeat {
  online  = 'online',    // 在线
  offline = 'offline',   // 掉线
  close   = 'close',     // 关闭
}

export interface RoomMemberDict {
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

  // 断开心跳信息提醒间隔
  private iosHeartbeatTimer: NodeJS.Timeout | null = null

  //

  // ios socket和puppet socket的连接状态
  // 两个socket都连接成功 --> true, 否则 --> false
  private socketState: boolean = false

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

    /**
     * 心跳信息检测不能放在'open'事件的callback中, 因为使用了open事件在Promise中,
     * 如果心跳信息检测在open事件的callback中, 会一直在阻塞, 不会触发message事件,
     * 不会有心跳信息, 所以会一直在显示check connection status
     */

    log.info (`IosbirdWebSocket`, 'Checking ios socket and puppet scoket\'s connection status ...')
    const interval = setInterval(() => {
      log.info (`IosbirdWebSocket`, 'Checking ios socket and puppet scoket\'s connection status ...')
    }, 5 * 1000)

    // 等待ios socket连接
    this.on('heartbeat', (heartbeatInfo: Heartbeat) => {
      if (heartbeatInfo === Heartbeat.online) {
        if(!this.socketState) {
          this.emit('connect', this.botId)
          this.socketState = true
          clearInterval(interval)
        }
      } else if (heartbeatInfo === Heartbeat.offline) {
        this.emit('error', 'heartbeat info: ios plugin is broken!!! Please Check it out!!!')
      }
    })

    // 在指定时间内没有心跳信息
    setTimeout (() => {
      if (!this.iosHeartbeatTimer && (!this.socketState)) {
        clearInterval(interval)
        this.emit('error', 'not receive ios socket heartbeat information, may be ios plugin is broken, please check it out.')
      }
    }, 30 * 1000)
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
        resolve()
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
      // 过滤掉非消息内容, 只处理常规消息, 心跳信息及系统消息
      if ( messagePayload.action === Action.CONTACT_LIST ||
           messagePayload.action === Action.AVATAR_LIST ||
           messagePayload.action === Action.ROOM_MEMBER_LIST ||
           messagePayload.action === Action.ROOM_MEMBER_REMOVE ||
           messagePayload.action === Action.ROOM_MEMBER_ADD ||
           messagePayload.action === Action.CONTACT_ALIAS_MODIFY ||
           messagePayload.action === Action.ROOM_TOPIC_MODIFY ||
           messagePayload.action === Action.ROOM_QRCODE ||
           messagePayload.action === Action.ROOM_CREATE_RES ||
           messagePayload.action === Action.ANNOUNCEMENT ||
           messagePayload.action === Action.ROOM_QUIT
          ) {
        return
      }

      // 腾讯新闻
      if (messagePayload.u_id === 'newsapp' || messagePayload === '腾讯新闻') {
        return
      }

      // 处理心跳信息
      if (messagePayload.action === Action.HEARTBEAT) {
        // 在线
        if (messagePayload.content === 'online') {
          if (this.iosHeartbeatTimer) {
            clearInterval(this.iosHeartbeatTimer)
            this.iosHeartbeatTimer = null
          }
          this.emit('heartbeat', Heartbeat.online)
          log.silly ('IosbirdWebSocket', 'heartbeat info: ios plugin is working well!')
        } else if (messagePayload.content === 'offline' || messagePayload.content === 'close') {
          if (messagePayload.content === 'offline') {
            this.emit('heartbeat', Heartbeat.offline)
          }
          // 避免设置多个timer
          if (this.iosHeartbeatTimer) {
            return
          }
          this.iosHeartbeatTimer = setInterval (() => {
            log.error ('IosbirdWebSocket', 'heartbeat info: ios plugin is broken!!! Please Check it out!!!')
          }, 5 * 1000)
        }
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

  public async modifyRoomTopic(roomId: string, topic: string): Promise<void> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id      : '1',
      type    : Type.WEB,
      action  : Action.ROOM_TOPIC_MODIFY,
      botId   : this.botId,
      u_id    : roomId,
      new_name: topic,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<void> ((resolve, reject) => {
      /**
       * { action: 'modify_name',
       *  status: 10000,
       *  id: 'wxid_tdax1huk5hgs12',
       *  u_id: '11833181328@chatroom',
       *  msg: 'success',
       *  new_name: '修改群名',
       *  type: 'ios'
       * }
       */
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_TOPIC_MODIFY) {
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.msg)
          }
        }
      })
    })
  }

  public async createRoom(contactIds: string[]): Promise<string> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id    : '1',
      type  : Type.WEB,
      action: Action.ROOM_CREATE,
      botId : this.botId,
      wxids : contactIds.join(','),
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<string> ((resolve) => {
      /**
       * {
       *   "id": "wxid_tdax1huk5hgs12",
       *   "list": [
       *     {
       *       "id": "wxid_tdax1huk5hgs12$11833181328@chatroom",
       *       "img": "",
       *       "nick": "wuli舞哩客服,桔小秘,林贻民",
       *       "type": "ios",
       *       "c_type": "1"
       *     }
       *   ],
       *   "type": "ios",
       *   "action": "add_users_res"
       * }
       */
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_CREATE_RES) {
          const roomId = messagePayload.list[0].id.split('$')[1]
          resolve(roomId)
        }
      })
    })
  }

  // TODO: Need to fix
  public async modifyContactAlias(alias: string): Promise<void> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id      : '1',
      type    : Type.WEB,
      action  : Action.CONTACT_ALIAS_MODIFY,
      botId   : this.botId,
      nickname: alias,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<void> ((resolve, reject) => {
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.CONTACT_ALIAS_MODIFY) {
          console.log('modifyContactAlias:##########################################')
          console.log(messagePayload)
          console.log('##########################################')
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.message)
          }
        }
      })
    })
  }

  public async roomQrcode(roomId: string): Promise<string> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id     : '1',
      type   : Type.WEB,
      action : Action.ROOM_QRCODE,
      botId  : this.botId,
      uniq_id: uuid(),
      u_id   : roomId,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<string> ((resolve, reject) => {
      /**
       * { action: 'http_get_qrcode',
       *   status: 10000,
       *   uniq_id: 'cfc4476b-2edf-4a40-b17a-ff60d5a2ea9b',
       *   id: 'wxid_tdax1huk5hgs12',
       *   msg: 'success',
       *   type: 'ios',
       *   group_qrcode: 'http://useoss.51talk.com/images/1183318132.png'
       * }
       */
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_QRCODE) {
          if (messagePayload.status === 10000) {
            resolve(messagePayload.group_qrcode)
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.msg)
          }
        }
      })
    })
  }

  public async setAnnouncement(roomId: string, content: string): Promise<string> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id     : '123',
      type   : Type.WEB,
      action : Action.ANNOUNCEMENT,
      botId  : this.botId,
      u_id   : roomId,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<string> ((resolve, reject) => {
      this.ws!.on('message', (message) => {
        /**
         * 修改成功
         * {
         *   "action": "announcement",
         *   "status": 10000,
         *   "id": "wxid_tdax1huk5hgs12",
         *   "cb": "",
         *   "u_id": "9659181410@chatroom",
         *   "msg": "success",
         *   "type": "ios"
         * }
         *
         * 修改失败
         * {
         *   "action": "announcement",
         *   "status": 10001,
         *   "id": "wxid_tdax1huk5hgs12",
         *   "cb": "",
         *   "u_id": "5212109738@chatroom",
         *   "msg": "操作失败,只有群主可以发公告",
         *   "type": "ios"
         * }
         */
        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ANNOUNCEMENT) {
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.msg)
          }
        }
      })
    })
  }

  public async friendshipAdd(contactId: string, hello: string): Promise<string> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id        : '1',
      uniq_id   : uuid(),
      type      : Type.WEB,
      action    : Action.FRIENDSHIP_ADD,
      botId     : this.botId,
      wxid      : contactId,
      verify_msg: hello,
      remark    : 'remark name',
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<string> ((resolve, reject) => {
      this.ws!.on('message', (message) => {
        const messagePayload = JSON.parse(message as string)
        /**
         * 添加好友失败
         * {
         *   "action": "add_friend",
         *   "status": 10001,
         *   "wxid": "",
         *   "id": "wxid_tdax1huk5hgs12",
         *   "uniq_id": "bc2d39d7-a3d1-4334-807b-27deeac83744",
         *   "message": "添加学员为好友时，未知页面",
         *   "type": "ios"
         * }
         */
        if (messagePayload.action === Action.FRIENDSHIP_ADD) {
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.message)
          }
        }
      })
    })
  }


  public async friendshipAccept(contactId: string, hello: string): Promise<string> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      id        : '1',
      uniq_id   : uuid(),
      type      : Type.WEB,
      action    : Action.FRIENDSHIP_ACCEPT,
      botId     : this.botId,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<string> ((resolve, reject) => {
      this.ws!.on('message', (message) => {

        const messagePayload = JSON.parse(message as string)
        console.log('friendshipAccept:##########################################')
        console.log(messagePayload)
        console.log('friendshipAccept:##########################################')
        if (messagePayload.action === Action.FRIENDSHIP_ACCEPT) {
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.msg)
          }
        }
      })
    })
  }

  public async roomQuit(roomId: string): Promise<void> {
    if (!this.ws) {
      throw new Error('WS is not connected')
    }
    // Get contact List
    const options = {
      type  : Type.WEB,
      action: Action.ROOM_QUIT,
      botId : this.botId,
      u_id  : roomId,
    }
    this.ws.send(JSON.stringify(options))
    return new Promise<void> ((resolve, reject) => {
      this.ws!.on('message', (message) => {

        const messagePayload = JSON.parse(message as string)
        if (messagePayload.action === Action.ROOM_QUIT) {
          if (messagePayload.status === 10000) {
            resolve()
          } else if (messagePayload.status === 10001) {
            reject(messagePayload.msg)
          }
        }
      })
    })
  }
}

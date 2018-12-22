import { EventEmitter } from 'events'
import WebSocket        from 'ws'
import {
  log,
}                       from './config'

const uuid = require('uuidv4')

export enum Action {
  ENTER             = 'enter',            // 与插件连接成功
  CHAT              = 'chat',             // 收发消息
  ANNOUNCEMENT      = 'announcement',     // 发送群公告
  GAIN_CONTACT_LIST = 'gain_user_list',   // 请求联系人信息列表
  CONTACT_LIST      = 'user_list',        // 收到联系人信息列表
  AVATAR_LIST       = 'avatar_list',      // 获取联系人头像
}

export enum Type {
  WEB = 'web',
  IOS = 'ios',
}

export interface IosbirdWebSocketMessage {
  id       : string,
  botId    : string,   // 机器人ID
  u_id?    : string,   // 接收人
  type     : Type,
  action   : Action,   // 操作类型了
  content? : string,   // 消息内容
  to_type? : Type,
  cnt_type?: string,   // 消息格式
}

export interface IosbirdIOSMessage {
  action   : string,
  to_type  : Type,
  s_type   : Type,
  id       : string,
  cnt_type?: string,
  content  : string,
  mem_id   : string,
  u_id     : string,
  type     : Type,
  name     : string,
  msgId    : string,
}

export class IosbirdWebSocket extends EventEmitter {
  private ws: WebSocket | undefined

  constructor (
    private endpoint: string,
    private botId   : string,
  ) {
    super()
    log.verbose('IosBirdWebSocket', 'constructor(%s, %s)', this.endpoint, this.botId)
  }

  public async start () {
    log.verbose('IosbirdWebSocket', 'start()')
    this.ws = new WebSocket(`ws://${this.endpoint}`)
    await this.initWebSocket()
  }
  private async initWebSocket () {
    if (!this.ws) {
      throw new Error('There is no websocket connect')
    }
    /**
     * Wait the Websocket to be connected
     */
    await new Promise((resolve, reject) => {
      this.ws!.once('open', () => {
        log.verbose('IosbirdWebSocket', 'initWebSocket() Promise() ws.on(open)')
        const msg: IosbirdWebSocketMessage = {
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
      messagePayload.msgId = uuid() as string
      this.emit('message', messagePayload as IosbirdIOSMessage)
    })
  }
}

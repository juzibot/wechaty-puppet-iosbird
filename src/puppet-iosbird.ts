/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import path  from 'path'

import {
  FileBox,
}             from 'file-box'

import LRU      from 'lru-cache'

import {
  ContactGender,
  ContactPayload,
  ContactType,

  FriendshipPayload,

  MessagePayload,
  MessageType,

  Puppet,
  PuppetOptions,

  Receiver,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,
}                                   from '../wechaty-puppet/src'

import {
  BOT_ID,
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
  log,
  qrCodeForChatie,
  VERSION,
  WEBSOCKET_SERVER,
}                                   from './config'
import {
  IosbirdWebSocket,
  IosbirdMessagePayload,
  Type
}                                   from './iosbird-ws'
import { messageType } from './pure-function-helpers/message-type'
import { isRoomId, isContactId } from './pure-function-helpers/is-type';

export interface IosbirdContactRawPayload {
  name : string,
}

export interface IosbirdRoomRawPayload {
  topic      : string,
  memberList : string[],
  ownerId    : string,
}

export class PuppetIosbird extends Puppet {

  public static readonly VERSION = VERSION

  private readonly cacheIosbirdMessagePayload: LRU.Cache<string, IosbirdMessagePayload>

  private loopTimer?: NodeJS.Timer

  private websocket: IosbirdWebSocket

  constructor (
    public options: PuppetOptions = {},
  ) {
    super(options)
    const lruOptions: LRU.Options = {
      max: 1000,
      // length: function (n) { return n * 2},
      dispose (key: string, val: any) {
        log.silly('PuppetIosbird', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    this.cacheIosbirdMessagePayload = new LRU<string, IosbirdMessagePayload>(lruOptions)
     this.websocket = new IosbirdWebSocket(WEBSOCKET_SERVER, BOT_ID)
  }

  public async start (): Promise<void> {
    log.verbose('PuppetIosbird', `start()`)

    this.state.on('pending')
    // await some tasks...
    this.websocket.on('login', (id) => {
      this.id = id
      this.emit('login', this.id as string)
      this.state.on(true)
    })
    this.websocket.on('error', (error: Error) => {
      this.emit('error', error)
    })

    /**
     * Save meaage for future usage
     */
    this.websocket.on('message', (message: IosbirdMessagePayload) => {
      this.cacheIosbirdMessagePayload.set(message.msgId, message)

      // TODO:
      /**
       * Check for Different Message Type
       */
      this.emit('message', message.msgId)
    })
    await this.websocket.start()
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetIosbird', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetIosbird', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    if (this.loopTimer) {
      clearInterval(this.loopTimer)
    }

    // await some tasks...
    this.state.off(true)
  }

  public async logout (): Promise<void> {
    log.verbose('PuppetIosbird', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', this.id) // becore we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: do the logout job
  }

  /**
   *
   * ContactSelf
   *
   *
   */
  public async contactSelfQrcode (): Promise<string> {
    log.verbose('PuppetIosbird', 'contactSelfQrcode()')
    return CHATIE_OFFICIAL_ACCOUNT_QRCODE
  }

  public async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetIosbird', 'contactSelfName(%s)', name)
    return
  }

  public async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetIosbird', 'contactSelfSignature(%s)', signature)
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias (contactId: string)                      : Promise<string>
  public contactAlias (contactId: string, alias: string | null): Promise<void>

  public async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetIosbird', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      return 'iosbird alias'
    }
    return
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetIosbird', 'contactList()')

    return []
  }

  public async contactQrcode (contactId: string): Promise<string> {
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    throw new Error('not supported')
    // return await this.bridge.WXqr
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetIosbird', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (file) {
      return
    }

    /**
     * 2. get
     */
    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return FileBox.fromFile(WECHATY_ICON_PNG)
  }

  public async contactRawPayload (id: string): Promise<IosbirdContactRawPayload> {
    log.verbose('PuppetIosbird', 'contactRawPayload(%s)', id)
    const rawPayload: IosbirdContactRawPayload = {
      name : 'iosbird name',
    }
    return rawPayload
  }

  public async contactRawPayloadParser (rawPayload: IosbirdContactRawPayload): Promise<ContactPayload> {
    log.verbose('PuppetIosbird', 'contactRawPayloadParser(%s)', rawPayload)

    const payload: ContactPayload = {
      avatar : 'iosbird-avatar-data',
      gender : ContactGender.Unknown,
      id     : 'id',
      name   : 'iosbird-name',
      type   : ContactType.Unknown,
    }
    return payload
  }

  /**
   *
   * Message
   *
   */
  public async messageFile (id: string): Promise<FileBox> {
    return FileBox.fromBase64(
      'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
      'iosbird-file' + id + '.txt',
    )
  }

  public async messageUrl (messageId: string)  : Promise<UrlLinkPayload> {
    log.verbose('PuppetIosbird', 'messageUrl(%s)')

    return {
      title : 'iosbird title',
      url   : 'https://iosbird.url',
    }
  }

  public async messageRawPayload (id: string): Promise<IosbirdMessagePayload> {
    log.verbose('PuppetIosbird', 'messageRawPayload(%s)', id)
    const rawPayload = this.cacheIosbirdMessagePayload.get(id)
    if (!rawPayload) {
      throw new Error('no rawPayload')
    }
    return rawPayload
  }

  public async messageRawPayloadParser (rawPayload: IosbirdMessagePayload): Promise<MessagePayload> {
    log.verbose('PuppetIosbird', 'messagePayload(%s)', rawPayload)

    const type = messageType(rawPayload.cnt_type)
    let payloadBase = {
      id       : rawPayload.msgId,
      timestamp: Date.now(),
      type     : type,
      text     : rawPayload.content,
    }

    let fromId: undefined | string
    let roomId: undefined | string
    let toId:   undefined | string
    let mentionIdList: undefined | string[]

    /**
     * 1. Set Room Id
     */
    if (isRoomId(rawPayload.u_id)) {
      roomId = rawPayload.u_id
    } else {
      roomId = undefined
    }

    /**
     * 2. Set To Contact Id
     */
    if (isContactId(rawPayload.u_id)) {
      if (rawPayload.s_type === Type.WEB) {
        toId   = rawPayload.u_id
      } else {
        toId = BOT_ID
      }
    } else {
      toId   = undefined
    }

    /**
     * 3. Set From Contact Id
     */
    if (isContactId(rawPayload.u_id)) {
      if (rawPayload.s_type === Type.WEB) {
        fromId   = BOT_ID
      } else {
        fromId = rawPayload.u_id
      }
    } else {
      fromId = rawPayload.mem_id.split('$')[1]
      if (isRoomId(fromId)) {
        fromId = BOT_ID
      }
    }

    /**
     * 5.1 Validate Room & From ID
     */
    if (!roomId && !fromId) {
      throw Error('empty roomId and empty fromId!')
    }
    /**
     * 5.1 Validate Room & To ID
     */
    if (!roomId && !toId) {
      throw Error('empty roomId and empty toId!')
    }

    let payload: MessagePayload

    // Two branch is the same code.
    // Only for making TypeScript happy
    if (fromId && toId) {
      payload = {
        ...payloadBase,
        fromId,
        mentionIdList,
        roomId,
        toId,
      }
    } else if (roomId) {
      payload = {
        ...payloadBase,
        fromId,
        mentionIdList,
        roomId,
        toId,
      }
    } else {
      throw new Error('neither toId nor roomId')
    }
    return payload
  }

  public async messageSendText (
    receiver : Receiver,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'messageSend(%s, %s)', receiver, text)


  }

  public async messageSendFile (
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'messageSend(%s, %s)', receiver, file)
  }

  public async messageSendContact (
    receiver  : Receiver,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'messageSend("%s", %s)', JSON.stringify(receiver), contactId)
    return
  }

  public async messageSendUrl (to: Receiver, urlLinkPayload: UrlLinkPayload) : Promise<void> {
    log.verbose('PuppetIosbird', 'messageSendUrl("%s", %s)',
                              JSON.stringify(to),
                              JSON.stringify(urlLinkPayload),
                )
  }

  public async messageForward (
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'messageForward(%s, %s)',
                              receiver,
                              messageId,
              )
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayload (
    id: string,
  ): Promise<IosbirdRoomRawPayload> {
    log.verbose('PuppetIosbird', 'roomRawPayload(%s)', id)

    const rawPayload: IosbirdRoomRawPayload = {
      memberList: [],
      ownerId   : 'iosbird_room_owner_id',
      topic     : 'iosbird topic',
    }
    return rawPayload
  }

  public async roomRawPayloadParser (
    rawPayload: IosbirdRoomRawPayload,
  ): Promise<RoomPayload> {
    log.verbose('PuppetIosbird', 'roomRawPayloadParser(%s)', rawPayload)

    const payload: RoomPayload = {
      id           : 'id',
      memberIdList : [],
      topic        : 'iosbird topic',
    }

    return payload
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetIosbird', 'roomList()')

    return []
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'roomDel(%s, %s)', roomId, contactId)
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetIosbird', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetIosbird', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'roomAdd(%s, %s)', roomId, contactId)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetIosbird', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'iosbird room topic'
    }
    return
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetIosbird', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'iosbird_room_id'
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetIosbird', 'roomQuit(%s)', roomId)
  }

  public async roomQrcode (roomId: string): Promise<string> {
    return roomId + ' iosbird qrcode'
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetIosbird', 'roommemberList(%s)', roomId)
    return []
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<any>  {
    log.verbose('PuppetIosbird', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    return {}
  }

  public async roomMemberRawPayloadParser (rawPayload: any): Promise<RoomMemberPayload>  {
    log.verbose('PuppetIosbird', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return {
      avatar    : 'iosbird-avatar-data',
      id        : 'xx',
      name      : 'iosbird-name',
      roomAlias : 'yy',
    }
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    if (text) {
      return
    }
    return 'iosbird announcement for ' + roomId
  }

  /**
   *
   * Room Invitation
   *
   */
  public async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetIosbird', 'roomInvitationAccept(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayload (roomInvitationId: string): Promise<any> {
    log.verbose('PuppetIosbird', 'roomInvitationRawPayload(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayloadParser (rawPayload: any): Promise<RoomInvitationPayload> {
    log.verbose('PuppetIosbird', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string)            : Promise<any> {
    return { id } as any
  }
  public async friendshipRawPayloadParser (rawPayload: any) : Promise<FriendshipPayload> {
    return rawPayload
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'friendshipAccept(%s)', friendshipId)
  }

  public ding (data?: string): void {
    log.silly('PuppetIosbird', 'ding(%s)', data || '')
    this.emit('dong', data)
    return
  }

  public unref (): void {
    log.verbose('PuppetIosbird', 'unref()')
    super.unref()
    if (this.loopTimer) {
      this.loopTimer.unref()
    }
  }
}

export default PuppetIosbird

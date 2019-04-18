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

import {
  FileBox,
}                                       from 'file-box'

import LRU                              from 'lru-cache'

import {
  ContactGender,
  ContactPayload,
  ContactType,

  FriendshipPayload,

  MessagePayload,

  Puppet,
  PuppetOptions,

  Receiver,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,
  MessageType,
}                                       from 'wechaty-puppet'

import {
  BOT_ID,
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
  log,
  qrCodeForChatie,
  VERSION,
  WEBSOCKET_SERVER,
}                                       from './config'
import {
  Type,
}                                       from './iosbird-ws'
import { messageType }                  from './pure-function-helpers/message-type'
import {
  isRoomId,
  isContactId
}                                       from './pure-function-helpers/is-type'
import {
  IosbirdMessagePayload,
  IosbirdContactPayload,
  IosbirdRoomMemberPayload,
  IosbirdMessageType
}                                       from './iosbird-schema'
import { IosbirdManager }               from './iosbird-manager'
import { linkMessageParser }            from './pure-function-helpers/message-link-payload-parser'
import {
  roomJoinEventMessageParser,
                                  }     from './pure-function-helpers/room-event-join-message-parser'
import flatten                          from 'array-flatten'
import { fileMessageParser }            from './pure-function-helpers/message-file-payload-parser'
import {
  roomTopicEventMessageParser,
}                                       from './pure-function-helpers/room-event-topic-message-parser'
import {
  friendshipConfirmEventMessageParser,
  friendshipReceiveEventMessageParser,
  friendshipVerifyEventMessageParser
}                                       from './pure-function-helpers/friendship-event-message-parser'
import { friendshipRawPayloadParser }   from './pure-function-helpers/friendship-raw-payload-parser'
import { roomInviteEventMessageParser } from './pure-function-helpers/room-event-invite-message-parser'


export interface IosbirdRoomRawPayload {
  topic      : string,     // 群名称
  memberList?: string[],   // 群成员
  ownerId?   : string,     // 群主ID
  roomId     : string,     // 群ID
}

export class PuppetIosbird extends Puppet {

  public static readonly VERSION = VERSION

  private readonly cacheIosbirdMessagePayload: LRU.Cache<string, IosbirdMessagePayload>

  private loopTimer?: NodeJS.Timer

  private iosbirdManager: IosbirdManager


  constructor (
    public options: PuppetOptions = {},
  ) {
    super(options)
    this.iosbirdManager = new IosbirdManager (WEBSOCKET_SERVER, BOT_ID)
    const lruOptions: LRU.Options = {
      max: 10000,
      // length: function (n) { return n * 2},
      dispose (key: string, val: any) {
        log.silly('PuppetIosbird', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    this.cacheIosbirdMessagePayload = new LRU<string, IosbirdMessagePayload>(lruOptions)
  }

  public async start (): Promise<void> {
    log.verbose('PuppetIosbird', `start()`)

    this.state.on('pending')
    // await some tasks...
    this.iosbirdManager.on('login', (id) => {
      this.id = id

      this.emit('login', this.id as string)
      this.state.on(true)
    })
    this.iosbirdManager.on('error', (error: Error) => {
      this.emit('error', error)
    })

    this.iosbirdManager.on('ready', () => this.emit('ready'))

    /**
     * Save meaage for future usage
     */
    this.iosbirdManager.on('message', (message: IosbirdMessagePayload) => {
      this.onIosbirdMessage(message)
    })
    await this.iosbirdManager.start()
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetIosbird', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetIosbird', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')
    await this.iosbirdManager.stop()
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
  }

  protected async onIosbirdMessage (rawPayload: IosbirdMessagePayload): Promise<void> {
    log.verbose('PuppetIosbird', 'onIosbirdMessage({id=%s})',
                                rawPayload.msgId,
              )
    /**
     * 0. Discard messages when not logged in
     */
    if (!this.id) {
      log.warn('PuppetIosbird', 'onIosbirdMessage(%s) discarded message because puppet is not logged-in', JSON.stringify(rawPayload))
      return
    }

    /**
     * 1. Save message for future usage
     */
    this.cacheIosbirdMessagePayload.set(
      rawPayload.msgId,
      rawPayload,
    )

    /**
     * 2. Check for Different Message Types
     */
    switch (rawPayload.cnt_type) {
      case IosbirdMessageType.SYS:
        await Promise.all([
          this.onIosbirdMessageFriendshipEvent(rawPayload),
          ////////////////////////////////////////////////
          this.onIosbirdMessageRoomEventJoin(rawPayload),
          // this.onPadchatMessageRoomEventLeave(rawPayload),
          this.onPadchatMessageRoomEventTopic(rawPayload),
        ])
        break
      case IosbirdMessageType.APP: {
        await this.onPadproMessageRoomInvitation(rawPayload)
        break
      }
      case IosbirdMessageType.PICTURE:
      case IosbirdMessageType.VEDIO:
      case IosbirdMessageType.TEXT:
      default:
        this.emit('message', rawPayload.msgId)
        break
    }
  }

  /**
   * Look for room join event
   */
  protected async onIosbirdMessageRoomEventJoin (rawPayload: IosbirdMessagePayload): Promise<void> {
    log.verbose('PuppetIosbird', 'onIosbirdMessageRoomEventJoin({id=%s})', rawPayload.msgId)

    const roomJoinEvent = await roomJoinEventMessageParser(rawPayload)

    if (roomJoinEvent) {
      const inviteeNameList = roomJoinEvent.inviteeNameList
      const inviterName     = roomJoinEvent.inviterName
      const roomId          = roomJoinEvent.roomId
      log.silly('PuppetIosbird', 'onIosbirdMessageRoomEventJoin() roomJoinEvent="%s"', JSON.stringify(roomJoinEvent))
      /**
       * Set Cache Dirty
       */
      await this.roomPayloadDirty(roomId)
      await this.roomMemberPayloadDirty(roomId)
      // 重新从底层获取数据
      await this.iosbirdManager.roomMemberRawPayload(roomId, true)

      // const inviteeIdList = [this.roomMemberSearch(roomId, inviteeNameList[0])]
      const inviteeIdList = flatten<string>(
        await Promise.all(
          inviteeNameList.map(
            inviteeName => this.roomMemberSearch(roomId, inviteeName),
          ),
        ),
      )

      const inviterIdList = await this.roomMemberSearch(roomId, inviterName)

      log.silly('PuppetIosbird', `onIosbirdMessageRoomEventJoin() inviterIdList: ${inviteeIdList}` )

      if (inviterIdList.length < 1) {
        throw new Error('no inviterId found')
      }
      const inviterId = inviterIdList[0]
      this.emit('room-join', roomId, inviteeIdList,  inviterId)
    }
  }

  /**
   * Look for room join event
   */
  protected async onPadchatMessageRoomEventTopic (rawPayload: IosbirdMessagePayload): Promise<void> {
    log.verbose('PuppetIosbird', 'onIosbirdMessageRoomEventJoin({id=%s})', rawPayload.msgId)

    const roomTopicEvent = roomTopicEventMessageParser(rawPayload)

    if (roomTopicEvent) {
      const changerName = roomTopicEvent.changerName
      const newTopic    = roomTopicEvent.topic
      const roomId      = roomTopicEvent.roomId
      log.silly('PuppetIosbird', 'onIosbirdMessageRoomEventTopic() roomTopicEvent="%s"', JSON.stringify(roomTopicEvent))
      // 查找旧群名
      const roomOldPayload = await this.roomPayload(roomId)
      const oldTopic       = roomOldPayload.topic

      // 查找修改群名的成员
      const changerIdList = await this.roomMemberSearch(roomId, changerName)
      if (changerIdList.length < 1) {
        throw new Error('no changerId found')
      } else if (changerIdList.length > 1) {
        log.warn('PuppetPadchat', 'onPadchatMessage() case PadchatMesssageSys: changerId found more than 1, use the first one.')
      }
      const changerId = changerIdList[0]

      if (!this.iosbirdManager) {
        throw new Error('no padchatManager')
      }
      /**
       * Set Cache Dirty
       */
      // 需要重新加载群数据
      await this.roomPayloadDirty(roomId)
      await this.iosbirdManager.syncContactsAndRooms(true)

      this.emit('room-topic',  roomId, newTopic, oldTopic, changerId)
    }
  }

  /**
   * Look for friendship event
   */
  protected async onIosbirdMessageFriendshipEvent (rawPayload: IosbirdMessagePayload): Promise<void> {
    log.verbose('PuppetIosbird', 'onIosbirdMessageFriendshipEvent({id=%s})', rawPayload.msgId)

    /**
     * 1. Look for friendship confirm event
     */
    const friendshipConfirmContactId = friendshipConfirmEventMessageParser(rawPayload)
    /**
     * 2. Look for friendship receive event
     */
    const friendshipReceiveContactId = await friendshipReceiveEventMessageParser(rawPayload)
    /**
     * 3. Look for friendship verify event
     */
    const friendshipVerifyContactId = friendshipVerifyEventMessageParser(rawPayload)
    if (   friendshipConfirmContactId
        || friendshipReceiveContactId
        || friendshipVerifyContactId
    ) {
      // Maybe load contact here since we know a new friend is added
      this.emit('friendship', rawPayload.msgId)
    }
  }

  /**
   *  Look for join room invitation event
   * @param rawPayload
   */
  protected async onPadproMessageRoomInvitation (rawPayload: IosbirdMessagePayload): Promise<void> {
    log.verbose('PuppetIosbird', 'onPadproMessageRoomInvitation(%s)', rawPayload)
    const roomInviteEvent = await roomInviteEventMessageParser(rawPayload)

    if (roomInviteEvent) {
      this.emit('room-invite', roomInviteEvent.id)
    } else {
      this.emit('message', rawPayload.msgId)
    }
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
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    await this.iosbirdManager.modifyContactAlias(name)
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
      const payload = await this.contactPayload(contactId)
      return payload.alias || ''
    }
    return
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetIosbird', 'contactList()')
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }

    const contactIdList = this.iosbirdManager.getContactIdList()

    return contactIdList
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
      throw new Error('not supported yet!')
    }

    /**
     * 2. get
     */
    const payload = await this.contactPayload(contactId)

    if (!payload.avatar) {
      throw new Error('no avatar')
    }

    const fileBox = FileBox.fromUrl(
      payload.avatar,
      `wechaty-contact-avatar-${payload.name}.jpg`,
    )
    return fileBox
  }

  public async contactRawPayload (id: string): Promise<IosbirdContactPayload> {
    log.verbose('PuppetIosbird', 'contactRawPayload(%s)', id)
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    const rawPayload = await this.iosbirdManager.contactRawPayload(id)
    return rawPayload
  }

  public async contactRawPayloadParser (rawPayload: IosbirdContactPayload): Promise<ContactPayload> {
    log.verbose('PuppetIosbird', 'contactRawPayloadParser(%s)', rawPayload)
    const contactId = rawPayload.id.split('$')[1]
    const payload: ContactPayload = {
      avatar: rawPayload.avatar || 'http://www.botorange.com',
      gender: ContactGender.Unknown,
      id    : contactId,
      name  : rawPayload.name!,
      type  : ContactType.Unknown,
      alias : rawPayload.nick,
      friend: rawPayload.isFriend === 1 ? true : false,
    }
    return payload
  }

  /**
   *
   * Message
   *
   */
  public async messageFile (id: string): Promise<FileBox> {
    log.verbose('PuppetIosbird', 'messageUrl(%s)', id)
    const rawPayload = await this.messageRawPayload(id)
    const payload = await this.messagePayload(id)

    if (payload.type !== MessageType.Attachment) {
      throw new Error('Can not get url from non url payload')
    } else {
      const file = await fileMessageParser(rawPayload)
      return FileBox.fromUrl(file.url, file.title)
    }
  }

  public async messageUrl (messageId: string)  : Promise<UrlLinkPayload> {
    log.verbose('PuppetIosbird', 'messageUrl(%s)', messageId)
    const rawPayload = await this.messageRawPayload(messageId)
    const payload = await this.messagePayload(messageId)

    if (payload.type !== MessageType.Url) {
      throw new Error('Can not get url from non url payload')
    } else {
      const link = await linkMessageParser(rawPayload)
      return link
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
    log.verbose('PuppetIosbird', 'messagePayload(%s)', rawPayload.msgId)

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
    } else if (rawPayload.mem_id) {
      fromId = rawPayload.mem_id.split('$')[1]
      if (isRoomId(fromId)) {
        fromId = BOT_ID
      }
    }

    /**
     * 4.1 Validate Room & From ID
     */
    if (!roomId && !fromId) {
      throw Error('empty roomId and empty fromId!')
    }
    /**
     * 4.1 Validate Room & To ID
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
        roomId,
        toId,
      }
    } else if (roomId) {
      payload = {
        ...payloadBase,
        fromId,
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
      if (receiver.roomId) {
        this.iosbirdManager.sendMessage(receiver.roomId, text, IosbirdMessageType.TEXT)
        return
      }
    if (receiver.contactId) {
      this.iosbirdManager.sendMessage(receiver.contactId, text, IosbirdMessageType.TEXT)
    }

  }

  // TODO:
  public async messageSendFile (
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'messageSend(%s, %s)', receiver, file)
    log.warn('MessageSendFile Unsupported')
    throw new Error('MessageSendFile is not supported yet')
  }

  // TODO:
  public async messageSendContact (
    receiver  : Receiver,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'messageSend("%s", %s)', JSON.stringify(receiver), contactId)
    log.warn('MessageSendContact Unsupported')
    throw new Error('messageSendContact is not supported yet')
  }

  // TODO:
  public async messageSendUrl (to: Receiver, urlLinkPayload: UrlLinkPayload) : Promise<void> {
    log.verbose('PuppetIosbird', 'messageSendUrl("%s", %s)',
                              JSON.stringify(to),
                              JSON.stringify(urlLinkPayload),
                )
    log.warn('MessageSendUrl Unsupported!')
    throw new Error('messageSendUrl is not supported yet')
  }

  public async messageForward (
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'messageForward(%s, %s)',
                              receiver,
                              messageId,
    )
    const rawPayload = this.cacheIosbirdMessagePayload.get(messageId)
    if (!rawPayload) {
      throw new Error('There is no message related to messageId: ' + messageId)
    }
    const type = rawPayload.cnt_type
    switch(type) {
      case IosbirdMessageType.TEXT:
        /**
         * Send Private Message
         */
        if (receiver.roomId) {
          this.iosbirdManager.sendMessage(receiver.roomId, rawPayload.content, IosbirdMessageType.TEXT)
        } else if (receiver.contactId) {
          this.iosbirdManager.sendMessage(receiver.contactId, rawPayload.content, IosbirdMessageType.TEXT)
        } else {
          throw new Error(`receiver can't be null`)
        }
        break
      case IosbirdMessageType.PICTURE:
        if (receiver.roomId) {
          this.iosbirdManager.sendMessage(receiver.roomId, rawPayload.content, IosbirdMessageType.PICTURE)
        } else if (receiver.contactId) {
          this.iosbirdManager.sendMessage(receiver.contactId, rawPayload.content, IosbirdMessageType.PICTURE)
        } else {
          throw new Error(`receiver can't be null`)
        }
        break
      default:
        throw new Error(`can't support the message type`)
    }
  }

  /**
   *
   * Room
   *
   */

  public async roomMemberPayloadDirty (roomId: string) {
    log.silly('PuppetIosbird', 'roomMemberRawPayloadDirty(%s)', roomId)

    await super.roomMemberPayloadDirty(roomId)

    if (this.iosbirdManager) {
      this.iosbirdManager.roomMemberRawPayloadDirty(roomId)
    }
  }

  public async roomPayloadDirty (roomId: string): Promise<void> {
    log.verbose('PuppetIosbird', 'roomPayloadDirty(%s)', roomId)
    if (this.iosbirdManager) {
      this.iosbirdManager.roomRawPayloadDirty(roomId)
    }

    await super.roomPayloadDirty(roomId)
  }
  public async roomRawPayload (
    id: string,
  ): Promise<IosbirdContactPayload> {
    log.verbose('PuppetIosbird', 'roomRawPayload(%s)', id)
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    const rawPayload = await this.iosbirdManager.roomRawPayload(id)
    return rawPayload
  }

  public async roomRawPayloadParser (
    rawPayload: IosbirdContactPayload,
  ): Promise<RoomPayload> {
    log.verbose('PuppetIosbird', 'roomRawPayloadParser(%s)', rawPayload)
    const roomId = rawPayload.id.split('$')[1]
    const memberIdList = await this.roomMemberList(roomId)
    const payload: RoomPayload = {
      id          : roomId,
      memberIdList: memberIdList,
      topic       : rawPayload.nick,
      ownerId     : '',                // no support now
    }

    return payload
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetIosbird', 'roomList()')
    if (! this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    const roomIdList = await this.iosbirdManager.getRoomIdList()
    return roomIdList
  }

  // 群主踢人
  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'roomDel(%s, %s)', roomId, contactId)
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }

    const memberIdList = await this.roomMemberList(roomId)
    if (memberIdList.includes(contactId)) {
      await this.iosbirdManager.deleteChatRoomMember(roomId, contactId)
    } else {
      log.warn('PuppetPadchat', 'roomDel() room(%s) has no member contact(%s)', roomId, contactId)
    }
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
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }

    log.verbose('PuppetPadchat', 'roomAdd(%s, %s) try to Add', roomId, contactId)
    await this.iosbirdManager.addChatRoomMember(roomId, contactId)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetIosbird', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      const payload = await this.roomPayload(roomId)
      return payload.topic
    }
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    await this.iosbirdManager.modifyRoomTopic(roomId, topic)
    return
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetIosbird', 'roomCreate(%s, %s)', contactIdList, topic)
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    const roomId = await this.iosbirdManager.createRoom(contactIdList)
    await this.iosbirdManager.modifyRoomTopic(roomId, topic)
    return roomId
  }

  // 机器人自己退群
  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetIosbird', 'roomQuit(%s)', roomId)
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    await this.iosbirdManager.roomQuit(roomId)
  }

  public async roomQrcode (roomId: string): Promise<string> {
    if (!this.iosbirdManager) {
      throw new Error('no iosbird manager')
    }
    const qrcode = await this.iosbirdManager.roomQrcode(roomId)
    return qrcode
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetIosbird', 'roomMemberList(%s)', roomId)
    if (!this.iosbirdManager) {
      throw new Error('no padchat manager')
    }
    const memberList = await this.iosbirdManager.getRoomMemberIdList(roomId)
    return memberList
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<IosbirdRoomMemberPayload>  {
    log.verbose('PuppetIosbird', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    if (!this.iosbirdManager) {
      throw new Error('no padchat manager')
    }

    const memberDictRawPayload = await this.iosbirdManager.roomMemberRawPayload(roomId)
    if (!memberDictRawPayload) {
      throw new Error('roomId not found: ' + roomId)
    }
    return memberDictRawPayload[contactId]
  }

  public async roomMemberRawPayloadParser (rawPayload: IosbirdRoomMemberPayload): Promise<RoomMemberPayload>  {
    log.verbose('PuppetIosbird', 'roomMemberRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return {
      avatar   : rawPayload.wechat_img,
      id       : rawPayload.wechat_id,
      name     : rawPayload.wechat_nick,
      roomAlias: rawPayload.wechat_real_nick,
    }
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    if (text) {
      log.info('PuppetIosbird', 'roomAnnounce(%s, %s)', roomId, text)
      if (!this.iosbirdManager) {
        throw new Error('no padchat manager')
      }
      await this.iosbirdManager.setAnnouncement(roomId, text)
      return
    }
    log.info('PuppetIosbird', 'roomAnnounce(%s)', roomId)
    // TODO: return annoucement
    log.warn ('get roomAnnounce is not support now!!!')
    return 'It is not support now.'
  }

  /**
   *
   * Room Invitation
   *
   */
  // TODO:
  public async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetIosbird', 'roomInvitationAccept(%s)', roomInvitationId)
    throw new Error ('room invitation accept is not supported yet')
  }

  public async roomInvitationRawPayload (roomInvitationId: string): Promise<IosbirdMessagePayload> {
    log.verbose('PuppetIosbird', 'roomInvitationRawPayload(%s)', roomInvitationId)
    const rawPayload = this.cacheIosbirdMessagePayload.get(roomInvitationId)
    if (!rawPayload) {
      throw new Error('no rawPayload')
    }
    return rawPayload
  }

  public async roomInvitationRawPayloadParser (rawPayload: IosbirdMessagePayload): Promise<RoomInvitationPayload> {
    log.verbose('PuppetIosbird', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    const roomInvitationPayload = await roomInviteEventMessageParser(rawPayload)
    if (! roomInvitationPayload) {
      throw new Error(`payload content of roomInvitationId: ${rawPayload.msgId} can not parse`)
    }
    return roomInvitationPayload
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string): Promise<IosbirdMessagePayload> {
    log.verbose('PuppetIosbird', 'friendshipRawPayload(%s)', id)
    const rawPayload = this.cacheIosbirdMessagePayload.get(id)
    if (!rawPayload) {
      throw new Error('no rawPayload')
    }
    return rawPayload
  }
  public async friendshipRawPayloadParser (rawPayload: IosbirdMessagePayload) : Promise<FriendshipPayload> {
    log.verbose('PuppetIosbird', `friendshipRawPayloadParser({id=${rawPayload.msgId}})`)

    const payload: FriendshipPayload = await friendshipRawPayloadParser(rawPayload)
    return payload
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'friendshipAdd(%s, %s)', contactId, hello)
    if (!this.iosbirdManager) {
      throw new Error('no padchat manager')
    }
    await this.iosbirdManager.friendshipAdd(contactId, hello)
  }

  // TODO:
  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetIosbird', 'friendshipAccept(%s)', friendshipId)
    throw new Error ('Friendship accept is not supprted yet!!!')
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

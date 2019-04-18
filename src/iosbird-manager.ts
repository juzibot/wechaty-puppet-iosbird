import {
  Type,
  Action,
  IosbirdWebSocket,
  IosbirdIOSContactList,
  RoomMemberDict,
                            } from './iosbird-ws'
import { FlashStoreSync     } from 'flash-store'
import {
  IosbirdContactPayload,
  IosbirdRoomMemberPayload,
  IosbirdAvatarSchema,
                            } from './iosbird-schema'
import { log                } from './config'
import * as path              from 'path'
import os                     from 'os'
import fs                     from 'fs-extra'
import { memberToContact }    from './pure-function-helpers/member-to-contact'
import { DedupeApi }          from './dedupe-api'
import { queueApi }           from './queue-api'
export class IosbirdManager extends IosbirdWebSocket {

  private cacheContactRawPayload?     : FlashStoreSync<string, IosbirdContactPayload>
  private cacheRoomRawPayload?        : FlashStoreSync<string, IosbirdContactPayload>
  private cacheRoomMemberRawPayload?  : FlashStoreSync<string, {
    [contactId: string]: IosbirdRoomMemberPayload,
  }>

  private dedudeApi: DedupeApi

  constructor(endpoint: string, botId: string) {
    super(endpoint, botId)
    this.dedudeApi = DedupeApi.Instance
  }

  public async start(): Promise<void> {
    log.verbose('IosbirdManager', 'start()')
    await this.initCache(this.botId)
    return new Promise<void> (async (resolve, reject) => {
      this.on('connect', async (botId) => {
        this.emit('login', botId)
        // 加载数据, 加载完成, 发布ready事件
        this.syncData()
      })
      await super.initWebSocket()
    })
  }

  public async syncData () {
    await this.syncContactsAndRooms()
    await this.syncAllRoomMember()
    // sync avatar of contact
    await this.dedudeApi.dedupe(this.syncAvatarAsync, this)
    this.emit('ready')
  }

  public async stop () {
    log.verbose('IosbirdManager', 'stop()')
    await this.releaseCache()
  }
  private async initCache (
    userId : string,
  ): Promise<void> {
    log.verbose('IosbirdManager', 'initCache(%s)', userId)

    if (   this.cacheContactRawPayload
        || this.cacheRoomMemberRawPayload
        || this.cacheRoomRawPayload
    ) {
      throw new Error('cache exists')
    }

    const baseDir = path.join(
      os.homedir(),
      path.sep,
      '.wechaty',
      'puppet-iosbird-cache',
      path.sep,
      userId,
    )

    const baseDirExist = await fs.pathExists(baseDir)

    if (!baseDirExist) {
      await fs.mkdirp(baseDir)
    }

    this.cacheContactRawPayload    = new FlashStoreSync(path.join(baseDir, 'contact-raw-payload'))
    this.cacheRoomMemberRawPayload = new FlashStoreSync(path.join(baseDir, 'room-member-raw-payload'))
    this.cacheRoomRawPayload       = new FlashStoreSync(path.join(baseDir, 'room-raw-payload'))

    await Promise.all([
      this.cacheContactRawPayload.ready(),
      this.cacheRoomMemberRawPayload.ready(),
      this.cacheRoomRawPayload.ready(),
    ])

    const roomMemberTotalNum = [...this.cacheRoomMemberRawPayload.values()].reduce(
      (accuVal, currVal) => {
        return accuVal + Object.keys(currVal).length
      },
      0,
    )

    log.verbose('PuppetIosbird', 'initCache() inited %d Contacts, %d RoomMembers, %d Rooms, cachedir="%s"',
                                      this.cacheContactRawPayload.size,
                                      roomMemberTotalNum,
                                      this.cacheRoomRawPayload.size,
                                      baseDir,
              )
  }

  private async releaseCache (): Promise<void> {
    log.verbose('PuppetIosbird', 'releaseCache()')

    if (   this.cacheContactRawPayload
        && this.cacheRoomMemberRawPayload
        && this.cacheRoomRawPayload
    ) {
      log.silly('PuppetIosbird', 'releaseCache() closing caches ...')

      await Promise.all([
        this.cacheContactRawPayload.close(),
        this.cacheRoomMemberRawPayload.close(),
        this.cacheRoomRawPayload.close(),
      ])

      this.cacheContactRawPayload    = undefined
      this.cacheRoomMemberRawPayload = undefined
      this.cacheRoomRawPayload       = undefined

      log.silly('PuppetIosbird', 'releaseCache() cache closed.')
    } else {
      log.verbose('PuppetIosbird', 'releaseCache() cache not exist.')
    }
  }

  public async contactRawPayload(id: string, isForced: boolean = false): Promise<IosbirdContactPayload> {
    log.verbose('IosbirdManager', 'contactRawPayload(%s)', id)
    if (! this.cacheContactRawPayload) {
      throw new Error('cacheContactRawPayload is not exists')
    }
    let rawContactPayload = this.cacheContactRawPayload.get(id)
    if (rawContactPayload) {
      return rawContactPayload
    }
    await this.syncContactsAndRooms(isForced)
    // await this.syncContactsAndRooms()
    rawContactPayload = this.cacheContactRawPayload.get(id)
    if (rawContactPayload) {
      return rawContactPayload
    }

    throw new Error(`The contact of contactId: ${id} is not exisit`)
  }

  public async roomRawPayload(id: string, isForced: boolean = false): Promise<IosbirdContactPayload> {
    log.verbose('IosirdManager', 'roomRawPayload(%s)', id)
    if (! this.cacheRoomRawPayload) {
      throw new Error('cacheRoomRawPayload is not exists')
    }
    let rawRoomPayload = this.cacheRoomRawPayload.get(id)
    if (rawRoomPayload) {
      return rawRoomPayload
    }
    await this.syncContactsAndRooms(isForced)
    rawRoomPayload = this.cacheRoomRawPayload.get(id)
    if (rawRoomPayload) {
      return rawRoomPayload
    }
    throw new Error(`The room of id: ${id} is not exists!`)
  }

  public async getRoomIdList (isForced: boolean = false): Promise<string[]> {
    log.verbose('IosbirdManager', 'getRoomIdList()')
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not inited' )
    }
    let roomIdList = [...this.cacheRoomRawPayload.keys()]
    if (roomIdList && roomIdList.length === 0) {
      await this.syncContactsAndRooms(isForced)
      roomIdList = [...this.cacheRoomRawPayload.keys()]
    }
    log.verbose('IosbirdManager', 'getRoomIdList()=%d', roomIdList.length)
    return roomIdList
  }

  public async getRoomMemberIdList (roomId: string, isForced: boolean = false): Promise<string[]> {
    log.verbose('IosbirdManager', 'getRoomMemberIdList(%s)', roomId)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cacheRoomMemberRawPayload is not init')
    }
    const memberListDic = this.cacheRoomMemberRawPayload.get(roomId)
    if (memberListDic && Object.keys(memberListDic).length > 0) {
      return Object.keys(memberListDic)
    }
    let roomMemberListDict: RoomMemberDict
    if (!isForced) {
      roomMemberListDict = await this.dedudeApi.dedupe(this.syncRoomMembers, this, roomId)
    } else {
      roomMemberListDict = await queueApi.add(this.syncRoomMembers, this, roomId)
    }
    this.cacheRoomMemberRawPayload.set(roomMemberListDict.roomId, roomMemberListDict.roomMemberDict)
    return Object.keys(roomMemberListDict.roomMemberDict)
  }

  public async getContactIdList (isForced: boolean = false): Promise<string[]> {
    log.verbose('IosbirdManager', 'getContactIdList()')
    if (!this.cacheContactRawPayload) {
      throw new Error('cache not inited' )
    }
    let contactIdList = [...this.cacheContactRawPayload.keys()]
    if (contactIdList && contactIdList.length === 0) {
      await this.syncContactsAndRooms(isForced)
      contactIdList = [...this.cacheContactRawPayload.keys()]
    }

    log.silly('PuppetPadchatManager', 'getContactIdList() = %d', contactIdList.length)
    return contactIdList
  }

  public getContactLength (isFriend?: boolean): number {
    if (!this.cacheContactRawPayload) {
      throw new Error('cache not inited' )
    }
    const total = [... this.cacheContactRawPayload.keys()].length
    if (typeof isFriend === 'undefined') {
      return total
    }
    let friendNumber = 0
    const contactPayloads = this.cacheContactRawPayload.values()
    for (const contactData of contactPayloads) {
      if (contactData.isFriend === 1) {
        friendNumber++
      }
    }
    if (isFriend) {
      log.verbose('IosbirdManager', 'getContactLength(true)')
      return friendNumber
    }
    log.verbose('IosbirdManager', 'getContactLength(false)')
    return (total - friendNumber)
  }

  public async roomMemberRawPayload(roomId: string, isForced: boolean = false): Promise<{ [contactId: string]: IosbirdRoomMemberPayload }> {
    log.verbose('IosbirdManager', 'roomMemberRawPayload(%s)', roomId)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cacheRoomMemberRawPayload is not init')
    }
    if (this.cacheRoomMemberRawPayload.has(roomId)) {
      return this.cacheRoomMemberRawPayload.get(roomId)!
    }
    // const roomMemberListDict = await this.syncRoomMembers(roomId)
    let roomMemberListDict: RoomMemberDict
    if (!isForced) {
      roomMemberListDict = await this.dedudeApi.dedupe(this.syncRoomMembers, this, roomId)
    } else {
      roomMemberListDict = await queueApi.add(this.syncRoomMembers, this, roomId)
    }
    this.cacheRoomMemberRawPayload.set(roomMemberListDict.roomId, roomMemberListDict.roomMemberDict)
    return roomMemberListDict.roomMemberDict
  }

  public async syncContactsAndRooms (isForced: boolean = false): Promise<void> {
    log.verbose('IosbirdManager', 'syncContactsAndRooms ()')
    if ( (!this.cacheContactRawPayload) || (!this.cacheRoomRawPayload)) {
      throw new Error('cache is not exists')
    }
    let roomAndContactList: IosbirdIOSContactList
    if (!isForced) {
      roomAndContactList = await this.dedudeApi.dedupe(this.syncContactAndRoom, this)
    } else {
      roomAndContactList = await queueApi.add(this.syncContactAndRoom, this)
    }
    roomAndContactList.list.map((value) => {
      const id = value.id.split('$')[1]
      /**
       * Sync Room
       */
      if (value.c_type === '1') {
        this.cacheRoomRawPayload!.set(id, value)
      }
      /**
       * Sync Contact
       */
      if (value.c_type === '0') {
        value.isFriend = 1
        this.cacheContactRawPayload!.set(id, value)
      }
    })
    log.verbose('PuppetIosbird', 'syncContactsAndRooms() sync %d Contacts, %d Rooms',
      this.cacheContactRawPayload.size,
      this.cacheRoomRawPayload.size,
    )
  }

  public async syncAllRoomMember(isForced: boolean = false): Promise<void> {
    log.verbose('IosbirdManager', 'syncRoomMember()')
    if (! this.cacheRoomMemberRawPayload || !this.cacheContactRawPayload) {
      throw new Error('not cache: cacheRoomMemberRawPayload')
    }
    const roomList = await this.getRoomIdList()
    for (const roomId of roomList) {
      let roomMemberListDict: RoomMemberDict
      if (!isForced) {
        roomMemberListDict = await this.dedudeApi.dedupe(this.syncRoomMembers, this, roomId)
      } else {
        roomMemberListDict = await queueApi.add(this.syncRoomMembers, this, roomId)
      }
      this.cacheRoomMemberRawPayload!.set(roomMemberListDict.roomId, roomMemberListDict.roomMemberDict)
      const contactIds = Object.keys(roomMemberListDict.roomMemberDict)
      for (const contactId of contactIds) {
        if (this.cacheContactRawPayload.has(contactId)) {
          continue
        }
        const contactData = memberToContact (roomMemberListDict.roomMemberDict[contactId])
        this.cacheContactRawPayload.set(contactId, contactData)
      }
    }
  }

  public async syncAvatarAsync (): Promise<void> {
    log.verbose('IosbirdManager', 'syncAvatarAsync()')
    if (! this.cacheContactRawPayload) {
      throw new Error('cacheContactRawPayload not exist')
    }
    const contactNumber = this.getContactLength(true)
    const avatars: IosbirdAvatarSchema = {
      id: this.botId,
      list: [],
      type: Type.IOS,
      action: Action.AVATAR_LIST
    }
    this.on('avatar', (avatarList: IosbirdAvatarSchema) => {
      const imgList = avatarList.list
      avatars.list =  avatars.list.concat(imgList)
      log.info('Sync contact:', 'total: %s, completed: %s', contactNumber, avatars.list.length)
    })
    this.getAvatar()
    // 2分钟内没有加载完,便直接退出
    let count = 2 * 60
    while(avatars.list.length < contactNumber) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (--count === 0) {
        log.warn('Can\'t sync avatar in two minutes')
        break
      }
    }
    avatars.list.map(imgInfo => {
      const id = imgInfo.id.split('$')[1]
      const contactData = this.cacheContactRawPayload!.get(id)
      if (contactData) {
        contactData.avatar = imgInfo.img
        this.cacheContactRawPayload!.set(id, contactData)
      }
    })
  }

  public roomMemberRawPayloadDirty (
    roomId: string,
  ): void {
    log.verbose('IosbirdManager', 'roomMemberRawPayloadDirty(%d)', roomId)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited')
    }
    this.cacheRoomMemberRawPayload.delete(roomId)
  }

  public roomRawPayloadDirty (
    roomId: string,
  ): void {
    log.verbose('IosbirdManager', 'roomRawPayloadDirty(%d)', roomId)
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not inited' )
    }
    this.cacheRoomRawPayload.delete(roomId)
  }

  public async deleteChatRoomMember (roomId: string, contactId: string): Promise<void> {
    log.verbose('IosbirdManager', 'deleteChatRoomMember(%s, %s)', roomId, contactId)
    try {
      await super.deleteChatRoomMember(roomId, contactId)
    } catch(err) {
      log.error('IosbirdManager', 'deleteChatRoomMember() error: %s', err)
    }
  }

  public async addChatRoomMember (roomId: string, contactId: string): Promise<void> {
    log.verbose('IosbirdManager', 'addChatRoomMember(%s, %s)', roomId, contactId)
    try {
      await super.addChatRoomMember(roomId, contactId)
    } catch(err) {
      throw new Error(err)
    }
  }
}

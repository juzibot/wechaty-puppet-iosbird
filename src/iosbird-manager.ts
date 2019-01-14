import { IosbirdWebSocket, Type, Action } from './iosbird-ws'
import { FlashStoreSync } from 'flash-store'
import { IosbirdContactPayload, IosbirdRoomMemberPayload, IosbirdAvatarSchema } from './iosbird-schema'
import { log } from './config'
import * as path from 'path'
import os from 'os'
import fs from 'fs-extra'
import { memberToContact } from './pure-function-helpers/member-to-contact';
export class IosbirdManager extends IosbirdWebSocket {

  private cacheContactRawPayload?     : FlashStoreSync<string, IosbirdContactPayload>
  private cacheRoomRawPayload?        : FlashStoreSync<string, IosbirdContactPayload>
  private cacheRoomMemberRawPayload?  : FlashStoreSync<string, {
    [contactId: string]: IosbirdRoomMemberPayload,
  }>

  constructor(endpoint: string, botId: string) {
    super(endpoint, botId)

  }

  public async start(): Promise<void> {
    log.verbose('IosbirdManager', 'start()')
    await this.initCache(this.botId)
    return new Promise<void> (async (resolve, reject) => {
      this.on('connect', async (botId) => {
        await this.syncContactsAndRooms()
        await this.syncAllRoomMember()
        // sync avatar of contact
        await this.syncAvatarAsync()
        this.emit('login', botId)
      })
      await super.initWebSocket()
    })
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

  public async contactRawPayload(id: string): Promise<IosbirdContactPayload> {
    if (! this.cacheContactRawPayload) {
      throw new Error('cacheContactRawPayload is not exists')
    }
    let rawContactPayload = this.cacheContactRawPayload.get(id)
    if (rawContactPayload) {
      return rawContactPayload
    }
    await this.syncContactsAndRooms()
    rawContactPayload = this.cacheContactRawPayload.get(id)
    if (rawContactPayload) {
      return rawContactPayload
    }

    throw new Error(`The contact of contactId: ${id} is not exisit`)
  }

  public async roomRawPayload(id: string): Promise<IosbirdContactPayload> {
    if (! this.cacheRoomRawPayload) {
      throw new Error('cacheRoomRawPayload is not exists')
    }
    let rawRoomPayload = this.cacheRoomRawPayload.get(id)
    if (rawRoomPayload) {
      return rawRoomPayload
    }
    await this.syncContactsAndRooms()
    rawRoomPayload = this.cacheRoomRawPayload.get(id)
    if (rawRoomPayload) {
      return rawRoomPayload
    }
    throw new Error(`The room of id: ${id} is not exists!`)
  }

  public getRoomIdList (): string[] {
    log.verbose('IosbirdManager', 'getRoomIdList()')
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not inited' )
    }
    const roomIdList = [...this.cacheRoomRawPayload.keys()]
    log.verbose('IosbirdManager', 'getRoomIdList()=%d', roomIdList.length)
    return roomIdList
  }

  public async getRoomMemberIdList (roomId: string): Promise<string[]> {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cacheRoomMemberRawPayload is not init')
    }
    const memberListDic = this.cacheRoomMemberRawPayload.get(roomId)
    if (memberListDic && Object.keys(memberListDic).length > 0) {
      return Object.keys(memberListDic)
    }
    const roomMemberListDict = await this.syncRoomMembers(roomId)
    this.cacheRoomMemberRawPayload.set(roomMemberListDict.roomId, roomMemberListDict.roomMemberDict)
    return Object.keys(roomMemberListDict.roomMemberDict)
  }

  public async getContactIdList (): Promise<string[]> {
    log.verbose('IosbirdManager', 'getContactIdList()')
    if (!this.cacheContactRawPayload) {
      throw new Error('cache not inited' )
    }
    const contactIdList = [...this.cacheContactRawPayload.keys()]
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
      return friendNumber
    }
    return (total - friendNumber)
  }

  public async roomMemberRawPayload(roomId: string): Promise<{ [contactId: string]: IosbirdRoomMemberPayload }> {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cacheRoomMemberRawPayload is not init')
    }
    if (this.cacheRoomMemberRawPayload.has(roomId)) {
      return this.cacheRoomMemberRawPayload.get(roomId)!
    }
    const roomMemberListDict = await this.syncRoomMembers(roomId)
    this.cacheRoomMemberRawPayload.set(roomMemberListDict.roomId, roomMemberListDict.roomMemberDict)
    return roomMemberListDict.roomMemberDict
  }

  public async syncContactsAndRooms (): Promise<void> {
    log.verbose('IosbirdManager', 'syncContactsAndRooms ()')
    if ( (!this.cacheContactRawPayload) || (!this.cacheRoomRawPayload)) {
      throw new Error('cache is not exists')
    }
    const roomAndContactList = await this.syncContactAndRoom()
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

  public async syncAllRoomMember(): Promise<void> {
    log.verbose('IosbirdManager', 'syncRoomMember()')
    if (! this.cacheRoomMemberRawPayload || !this.cacheContactRawPayload) {
      throw new Error('not cache: cacheRoomMemberRawPayload')
    }
    const roomList = await this.getRoomIdList()
    for (const roomId of roomList) {
      const roomMemberListDict = await this.syncRoomMembers(roomId)
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
}

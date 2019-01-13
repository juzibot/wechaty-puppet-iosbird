import { IosbirdWebSocket } from './iosbird-ws'
import { FlashStoreSync } from 'flash-store'
import { IosbirdContactPayload, IosbirdRoomMemberPayload, IosbirdAvatarSchema } from './iosbird-schema'
import { log } from './config'
import * as path from 'path'
import os from 'os'
import fs from 'fs-extra'
export class IosbirdManager extends IosbirdWebSocket {

  private cacheContactRawPayload?     : FlashStoreSync<string, IosbirdContactPayload>
  private cacheRoomRawPayload?        : FlashStoreSync<string, IosbirdContactPayload>
  private cacheRoomMemberRawPayload?  : FlashStoreSync<string, {
    [contactId: string]: IosbirdRoomMemberPayload,
  }>

  constructor(endpoint: string, botId: string) {
    super(endpoint, botId)

  }

  public async start() {
    log.verbose('IosbirdManager', 'start()')
    await this.initCache(this.botId)
    await super.initWebSocket()
    await this.syncContactsAndRooms()
    await this.syncAllRoomMember()
    this.syncAvatarAsync()
  }

  public async stop () {
    log.verbose('IosbirdManager', 'stop()')
    await this.releaseCache()
  }
  private async initCache (
    userId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchatManager', 'initCache(%s)', userId)

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
    const contactList = await this.syncContactAndRoom()
    contactList.list.map((contact) => {
      if (contact.c_type === '0') {
        const contactId = contact.id.split('$')[1]
        contact.id        = contactId
        if (contactId === id){
          rawContactPayload = contact
        }
        this.cacheContactRawPayload!.set(contactId, contact)
      }
    })
    if (!rawContactPayload) {
      throw new Error(`The contact of contactId: ${id} is not exisit`)
    }
    return rawContactPayload
  }

  public async roomRawPayload(id: string): Promise<IosbirdContactPayload> {
    if (! this.cacheRoomRawPayload) {
      throw new Error('cacheRoomRawPayload is not exists')
    }
    let rawRoomPayload = this.cacheRoomRawPayload.get(id)
    if (rawRoomPayload) {
      return rawRoomPayload
    }
    const roomList = await this.syncContactAndRoom()
    roomList.list.map((room) => {
      if (room.c_type === '1') {
        const roomId = room.id.split('$')[1]
        if (roomId === id) {
          rawRoomPayload = room
        }
        room.id = roomId
        this.cacheRoomRawPayload!.set(roomId, room)
      }
    })
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
    if (this.cacheRoomMemberRawPayload.has(roomId)) {
      const memberListDic = this.cacheRoomMemberRawPayload.get(roomId)
      return Object.keys(memberListDic!)
    }
    const roomMemberListDict = await this.syncRoomMembers(roomId)
    this.cacheRoomMemberRawPayload.set(roomMemberListDict.roomId, roomMemberListDict.roomMemberDict)
    return Object.keys(roomMemberListDict)
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
    if (! this.cacheRoomMemberRawPayload) {
      throw new Error('not cache: cacheRoomMemberRawPayload')
    }
    const roomList = await this.getRoomIdList()
    for (const roomId of roomList) {
      const roomMemberListDict = await this.syncRoomMembers(roomId)
      this.cacheRoomMemberRawPayload!.set(roomMemberListDict.roomId, roomMemberListDict.roomMemberDict)
    }
  }

  public syncAvatarAsync () {
    log.verbose('IosbirdManager', 'syncAvatarAsync()')
    if (! this.cacheContactRawPayload) {
      throw new Error('cacheContactRawPayload not exist')
    }
    this.on('avatar', (avatarList: IosbirdAvatarSchema) => {
      const imgList = avatarList.list
      imgList.map(imgInfo => {
        const id = imgInfo.id.split('$')[1]
        const contactData = this.cacheContactRawPayload!.get(id)
        if (contactData) {
          contactData.avatar = imgInfo.img
        }
      })
    })
    this.getAvatar()
  }
}

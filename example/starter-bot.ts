import { PuppetIosbird } from '../src/puppet-iosbird'
import {
  Wechaty,
  Friendship,
  Room,
                      } from 'wechaty'
import { MessageType  } from 'wechaty-puppet'

const puppet  = new PuppetIosbird()
const bot = new Wechaty({ puppet })

bot
.on('error', (e) => {
  console.log(e)
})
.on('login', (user) => console.log(`User ${user} logined`))
.on('message', async (message) => {

  const content = message.text()
  const messageType = message.type()

  if (content === '修改昵称') {
    const contactSelf = bot.userSelf()
    await contactSelf.name('wuli舞哩客服')
  }


  /**
   * Message
   */
  console.log('MessageType:#####################################')
  switch (messageType) {
    case MessageType.Text: {
      console.log('message type is text')
      break
    }
    case MessageType.Image: {
      console.log('message type is image')
      break
    }

    case MessageType.Emoticon: {
      console.log('message type is Emotion')
      break
    }
    case MessageType.Audio: {
      console.log('message type is Audio')
      break
    }
    case MessageType.Url: {
      const link = await message.toUrlLink()
      console.log(link)
      console.log('message type is Link')
      break
    }
    case MessageType.Attachment: {
      const file = await message.toFileBox()
      const name = file.name
      await file.toFile(name, true)
      console.log('message type is attachment')
      break
    }
    default: {
      console.log('message type is Other')
      break
    }
  }
  console.log('MessageType:*************************************')

  console.log('Message:#####################################')
  console.log('message content:' + content)
  console.log('Message:*************************************')

  /**
   * Contact
   */

  const contact = message.from()
  if (contact) {
    const contactData = contact as any
    console.log('Contact Avatar:#####################################')
    console.log('contact: avater: ' + contactData.payload.avatar)
    console.log('Contact Avatar:*************************************')
  }

  /**
   * Room
   */
  const room = message.room()
  if (room) {
    const members = await room.memberAll()
    console.log('Room members:#####################################')
    members.map(async member => {
      console.log('contact: ' + member)
      console.log(`contact alias: ${await member.alias()}`)
      console.log(`contact name: ${member.name()}`)
    })
    console.log('members length: ' + members.length)
    console.log('Room members:*************************************')
    console.log((await room.topic()))

    /**
     * 建群
     */
    if (content === '建群') {
      await await bot.Room.create(members, 'test12')
    }

    /**
     * 修改群名
     */
    if (content === '修改群名') {
      await room.topic('hahahahah')
    }

    if (content === '获取群二维码') {
      console.log('获取群二维码:#####################################')
      console.log(`qrcode: ${await room.qrcode()}`)
      console.log('获取群二维码:*************************************')
    }
    /**
     * remove contact from room
     */
    if (content === '移除群成员') {
      const contactRemove = await bot.Contact.find({name: '桔小秘'})
      try {
        if (contactRemove) {
          console.log(contactRemove)
          await room.del(contactRemove)
        } else {
          console.log('name of 桔小秘 is not exists')
        }
      } catch (err) {
        console.log(err)
      }
    }

    /**
     * add contact to room
     */
    if (content === '添加群成员') {
      const contactAdd = await bot.Contact.find({name: '桔小秘'})
      try {
        if (contactAdd) {
          console.log(contactAdd)
          await room.add(contactAdd)
        } else {
          console.log('name of 桔小秘 is not exists')
        }
      } catch (err) {
        console.log(err)
      }
    }

    /**
     * 发布群公告
     */
    if (content === '发布群公告') {
      await room.announce('今天天气很好')
    }

    /**
     * 添加好友
     */
    if (content === '添加好友') {
      for (const member of members) {
        if (member.name() === '多米') {
          await bot.Friendship.add(member, 'hahahahaha')
        }
      }
    }

    if (content === '退出群聊') {
      await room.quit()
    }
  }

  /**
   * 转发
   */
  const forwardRoom = await bot.Room.find({topic: '小桔、小桔机器人管家、林贻民'})
  console.log('forward: ########################################')
  console.log(forwardRoom)
  if (forwardRoom) {
    message.forward(forwardRoom)
    console.log('forward: ########################################')
  }

})
.on('room-join', async (room, inviteeList, inviter) => {
  const nameList = inviteeList.map(c => c.name()).join(',')
  console.log(`Room ${await room.topic()}`)
  console.log(`got new member ${nameList}`)
  console.log(`invited by ${inviter}`)
})
.on('room-topic', async (room, newTopic, oldTopic, changer) => {
  console.log(`Room tpoic: ${await room.topic()}`)
  console.log(`Room tpoic:  ${oldTopic} --> ${newTopic}`)
  console.log(`changed by ${changer.name()}`)
})
.on('friendship', async friendship => {
  try {
    console.log(`received friend event.`)
    switch (friendship.type()) {

      // 1. New Friend Request

      case Friendship.Type.Receive:
        // await friendship.accept()
        console.log('received')
        break

      // 2. Friend Ship Confirmed

      case Friendship.Type.Confirm:
        console.log(`friend ship confirmed`)
        break
      // 3. Friendship Verify
      case Friendship.Type.Verify:
        console.log(`friend ship verify`)
        break
    }
  } catch (e) {
    console.error(e)
  }
})
.start()
.catch(async (e) => {
  console.error('Bot start() fail:', e)
  await bot.stop()
  process.exit(-1)
})

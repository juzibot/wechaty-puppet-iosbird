import { PuppetIosbird } from '../src/puppet-iosbird'
import { Wechaty, Message, Contact, Room    } from '../wechaty/src'
import { MessageType } from '../wechaty-puppet/src';

const puppet  = new PuppetIosbird()
const bot = new Wechaty({ puppet })

bot
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
    if (content === 'remove') {
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
    if (content === 'add') {
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
  }

})
.on('room-join', async (room, inviteeList, inviter) => {
  const nameList = inviteeList.map(c => c.name()).join(',')
  console.log(`Room ${await room.topic()}`)
  console.log(`got new member ${nameList}`)
  console.log(`invited by ${inviter}`)
})
.start()
.catch(async (e) => {
  console.error('Bot start() fail:', e)
  await bot.stop()
  process.exit(-1)
})

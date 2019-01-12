import { PuppetIosbird } from '../src/puppet-iosbird'
import { Wechaty, Message    } from '../wechaty/src'
import { MessageType } from '../wechaty-puppet/src';

const puppet  = new PuppetIosbird()
const bot = new Wechaty({ puppet })

bot
.on('scan', (qrcode, status) => console.log('Scan QR Code to login'))
.on('login', (user) => console.log(`User ${user} logined`))
.on('message', async (message) => {
  console.log(`Message: ${message.text()}`)
  const content = message.text()

  const messageType = message.type()

  /**
   * Message
   */
  switch (messageType) {
    case MessageType.Text: {
      console.log('#####################################')
      console.log('message type is text')
      console.log('#####################################')
      break
    }
    case MessageType.Image: {
      console.log('#####################################')
      console.log('message type is image')
      console.log('#####################################')
      break
    }

    case MessageType.Emoticon: {
      console.log('#####################################')
      console.log('message type is Emotion')
      console.log('#####################################')
      break
    }
    case MessageType.Audio: {
      console.log('#####################################')
      console.log('message type is Audio')
      console.log('#####################################')
      break
    }
    default: {
      console.log('#####################################')
      console.log('message type is Other')
      console.log('#####################################')
      break
    }

  }

  console.log('#####################################')
  console.log('message content:' + content)
  console.log('#####################################')


  /**
   * Room
   */
  const room = message.room()
  if (room) {
    const members = await room.memberAll()
    const filebox = await members[0].avatar()
    const name: string = filebox.name
    await filebox.toFile(name, true)
    console.log((await room.topic()))
  }
})
.start()
.catch(async (e) => {
  console.error('Bot start() fail:', e)
  await bot.stop()
  process.exit(-1)
})

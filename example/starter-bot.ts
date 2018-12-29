import { PuppetIosbird } from '../src/puppet-iosbird'
import { Wechaty    } from '../wechaty/src'

const puppet  = new PuppetIosbird()
const bot = new Wechaty({ puppet })

bot
.on('scan', (qrcode, status) => console.log('Scan QR Code to login'))
.on('login', (user) => console.log(`User ${user} logined`))
.on('message', async (message) => {
  console.log(`Message: ${message.text()}`)
  const content = message.text()
  if (content === 'test') {
    message.say('我是机器人')
  }

  console.log(content)

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

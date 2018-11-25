import { PuppetIosbird } from '../src/puppet-iosbird'
import { Wechaty    } from '../wechaty/src'

const puppet  = new PuppetIosbird()
const bot = new Wechaty({ puppet })

bot
.on('scan', (qrcode, status) => console.log('Scan QR Code to login'))
.on('login', (user) => console.log(`User ${user} logined`))
.on('message', (message) => console.log(`Message: ${message}`))
.start()
.catch(async (e) => {
  console.error('Bot start() fail:', e)
  await bot.stop()
  process.exit(-1)
})

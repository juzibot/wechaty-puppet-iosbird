import { IosbirdMessagePayload } from '../iosbird-schema'

import { isPayload }             from './is-type'

/**
 *
 * 1. Friendship Confirm Event
 *
 */
export const FRIENDSHIP_CONFIRM_REGEX_LIST = [
  /^You have added (.+) as your WeChat contact. Start chatting!$/,
  /^你已添加了(.+)，现在可以开始聊天了。$/,
  /I've accepted your friend request. Now let's chat!$/,
  /^(.+) just added you to his\/her contacts list. Send a message to him\/her now!$/,
  /^(.+)刚刚把你添加到通讯录，现在可以开始聊天了。$/,
  /^我通过了你的朋友验证请求，现在我们可以开始聊天了$/,
]


/**
 * {
 * "action"  : "chat",
 * "to_type" : "web",
 * "s_type"  : "ios",
 * "id"      : "wxid_tdax1huk5hgs12",
 * "content" : "你已添加了林贻民，现在可以开始聊天了。",
 * "m_type"  : "10000",
 * "cnt_type": 10000,
 * "u_id"    : "wxid_j76jk7muhgqz22",
 * "mem_id"  : "",
 * "type"    : "ios",
 * "name"    : "系统消息"
 * }
 *
 * {
 * "action"  : "chat",
 * "to_type" : "web",
 * "s_type"  : "ios",
 * "id"      : "wxid_tdax1huk5hgs12",
 * "content" : "我通过了你的朋友验证请求，现在我们可以开始聊天了",
 * "mem_id"  : "",
 * "u_id"    : "wxid_j76jk7muhgqz22",
 * "type"    : "ios",
 * "name"    : "林贻民",
 * "msgId"   : "bdb1b74d-5fbb-4398-9136-3e6be9793db1",
 * "cnt_type": 0
 * }
 */

export function friendshipConfirmEventMessageParser (
  rawPayload: IosbirdMessagePayload,
): null | string {

  if (!isPayload(rawPayload)) {
    return null
  }

  let   matches = null as null | string[]
  const text    = rawPayload.content

  FRIENDSHIP_CONFIRM_REGEX_LIST.some(
    regexp => {
      matches = text.match(regexp)
      return !!matches
    },
  )

  if (!matches) {
    return null
  }

  return rawPayload.u_id
}

/**
 *
 * 2. Friendship Receive Event
 *
 */


/**
 *
 * {
 * "status": 10000,
 * "id"    : "wxid_tdax1huk5hgs12",
 * "number": 1,
 * "msg"   : "success",
 * "type"  : "ios",
 * "action": "hello_number"
 * }
 */


export async function friendshipReceiveEventMessageParser (
  rawPayload: IosbirdMessagePayload,
): Promise<null | string> {

  if (!isPayload(rawPayload)) {
    return null
  }
  return null
}

/**
 *
 * 3. Friendship Verify Event
 *
 */

/**
  * {
  * 'action'  : 'chat',
  * 'to_type' : 'web',
  * 's_type'  : 'ios',
  * 'id'      : 'wxid_tdax1huk5hgs12',
  * 'content' : '林贻民开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。<a href=\"weixin://findfriend/verifycontact\">发送朋友验证</a>',
  * 'm_type'  : '10000',
  * 'cnt_type': 1000,
  * 'u_id'    : 'wxid_j76jk7muhgqz22',
  * 'mem_id'  : '',
  * 'type'    : 'ios',
  * 'name'    : '林贻民',
  * 'msgId'   : '27866e1a-497f-4ac0-978b-b95b5c859cc8'
  * }
*/
const FRIENDSHIP_VERIFY_REGEX_LIST = [
  /^(.+) has enabled Friend Confirmation/,
  /^(.+)开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。/,
]

export function friendshipVerifyEventMessageParser (
  rawPayload: IosbirdMessagePayload,
): null | string {

  if (!isPayload(rawPayload)) {
    return null
  }

  let   matches = null as null | string[]
  const text    = rawPayload.content

  FRIENDSHIP_VERIFY_REGEX_LIST.some(
    regexp => {
      matches = text.match(regexp)
      return !!matches
    },
  )

  if (!matches) {
    return null
  }

  return rawPayload.u_id
}

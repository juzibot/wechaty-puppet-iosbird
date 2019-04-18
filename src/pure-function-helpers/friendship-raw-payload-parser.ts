import {
  FriendshipType,
  FriendshipPayload,
  FriendshipPayloadConfirm,
  FriendshipPayloadReceive,
  FriendshipPayloadVerify,
}                                         from 'wechaty-puppet'

import {
  IosbirdMessagePayload,
}                                         from '../iosbird-schema'

import {
  friendshipConfirmEventMessageParser,
  friendshipReceiveEventMessageParser,
  friendshipVerifyEventMessageParser,
}                                         from './friendship-event-message-parser'

export async function friendshipRawPayloadParser (
  rawPayload: IosbirdMessagePayload,
) : Promise<FriendshipPayload> {

  if (friendshipConfirmEventMessageParser(rawPayload)) {
    /**
     * 1. Confirm Event
     */
    console.log('########################################')
    return friendshipRawPayloadParserConfirm(rawPayload)

  } else if (friendshipVerifyEventMessageParser(rawPayload)) {
    /**
     * 2. Verify Event
     */
    return friendshipRawPayloadParserVerify(rawPayload)

  } else if (await friendshipReceiveEventMessageParser(rawPayload)) {
    /**
     * 3. Receive Event
     */
    return friendshipRawPayloadParserReceive(rawPayload)

  } else {
    throw new Error('event type is neither confirm nor verify, and not receive')
  }
}

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
async function friendshipRawPayloadParserConfirm (
  rawPayload: IosbirdMessagePayload,
): Promise<FriendshipPayload> {
  const payload: FriendshipPayloadConfirm = {
    contactId : rawPayload.id,
    id        : rawPayload.msgId,
    type      : FriendshipType.Confirm,
  }
  return payload
}

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
function friendshipRawPayloadParserVerify (
  rawPayload: IosbirdMessagePayload,
): FriendshipPayload {
  const payload: FriendshipPayloadVerify = {
    contactId : rawPayload.id,
    id        : rawPayload.msgId,
    type      : FriendshipType.Verify,
  }
  return payload
}

/**
 * {
 * "status": 10000,
 * "id"    : "wxid_tdax1huk5hgs12",
 * "number": 1,
 * "msg"   : "success",
 * "type"  : "ios",
 * "action": "hello_number"
 * }
 */
async function friendshipRawPayloadParserReceive (
  rawPayload: IosbirdMessagePayload,
) {

  const friendshipPayload: FriendshipPayloadReceive = {
    contactId : rawPayload.id,
    hello     : 'no content', // TODO:
    id        : rawPayload.msgId,
    ticket    : 'no ticket',
    type      : FriendshipType.Receive,
  }

  return friendshipPayload
}

import {
  PuppetRoomTopicEvent,
  YOU,
}                         from '../../wechaty-puppet/src'

import {
  IosbirdMessagePayload,
}                         from '../iosbird-schema'

import {
  isRoomId,
  isPayload,
}                         from './is-type'


/**
 *
 * 3. Room Topic Event
 *
 */
const ROOM_TOPIC_OTHER_REGEX_LIST = [
  /^"(.+)" changed the group name to "(.+)"$/,
  /^"(.+)"修改群名为“(.+)”$/,
]

const ROOM_TOPIC_YOU_REGEX_LIST = [
  /^(You) changed the group name to "(.+)"$/,
  /^(你)修改群名为“(.+)”$/,
]

/**
 * {
 *   "action": "chat",
 *   "to_type": "web",
 *   "s_type": "ios",
 *   "id": "wxid_tdax1huk5hgs12",
 *   "content": "你修改群名为“直播三群1”",
 *   "m_type": "10000",
 *   "cnt_type": 10000,
 *   "u_id": "8744001955@chatroom",
 *   "mem_id": "wxid_tdax1huk5hgs12$",
 *   "type": "ios",
 *   "name": "系统消息"
 * }
 */
export function roomTopicEventMessageParser (
  rawPayload: IosbirdMessagePayload,
): null | PuppetRoomTopicEvent {

  if (!isPayload(rawPayload)) {
    return null
  }

  const roomId  = rawPayload.u_id
  const content = rawPayload.content

  if (!isRoomId(roomId)) {
    return null
  }

  let matchesForOther:  null | string[] = []
  let matchesForYou:    null | string[] = []

  ROOM_TOPIC_OTHER_REGEX_LIST .some(regex => !!(matchesForOther = content.match(regex)))
  ROOM_TOPIC_YOU_REGEX_LIST   .some(regex => !!(matchesForYou   = content.match(regex)))

  const matches: Array<string | YOU> = matchesForOther || matchesForYou
  if (!matches) {
    return null
  }

  let   changerName = matches[1]
  const topic       = matches[2] as string

  if (matchesForYou && changerName === '你' || changerName === 'You') {
    changerName = YOU
  }

  const roomTopicEvent: PuppetRoomTopicEvent = {
    changerName,
    roomId,
    topic,
  }

  return roomTopicEvent
}

import {
  IosbirdMessagePayload,
}                                   from '../iosbird-schema'
import { isPayload }                from './is-type'
import { RoomInvitationPayload }    from 'wechaty-puppet'

/**
 *
 * {
 * "id"          : "wxid_tdax1huk5hgs12",
 * "m_nsTitle"   : "邀请你加入群聊",
 * "mem_id"      : "",
 * "s_type"      : "ios",
 * "type"        : "ios",
 * "action"      : "chat",
 * "cnt_type"    : 4950,
 * "m_nsDesc"    : ""林贻民"邀请你加入群聊左耳听风 ARTS 4号学习小组，进入可查看详情。",
 * "m_nsThumbUrl": "https://u.weixin.qq.com/cgi-bin/getchatroomheadimg?username=A87964b2ba02610b7e4bb506ee8778bea85118447a905f8491f36f312d4d5b2df&from=1",
 * "to_type"     : "web",
 * "u_id"        : "wxid_j76jk7muhgqz22",
 * "name"        : "林贻民",
 * "content"     : "{\"urlStr\":\"https:\\/\\/support.weixin.qq.com\\/cgi-bin\\/mmsupport-bin\\/addchatroombyinvite?ticket=A0lSD7GMpQYHmUXg57TXNA%3D%3D\",\"title\":\"邀请你加入群聊\",\"thumbUrl\":\"https:\\/\\/u.weixin.qq.com\\/cgi-bin\\/getchatroomheadimg?username=A87964b2ba02610b7e4bb506ee8778bea85118447a905f8491f36f312d4d5b2df&from=1\",\"desc\":\"\\\"林贻民\\\"邀请你加入群聊左耳听风 ARTS 4号学习小组，进入可查看详情。\",\"localMsgId\":\"42\"}"                                                                                                                  : \/\/support.weixin.qq.com\/cgi-bin\/mmsupport-bin\/addchatroombyinvite?ticket=A0lSD7GMpQYHmUXg57TXNA%3D%3D","title":"邀请你加入群聊","thumbUrl":"https: \/\/u.weixin.qq.com\/cgi-bin\/getchatroomheadimg?username=A87964b2ba02610b7e4bb506ee8778bea85118447a905f8491f36f312d4d5b2df&from=1","desc":"\"林贻民\"邀请你加入群聊左耳听风 ARTS 4号学习小组，进入可查看详情。", "localMsgId": "42"}"
 * }
 *
 */

const ROOM_OTHER_INVITE_TITLE_ZH = [
  /邀请你加入群聊/
]

const ROOM_OTHER_INVITE_TITLE_EN = [
  /Group Chat Invitation/
]

const ROOM_OTHER_INVITE_LIST_ZH = [
  /^"(.+)"邀请你加入群聊(.+)，进入可查看详情。/
]

const ROOM_OTHER_INVITE_LIST_EN = [
  /"(.+)" invited you to join the group chat "(.+)"\. Enter to view details\./
]

export const roomInviteEventMessageParser = async (
  rawPayload: IosbirdMessagePayload,
): Promise<null | RoomInvitationPayload> => {

  if (!isPayload(rawPayload)) {
    return null
  }

  let matchesForOtherInviteTitleEn = null as null | string[]
  let matchesForOtherInviteTitleZh = null as null | string[]
  let matchesForOtherInviteEn      = null as null | string[]
  let matchesForOtherInviteZh      = null as null | string[]

  ROOM_OTHER_INVITE_TITLE_EN.some(
    regex => !!(matchesForOtherInviteTitleEn = rawPayload.m_nsTitle ? rawPayload.m_nsTitle.match(regex) : null),
  )

  ROOM_OTHER_INVITE_TITLE_ZH.some(
    regex => !!(matchesForOtherInviteTitleZh = rawPayload.m_nsTitle ? rawPayload.m_nsTitle.match(regex) : null),
  )

  ROOM_OTHER_INVITE_LIST_EN.some(
    regex => !!(matchesForOtherInviteEn = rawPayload.m_nsDesc ? rawPayload.m_nsDesc.match(regex) : null),
  )

  ROOM_OTHER_INVITE_LIST_ZH.some(
    regex => !!(matchesForOtherInviteZh = rawPayload.m_nsDesc ? rawPayload.m_nsDesc.match(regex) : null),
  )

  const titleMatch = matchesForOtherInviteTitleEn || matchesForOtherInviteTitleZh

  const matchInviteEvent = matchesForOtherInviteEn || matchesForOtherInviteZh

  const matches = !!titleMatch && !!matchInviteEvent

  if (!matches) {
    return null
  }
  return {
    id              : rawPayload.msgId,
    inviterId       : rawPayload.u_id,
    roomTopic       : matchInviteEvent![2],
    roomMemberCount : 0,
    roomMemberIdList: [],
    timestamp       : Date.now(),
  }
}

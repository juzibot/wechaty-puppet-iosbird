#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable
import test                               from 'blue-tape'

import {
  IosbirdMessagePayload,
}                                         from '../iosbird-schema'

import { roomInviteEventMessageParser }   from './room-event-invite-message-parser'
import { RoomInvitationPayload }          from 'wechaty-puppet'

test('roomInviteEventMessageParser() ZH', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    "id"          : "wxid_tdax1huk5hgs12",
    "m_nsTitle"   : "Group Chat Invitation",
    "mem_id"      : "",
    "s_type"      : "ios",
    "type"        : "ios",
    "action"      : "chat",
    "cnt_type"    : 4950,
    "m_nsDesc"    : "\"林贻民\"邀请你加入群聊左耳听风 ARTS 4号学习小组，进入可查看详情。",
    "m_nsThumbUrl": "https://u.weixin.qq.com/cgi-bin/getchatroomheadimg?username=A87964b2ba02610b7e4bb506ee8778bea85118447a905f8491f36f312d4d5b2df&from=1",
    "to_type"     : "web",
    "u_id"        : "wxid_j76jk7muhgqz22",
    "content"     : "{\"urlStr\":\"https:\\/\\/support.weixin.qq.com\\/cgi-bin\\/mmsupport-bin\\/addchatroombyinvite?ticket=A0lSD7GMpQYHmUXg57TXNA%3D%3D\",\"title\":\"邀请你加入群聊\",\"thumbUrl\":\"https:\\/\\/u.weixin.qq.com\\/cgi-bin\\/getchatroomheadimg?username=A87964b2ba02610b7e4bb506ee8778bea85118447a905f8491f36f312d4d5b2df&from=1\",\"desc\":\"\\\"林贻民\\\"邀请你加入群聊左耳听风 ARTS 4号学习小组，进入可查看详情。\",\"localMsgId\":\"42\"}",
    "name"        : "林贻民",
    "msgId"       : "27866e1a-497f-4ac0-978b-b95b5c859cc8",
   } as IosbirdMessagePayload

  const EXPECTED_EVENT: RoomInvitationPayload = {
    id              : '27866e1a-497f-4ac0-978b-b95b5c859cc8',
    inviterId       : 'wxid_j76jk7muhgqz22',
    roomTopic       : '左耳听风 ARTS 4号学习小组',
    roomMemberCount : 0,
    roomMemberIdList: [],
    timestamp       : Date.now(),
  }

  const event = await roomInviteEventMessageParser(MESSAGE_PAYLOAD)
  EXPECTED_EVENT.timestamp = event!.timestamp

  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

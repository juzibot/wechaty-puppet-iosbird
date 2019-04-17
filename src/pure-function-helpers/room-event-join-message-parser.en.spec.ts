#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import {
  PuppetRoomJoinEvent,
}                                       from 'wechaty-puppet'

import {
  IosbirdMessagePayload,
}                                       from '../iosbird-schema'

import { roomJoinEventMessageParser }   from './room-event-join-message-parser'

test('roomJoinEventMessageParser() EN-other-invite-other', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action' : 'chat',
    'to_type': 'web',
    's_type' : 'ios',
    'id'     : 'wxid_tdax1huk5hgs12',
    'content': '林贻民 invited Huan to the group chat',
    'm_type' : '10000',
    'mem_id' : 'wxid_tdax1huk5hgs12',
    'u_id'   : '5212109738@chatroom',
    'type'   : 'ios',
    'name'   : '系统消息'

  } as IosbirdMessagePayload
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['Huan'],
    inviterName     : '林贻民',
    roomId          : '5212109738@chatroom',
  }

  const event = await roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-other-invite-others', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = { action: 'chat',
    to_type : 'web',
    s_type  : 'ios',
    id      : 'wxid_tdax1huk5hgs12',
    content : '你 invited 高原ོ, 林贻民 to the group chat',
    m_type  : '10000',
    mem_id  : 'wxid_tdax1huk5hgs12$',
    u_id    : '11589254220@chatroom',
    type    : 'ios',
    name    : '系统消息',
    msgId   : 'f849bb73-a425-40aa-aabb-685d35ee629c',
    cnt_type: 10000,
  } as IosbirdMessagePayload
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList: ['高原ོ', '林贻民'],
    inviterName    : '你',
    roomId         : '11589254220@chatroom',
  }

  const event = await roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

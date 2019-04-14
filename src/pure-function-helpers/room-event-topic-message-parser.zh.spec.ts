#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PuppetRoomTopicEvent,
  YOU,
}                               from '../../wechaty-puppet/src'

import {
  IosbirdMessagePayload,
}                               from '../iosbird-schema'

import { roomTopicEventMessageParser }  from './room-event-topic-message-parser'

test('roomTopicEventMessageParser() ZH-bot-modify-topic', async t => {
  const PADCHAT_MESSAGE_PAYLOAD_ROOM_TOPIC: IosbirdMessagePayload = {
    'action'  : 'chat',
    'to_type' : 'web',
    's_type'  : 'ios',
    'id'      : 'wxid_tdax1huk5hgs12',
    'content' : '你修改群名为“直播三群1”',
    'm_type'  : '10000',
    'cnt_type': 10000,
    'u_id'    : '8744001955@chatroom',
    'mem_id'  : 'wxid_tdax1huk5hgs12$',
    'type'    : 'ios',
    'name'    : '系统消息'
  } as IosbirdMessagePayload
  const EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC: PuppetRoomTopicEvent = {
    changerName : YOU,
    roomId      : '8744001955@chatroom',
    topic       : '直播三群1',
  }

  const payload = roomTopicEventMessageParser(PADCHAT_MESSAGE_PAYLOAD_ROOM_TOPIC)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC, 'should parse room topic message payload')
})

test('roomTopicEventMessageParser() ZH-other-modify-topic', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action'  : 'chat',
    'to_type' : 'web',
    's_type'  : 'ios',
    'id'      : 'wxid_tdax1huk5hgs12',
    'content' : '"林贻民"修改群名为“直播三群1”',
    'm_type'  : '10000',
    'cnt_type': 10000,
    'u_id'    : '8744001955@chatroom',
    'mem_id'  : 'wxid_tdax1huk5hgs12$',
    'type'    : 'ios',
    'name'    : '系统消息'
  } as IosbirdMessagePayload

  const EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC: PuppetRoomTopicEvent = {
    changerName : '林贻民',
    roomId      : '8744001955@chatroom',
    topic       : '直播三群1',
  }

  const event = roomTopicEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(event, EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC, 'should parse room topic message payload')
})

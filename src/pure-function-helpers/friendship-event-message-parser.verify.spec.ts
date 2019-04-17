#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test                                   from 'blue-tape'

import {
  IosbirdMessagePayload,
}                                             from '../iosbird-schema'

import { friendshipVerifyEventMessageParser } from './friendship-event-message-parser'

test('friendshipVerifyEventMessageParser() EN', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action'  : 'chat',
    'to_type' : 'web',
    's_type'  : 'ios',
    'id'      : 'wxid_tdax1huk5hgs12',
    'content' : '林贻民 has enabled Friend Confirmation. <a href = "weixin: //findfriend/verifycontact">[Send a friend request]</a> to chat.',
    'm_type'  : '10000',
    'cnt_type': 1000,
    'u_id'    : 'wxid_j76jk7muhgqz22',
    'mem_id'  : '',
    'type'    : 'ios',
    'name'    : '林贻民',
    'msgId'   : '27866e1a-497f-4ac0-978b-b95b5c859cc8'
  } as IosbirdMessagePayload

  const EXPECTED_CONTACT_ID = 'wxid_j76jk7muhgqz22'

  const contactId = friendshipVerifyEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactId, EXPECTED_CONTACT_ID, 'should parse verify message to contact id')
})

test('friendshipVerifyEventMessageParser() ZH', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action'  : 'chat',
    'to_type' : 'web',
    's_type'  : 'ios',
    'id'      : 'wxid_tdax1huk5hgs12',
    'content' : '林贻民开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。<a href=\"weixin://findfriend/verifycontact\">发送朋友验证</a>',
    'm_type'  : '10000',
    'cnt_type': 1000,
    'u_id'    : 'wxid_j76jk7muhgqz22',
    'mem_id'  : '',
    'type'    : 'ios',
    'name'    : '林贻民',
    'msgId'   : '27866e1a-497f-4ac0-978b-b95b5c859cc8'
  } as IosbirdMessagePayload

  const EXPECTED_CONTACT_ID = 'wxid_j76jk7muhgqz22'

  const contactId = friendshipVerifyEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactId, EXPECTED_CONTACT_ID, 'should parse verify message to contact id')
})

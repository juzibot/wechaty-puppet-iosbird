#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  IosbirdMessagePayload,
}                             from '../iosbird-schema'

import { friendshipConfirmEventMessageParser } from './friendship-event-message-parser'

test('friendshipConfirmEventMessageParser() EN-confirm-by-other', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action': 'chat',
    'to_type': 'web',
    's_type': 'ios',
    'id': 'wxid_tdax1huk5hgs12',
    'content': `I've accepted your friend request. Now let's chat!`,
    'm_type': '10000',
    'cnt_type': 10000,
    'u_id': 'wxid_j76jk7muhgqz22',
    'mem_id': '',
    'type': 'ios',
    'name': '系统消息',
  } as  IosbirdMessagePayload


  const EXPECTED_CONTACT_ID = 'wxid_j76jk7muhgqz22'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})

test('friendshipConfirmEventMessageParser() EN-confirm-by-bot', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action': 'chat',
    'to_type': 'web',
    's_type': 'ios',
    'id': 'wxid_tdax1huk5hgs12',
    'content': `You have added 林贻民 as your WeChat contact. Start chatting!`,
    'm_type': '10000',
    'cnt_type': 10000,
    'u_id': 'wxid_j76jk7muhgqz22',
    'mem_id': '',
    'type': 'ios',
    'name': '系统消息',
  } as  IosbirdMessagePayload

  const EXPECTED_CONTACT_ID = 'wxid_j76jk7muhgqz22'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})

test('friendshipConfirmEventMessageParser() ZH-confirm-by-other', async t => {
  t.skip('tbw')
})

test('friendshipConfirmEventMessageParser() ZH-confirm-by-bot', async t => {
  const MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action': 'chat',
    'to_type': 'web',
    's_type': 'ios',
    'id': 'wxid_tdax1huk5hgs12',
    'content': `你已添加了林贻民，现在可以开始聊天了。`,
    'm_type': '10000',
    'cnt_type': 10000,
    'u_id': 'wxid_j76jk7muhgqz22',
    'mem_id': '',
    'type': 'ios',
    'name': '系统消息',
  } as  IosbirdMessagePayload

  const EXPECTED_CONTACT_ID = 'wxid_j76jk7muhgqz22'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})

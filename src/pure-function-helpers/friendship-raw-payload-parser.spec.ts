#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  FriendshipType,
}                             from 'wechaty-puppet'

import {
  IosbirdMessagePayload,
}                             from '../iosbird-schema'


import {
  friendshipRawPayloadParser,
}                             from './friendship-raw-payload-parser'

test('friendshipRawPayloadParser()', async t => {

  const CONFIRM_MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action'  : 'chat',
    'to_type' : 'web',
    's_type'  : 'ios',
    'id'      : 'wxid_tdax1huk5hgs12',
    'content' : `I've accepted your friend request. Now let's chat!`,
    'm_type'  : '10000',
    'cnt_type': 10000,
    'u_id'    : 'wxid_j76jk7muhgqz22',
    'mem_id'  : '',
    'type'    : 'ios',
    'name'    : '系统消息',
    'msgId'   : 'bdb1b74d-5fbb-4398-9136-3e6be9793db1',
  } as  IosbirdMessagePayload


  const CONFIRM_EXPECTED = {
    contactId : 'wxid_tdax1huk5hgs12',
    id        : 'bdb1b74d-5fbb-4398-9136-3e6be9793db1',
    type      : FriendshipType.Confirm
  }

  const confirmResult = await friendshipRawPayloadParser (CONFIRM_MESSAGE_PAYLOAD)

  t.deepEqual(confirmResult, CONFIRM_EXPECTED, 'should parse FriendshipPayloadConfirm right')

  const VERIFY_MESSAGE_PAYLOAD: IosbirdMessagePayload = {
    'action'  : 'chat',
    'to_type' : 'web',
    's_type'  : 'ios',
    'id'      : 'wxid_tdax1huk5hgs12',
    'content' : `林贻民开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。<a href=\"weixin://findfriend/verifycontact\">发送朋友验证</a>`,
    'm_type'  : '10000',
    'cnt_type': 10000,
    'u_id'    : 'wxid_j76jk7muhgqz22',
    'mem_id'  : '',
    'type'    : 'ios',
    'name'    : '系统消息',
    'msgId'   : 'bdb1b74d-5fbb-4398-9136-3e6be9793db1',
  } as  IosbirdMessagePayload

  const receivedResult = await friendshipRawPayloadParser (VERIFY_MESSAGE_PAYLOAD)

  const VERIFY_EXPECTED = {
    contactId : 'wxid_tdax1huk5hgs12',
    id        : 'bdb1b74d-5fbb-4398-9136-3e6be9793db1',
    type      : FriendshipType.Verify,
  }

  t.deepEqual(receivedResult, VERIFY_EXPECTED, 'should parse FriendshipPayloadReceived right')


})

import { Type, ContactType, Action } from './iosbird-ws'

export enum IosbirdMessageType {
  TEXT       = 0,        // 文本
  PICTURE    = 1,        // 图片
  AUDIO      = 2,        // 音频
  LINK       = 495,      // 链接
  FILE       = 6000,     // 文件
  VEDIO      = 6001,     // 视频
  SYS        = 10000,    // 系统消息
  RED_PACKET = 492001,   // 红包
  AT         = 3110,     // @ member
}

export interface IosbirdMessagePayload {
  /**
   * Text Mesage
   * {
	 *  "action": "chat",
	 *  "to_type": "web",
	 *  "s_type": "ios",
	 *  "id": "wxid_atjcz7dvaxn422",
	 *  "content": "你好",
	 *  "mem_id": "",
	 *  "u_id": "tiancdj",
	 *  "type": "ios",
	 *  "name": "天长地久"
   * }
   *
   * Audio Message
   * {
	 *  "action": "chat",
	 *  "to_type": "web",
	 *  "s_type": "ios",
	 *  "id": "wxid_atjcz7dvaxn422",
	 *  "cnt_type": 2,
	 *  "content": "http:\/\/useoss.51talk.com\/other\/b503aa2f8abcc030a6e2367463a6a86e.mp3",
	 *  "mem_id": "",
	 *  "u_id": "tiancdj",
	 *  "type": "ios",
	 *  "m_aud_time": "4520",
	 *  "name": "天长地久"
   * }
   *
   * Picture Message
   * {
   *  "action": "chat",
   *  "to_type": "web",
   *  "s_type": "ios",
   *  "id": "wxid_tdax1huk5hgs12",
   *  "cnt_type": 1,
   *  "content": "http://useoss.51talk.com/images/12a8001f413d04321b0b87b331e6f962.png,http://useoss.51talk.com/images/5ad25577811121102f56ef6d61b47ffd.png,40",
   *  "mem_id": "wxid_tdax1huk5hgs12$wxid_j76jk7muhgqz22",
   *  "u_id": "5212109738@chatroom",
   *  "type": "ios",
   *  "name": "林贻民"
   * }
   *
   * Video Message
   * {
   *   "action": "chat",
   *   "to_type": "web",
   *   "s_type": "ios",
   *   "id": "wxid_tdax1huk5hgs12",
   *   "cnt_type": 6001,
   *   "content": "{\"thumbImgUrl\":\"http:\\/\\/useoss.51talk.com\\/images\\/0be358b3cdbf8bacebb915b0eccd4ee9.jpg\",\"videoMsgId\":41}",
   *   "mem_id": "wxid_tdax1huk5hgs12$wxid_j76jk7muhgqz22",
   *   "u_id": "5212109738@chatroom",
   *   "type": "ios",
   *   "name": "林贻民"
   * }
   *
   * Red Packet
   * {
   *  "action": "chat",
   *  "to_type": "web",
   *  "s_type": "ios",
   *  "id": "wxid_tdax1huk5hgs12",
   *  "cnt_type": 492001,
   *  "content": "林贻民 : [红包]Best wishes",
   *  "mem_id": "wxid_tdax1huk5hgs12$wxid_j76jk7muhgqz22",
   *  "u_id": "5212109738@chatroom",
   *  "type": "ios",
   *  "name": "林贻民"
   * }
   *
   * FILE
   *
   * {
   *   "action": "chat",
   *   "to_type": "web",
   *   "s_type": "ios",
   *   "id": "wxid_tdax1huk5hgs12",
   *   "cnt_type": 6000,
   *   "content": "{\"title\":\"my_stop_words\",\"url\":\"http:\\/\\/useoss.51talk.com\\/other\\/6a0382a5523082052ee7f86c96e7533d.dat\",\"size\":\"16124\"}",
   *   "mem_id": "",
   *   "u_id": "wxid_j76jk7muhgqz22",
   *   "type": "ios",
   *   "name": "林贻民"
   * }
   *
   * LINK
   * {
   *   "id": "wxid_tdax1huk5hgs12",
   *   "m_nsTitle": "Writing cross-platform Node.js | George Ornbo",
   *   "mem_id": "",
   *   "s_type": "ios",
   *   "type": "ios",
   *   "action": "chat",
   *   "cnt_type": 495,
   *   "m_nsDesc": "https://shapeshed.com/writing-cross-platform-node/",
   *   "m_nsThumbUrl": "",
   *   "to_type": "web",
   *   "u_id": "wxid_j76jk7muhgqz22",
   *   "name": "林贻民",
   *   "content": "{\"urlStr\":\"https:\\/\\/shapeshed.com\\/writing-cross-platform-node\\/\",\"title\":\"Writing cross-platform Node.js | George Ornbo\",\"thumbUrl\":\"\",\"desc\":\"https:\\/\\/shapeshed.com\\/writing-cross-platform-node\\/\",\"localMsgId\":\"\"}"
   * }
   */
  action       : string,               // 操作类型
  to_type      : Type,
  s_type       : Type,
  id           : string,               // Bot Id
  cnt_type?    : IosbirdMessageType,   // Message Type
  m_type?      : string,               // system message
  content      : string,               // Message Content
  mem_id       : string,               // Who is send the message in the room
  u_id         : string,               // Contact Id or Room Id
  type         : Type,
  name         : string,
  msgId        : string,
  m_nsTitle?   : string,               // Link title
  m_nsDesc?    : string,               // Link Description
  m_nsThumbUrl?: string,               // Link url
}


export interface IosbirdContactPayload {
	/**
   * Room information
   * {
	 *	"c_type": "1",
	 *	"set_to_top": false,
	 *	"id": "wxid_atjcz7dvaxn422$4749786460@chatroom",
	 *	"c_remark": "",
	 *	"nick": "天长地久、童心、黑鸟小萌萌",
	 *	"m_uiLastUpdate": 1544103278,
	 *	"allow_owner_approve_value": false,
	 *	"type": "ios",
	 *	"mute_session": false
	 * }
   *
   * Contact Information
   * {
	 *	"c_type": "0",
	 *	"set_to_top": false,
	 *	"id": "wxid_atjcz7dvaxn422$tiancdj",
	 *	"c_remark": "",
	 *	"nick": "天长地久",
	 *	"m_uiLastUpdate": 1544102744,
	 *	"type": "ios",
	 *	"mute_session": false,
	 *	"name": "天长地久"
	 * }
   */
  c_type                   : ContactType,   // 0 is Contact, and 1 is Room
  set_to_top               : boolean,
  id                       : string,        // wxid_atjcz7dvaxn422$4749786460@chatroom or wxid_atjcz7dvaxn422$tiancdj
  c_remark                 : string,
  nick                     : string,        // Room topic or contact alisa
  m_uiLastUpdate           : number,
  allow_owner_approve_value: boolean,
  type                     : Type,
  mute_session             : boolean,
  name?                    : string,        // name of contact
  avatar?                  : string,        // avatar of room and contact
}

export interface IosbirdRoomMemberPayload {
  // "is_myfriend"     : 1,
  // "wechat_id"       : "wxid_tdax1huk5hgs12$wxid_3xl8j2suau8b22",
  // "wechat_img"      : "http://wx.qlogo.cn/mmhead/ver_1/BCGUXia8vbzQ4xdWPpvjwuDEhIoP94QazpskxCRgj5jfULtY0qXGQGETzMEibhPYLXmHwbF9ZfA1GaOLYvVSTx8A/132",
  // "wechat_real_nick": "桔小秘",
  // "wechat_nick"     : "桔小秘"
  'is_myfriend'     : number,   // 与机器人是否为好友(1: 是， 0: 否)
  'wechat_id'       : string,   // 机器人contactId和成员的contactId
  'wechat_img'      : string,   // 成员的头像
  'wechat_real_nick': string,   // 群昵称
  'wechat_nick'     : string,   // 微信昵称
}


export interface IosbirdAvatarSchema {
  /**
   * { id: 'wxid_tdax1huk5hgs12',
   *   list:
   *    [ { id: 'wxid_tdax1huk5hgs12$xiaonian16',
   *        img:
   *         'http://wx.qlogo.cn/mmhead/ver_1/ZKTUb2r7GzLiaUsHRzWbPPXGoBbFpPBKWrqNVzUNNLBYGubWzWvNiaYvkfVeedxjG7jaAnCompib85d7PhylWXRGw/132' },
   *      { id: 'wxid_tdax1huk5hgs12$dengzhuojia',
   *        img:
   *         'http://wx.qlogo.cn/mmhead/ver_1/4AewylQmjaJBGF1o2VBkJVh5NR1HNTPqV2GcpqwjJCwRZnjMn40jZMezdlGgqoGqPo217apuuIfQ7aSIryW0GbnBHQ6DMtBOLXqbr6xymm8/132' }
   *    ],
   *   type: 'ios',
   *   action: 'avatar_list'
   * }
   */
  id    : string,
  list  : { id: string, img: string}[],
  type  : Type,
  action: Action,
}
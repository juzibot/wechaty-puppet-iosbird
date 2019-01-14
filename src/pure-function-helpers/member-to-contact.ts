import {IosbirdContactPayload, IosbirdRoomMemberPayload} from '../iosbird-schema'
import { ContactType, Type } from '../iosbird-ws'

export const memberToContact = function (member: IosbirdRoomMemberPayload): IosbirdContactPayload {
  const contactData: IosbirdContactPayload = {
    c_type                   : ContactType.contact,
    set_to_top               : false,
    id                       : member.wechat_id,
    c_remark                 : '',
    nick                     : member.wechat_real_nick,
    m_uiLastUpdate           : Date.now(),
    allow_owner_approve_value: false,
    type                     : Type.IOS,
    mute_session             : false,
    name                     : member.wechat_nick,
    avatar                   : member.wechat_img,
    isFriend                 : member.is_myfriend,
  }
  return contactData
}
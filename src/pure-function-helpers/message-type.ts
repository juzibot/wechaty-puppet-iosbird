import { IosbirdMessageType } from '../iosbird-schema'

import { MessageType } from '../../wechaty-puppet/src'

export function messageType (
  rawType?: IosbirdMessageType,
): MessageType {
  let type: MessageType
  switch (rawType) {
    case undefined:
    case IosbirdMessageType.TEXT:
    case IosbirdMessageType.AT:
      type = MessageType.Text
      break

    case IosbirdMessageType.PICTURE:
      type = MessageType.Image
      break
    case IosbirdMessageType.AUDIO:
      type = MessageType.Audio
      break
    case IosbirdMessageType.LINK:
      type = MessageType.Url
      break
    case IosbirdMessageType.FILE:
      type = MessageType.Attachment
      break
    default:
      type = MessageType.Unknown
      break
  }
  return type
}

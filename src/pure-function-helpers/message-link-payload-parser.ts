import { IosbirdMessagePayload } from '../iosbird-schema'
import { UrlLinkPayload } from '../../wechaty-puppet/src'

interface LinkSchema {
  urlStr    : string,   // url of link
  title     : string,
  thumbUrl  : string,
  desc      : string,
  localMsgId: string,
}

export const linkMessageParser = function (rawPayload: IosbirdMessagePayload): UrlLinkPayload {
  const content: string = rawPayload.content.replace('\\', '')
  const schema: LinkSchema = JSON.parse(content)
  const link: UrlLinkPayload = {
    url         : schema.urlStr,
    thumbnailUrl: schema.thumbUrl,
    description : schema.desc,
    title       : schema.title,
  }
  return link
}
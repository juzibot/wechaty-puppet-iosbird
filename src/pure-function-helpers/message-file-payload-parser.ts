import { IosbirdMessagePayload } from '../iosbird-schema'

/**
 * {
 * "action"  : "chat",
 * "to_type" : "web",
 * "s_type"  : "ios",
 * "id"      : "wxid_tdax1huk5hgs12",
 * "cnt_type": 6000,
 * "content" : "{\"title\":\"研发云资料.xlsx\",\"url\":\"http:\\/\\/useoss.51talk.com\\/other\\/71ca73911aa1b69e11e29a24ad9c7a26.xlsx\",\"size\":\"6414\"}",
 * "mem_id"  : "",
 * "u_id"    : "wxid_j76jk7muhgqz22",
 * "type"    : "ios",
 * "name"    : "林贻民"
 * }
 */
export interface FileSchema {
  title: string,   // File name
  size : string,   // Size of the file
  url  : string,   // Url of the file
}

export const fileMessageParser = function (rawPayload: IosbirdMessagePayload): FileSchema {
  const content: string = rawPayload.content.replace('\\', '')
  const schema: FileSchema = JSON.parse(content)
  return schema
}
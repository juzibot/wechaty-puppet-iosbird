import { log } from './config'
interface PendingApiCall {
  resolve: (data: any) => void
  reject : (e: any) => void
}
interface ApiCall {
  timestamp: number            // 函数的调用时间
  returned : boolean           // 是否已经响应
  result?  : any               // 函数调用结果
  listener : PendingApiCall[]  // Promise的性质, 等待函数执行完并获得结果
}

// 为了避免
const EXPIRE_TIME = 10 * 1000
const PRE         = 'DedupeApi'

/**
 * This class will dedupe api calls
 * Multiple calls within a period of time will only fire up one api call to the server,
 * all the other calls will get the same response as the fired one
 *
 * Only api calls in the DEDUPE_API list will be affected.
 */
export class DedupeApi {

  private static instance: DedupeApi

  private cache: {
    [key: string]: ApiCall
  }

  private cleaner: NodeJS.Timer

  public static get Instance () {
    return this.instance || (this.instance = new DedupeApi())
  }
  private constructor () {
    this.cache = {}
    this.cleaner = setInterval(this.cleanData, EXPIRE_TIME)
  }
  public async dedupe<T, TResult>(func: (this: T, args?: any) => Promise<TResult>, thisArg: T, args?: any): Promise<TResult> {
    const key = func.name + '_' + args
    log.silly (PRE, `dedupeApi(${key})`)
    const existCall: ApiCall = this.cache[key]
    const now: number         = new Date().getTime()
    // 之前访问过,并且没有过期
    if(existCall && now - existCall.timestamp < EXPIRE_TIME) {
      // 前一个访问已经访问完成
      if (existCall.returned) {
        log.silly(PRE, `dedupeApi(${key}) dedeped api call with existing results.`)
        return existCall.result
      } else {
        // 前一个访问正在访问, 使用Promise的特性,等待数据返回
        log.silly(PRE, `dedepuApi(${key}) deduped api call with pending listeners.`)
        return new Promise<TResult>((resolve, reject)=> {
          existCall.listener.push({
            resolve,
            reject,
          })
        })
      }
    } else {
      // 第一次访问
      log.silly(PRE, `dedupedApi(${key}) deduped api call missed, call the external service.`)

      this.cache[key] = {
        listener : [],
        returned : false,
        timestamp: now,
      }

      let result: TResult
      try {
        result = await func.call(thisArg, args)
      } catch (e) {
        // 访问失败, 调用Promise的reject返回
        log.warn (PRE, `dedupeApi(${key}) failed from external service, reject ${this.cache[key].listener.length} deplicate api calls.`)
        this.cache[key].listener.map(listener => {
          listener.reject(e)
        })
        throw e
      }
      // 调用成功, 调用Promise的resolve返回
      this.cache[key].result = result
      this.cache[key].returned = true
      log.silly(PRE, `depudeApi(${key}) got results from external service, resolve ${this.cache[key].listener.length} deplicate api calls.`)
      this.cache[key].listener.map(listener => {
        listener.resolve(result)
      })
      return result
    }
  }

  /**
   * Get rid of data in pool that exists for more than EXPIRE_TIME
   */
  private cleanData () {
    const now = new Date().getTime()
    for (const key in this.cache) {
      if (this.cache.hasOwnProperty(key)) {
        const apiCache = this.cache[key]
        if (apiCache.timestamp - now > EXPIRE_TIME) {
          delete this.cache[key]
        }
      }
    }
  }
  /**
   * destory when logout
   */
  public destroy() {
    for (const key in this.cache) {
      if (this.cache.hasOwnProperty(key)) {
        delete this.cache[key]
      }
    }
    clearInterval(this.cleaner)
  }
}

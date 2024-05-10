const { promisify } = require('util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')
const log = require('../../utils/util.log')
const dohQueryAsync = promisify(doh.query)

const PRESETS = {
  'github.com': ['20.27.177.113', '20.205.243.166', '20.200.245.247'],
  'api.github.com': ['20.27.177.116', '20.205.243.168', '20.200.245.245']
}

class DNSOverHTTPS extends BaseDNS {
  constructor (dnsServer) {
    super()
    this.dnsServer = dnsServer
    this.lastLookupError = null // 添加属性来记录最后一次查询错误
  }

  processQueryResult (result) {
    if (result.answers.length === 0) {
      log.error('该域名没有ip地址解析:', result.name)
      return []
    }
    return result.answers
      .filter(item => item.type === 'A')
      .map(item => item.data)
  }

  async _lookup (hostname) {
    const preset = PRESETS[hostname]
    if (preset) {
      log.debug(`使用预设IP集：${hostname}`)
      return preset
    }
    try {
      const result = await dohQueryAsync({ url: this.dnsServer }, [{ type: 'A', name: hostname }])
      const ips = this.processQueryResult(result)
      if (ips.length > 0) {
        log.info('获取到域名地址：', hostname, ips)
      }
      this.lastLookupError = null // 重置错误记录
      return ips
    } catch (e) {
      log.error('DNS查询错误:', hostname, ', DNS服务器:', this.dnsServer, ', 错误:', e)
      this.lastLookupError = e // 记录错误
      throw e // 重新抛出错误，让调用者处理
    }
  }
}

module.exports = DNSOverHTTPS

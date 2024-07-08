const { promisify } = require('util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')
const log = require('../../utils/util.log')
const dohQueryAsync = promisify(doh.query)

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsServer) {
    super()
    this.dnsServer = dnsServer
  }

  async _lookup (hostname) {
    // 直接判断域名是否为example.com
    if (hostname === 'github.com') {
      log.info('域名github.com使用内置IP集')
      // 返回预设的IP地址集
      return ['140.82.114.4', '20.87.245.0', '20.27.177.113', '20.205.243.166', '20.248.137.48', '140.82.121.3', '140.82.116.4', '20.200.245.247', '20.26.156.215', '140.82.113.3', '140.82.121.4', '20.201.28.151']
    }
    // 直接判断域名是否为example.com
    if (hostname === 'api.github.com') {
      log.info('域名api.github.com使用内置IP集')
      // 返回预设的IP地址集
      return ['20.87.245.6', '140.82.112.5', '140.82.116.6', '20.26.156.210', '20.200.245.245', '20.27.177.116', '20.248.137.49', '20.201.28.148', '140.82.113.6', '20.205.243.168', '140.82.121.6']
    }
    if (hostname === 'codeload.github.com') {
      log.info('域名codeload.github.com使用内置IP集')
      // 返回预设的IP地址集
      return ['20.27.177.114', '140.82.116.10', '140.82.114.10', '20.26.156.216', '20.87.245.7', '20.200.245.246', '20.248.137.55', '20.205.243.165', '20.201.28.149', '140.82.121.9', '140.82.113.9']
    }
    if (hostname.match(/.*\.githubusercontent\.com$/)) {
      log.info('域名githubusercontent及其子域使用内置IP集')
      // 返回预设的IP地址集
      return ['185.199.111.133', '185.199.108.133', '185.199.109.133', '185.199.110.133']
    }
    if (hostname === 'github.githubassets.com') {
      log.info('域名github.githubassets.com使用内置IP集')
      // 返回预设的IP地址集
      return ['185.199.110.154', '185.199.111.154', '185.199.109.154', '185.199.108.154']
    }
    if (hostname === 'collector.github.com') {
      log.info('域名collector.github.com已根据AdGuard DNS filter规则拦截')
      // 返回预设的IP地址集
      return ['0.0.0.0']
    }
    if (hostname === 'github.io') {
      log.info('域名github.io使用内置IP集')
      // 返回预设的IP地址集
      return ['185.199.108.153', '185.199.109.153', '185.199.111.153', '185.199.110.153']
    }
    if (hostname === 'hub.docker.com') {
      log.info('域名hub.docker.com使用内置IP集')
      // 返回预设的IP地址集
      return ['54.156.140.159', '52.44.227.212', '44.221.37.199']
    }

    // 未预设当前域名的IP列表，则从dns服务器获取
    try {
      const result = await dohQueryAsync({ url: this.dnsServer }, [{ type: 'A', name: hostname }])
      if (result.answers.length === 0) {
        // 说明没有获取到ip
        log.info('该域名没有ip地址解析:', hostname)
        return []
      }
      const ret = result.answers.filter(item => item.type === 'A').map(item => item.data)
      if (ret.length === 0) {
        log.info('该域名没有IPv4地址解析:', hostname)
      } else {
        log.info('获取到域名地址：', hostname, JSON.stringify(ret))
      }
      return ret
    } catch (e) {
      log.warn('DNS query error:', hostname, ', dns:', this.dnsServer, ', error:', e)
      return []
    }
  }
}

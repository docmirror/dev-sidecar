const { promisify } = require('util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')
const log = require('../../utils/util.log')
const dohQueryAsync = promisify(doh.query)

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor(dnsServer) {
    super();
    this.dnsServer = dnsServer;
  }

  async _lookup(hostname) {
    // 直接判断域名是否为example.com
    if (hostname === 'github.com') {
      log.info('域名github.com使用内置IP集')
      // 返回预设的IP地址集
      return ['20.27.177.113', '20.205.243.166', '20.200.245.247']
      // 20.27.177.113日本(三网平均延时88MS(三网优秀)) 20.205.243.166新加坡(三网平均延时96MS(电信联通106.5平均延时，移动平均77MS)) 20.200.245.247韩国(三网平均108ms(移动平均120ms))
    }
    if (hostname === 'api.github.com') {
      log.info('域名api.github.com使用内置IP集')
      // 返回预设的IP地址集
      return ['20.27.177.116', '20.205.243.168', '20.200.245.245']
    }

    try {
      const result = await dohQueryAsync({ url this.dnsServer }, [{ type 'A', name hostname }])
      if (result.answers.length === 0) {
        // 说明没有获取到ip
        log.info('该域名没有ip地址解析', hostname)
        return [];
      }
      const ret = result.answers.filter(item => item.type === 'A').map(item => item.data)
      if (ret.length === 0) {
        log.info('该域名没有IPv4地址解析', hostname)
      } else {
        log.info('获取到域名地址：', hostname, JSON.stringify(ret))
      }
      return ret;
    } catch (e) {
      log.warn('DNS query error', hostname, ', dns', this.dnsServer, ', error', e)
      return [];
    }
  }
}

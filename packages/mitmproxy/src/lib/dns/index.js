const matchUtil = require('../../utils/util.match')
const ipUtil = require('./util.ip')
const log = require('../../utils/util.log.server')
const DNSOverPreSetIpList = require('./preset.js')
const DNSOverHTTPS = require('./https.js')
const DNSOverTLS = require('./tls.js')
const DNSOverTCP = require('./tcp.js')
const DNSOverUDP = require('./udp.js')

module.exports = {
  initDNS (dnsProviders, preSetIpList) {
    const dnsMap = {}

    // 创建普通的DNS
    for (const provider in dnsProviders) {
      const conf = dnsProviders[provider]

      // 获取DNS服务器
      let server = conf.server || conf.host
      if (server != null) {
        server = server.replace(/\s+/, '')
      }
      if (!server) {
        continue
      }

      // 获取DNS类型
      let type = conf.type
      if (type == null) {
        if (server.startsWith('https://') || server.startsWith('http://')) {
          type = 'https'
        } else if (server.startsWith('tls://') || server.startsWith('dot://')) {
          type = 'tls'
        } else if (server.startsWith('tcp://')) {
          type = 'tcp'
        } else if (server.includes('://') && !server.startsWith('udp://')) {
          throw new Error(`Unknown type DNS: ${server}, provider: ${provider}`)
        } else {
          type = 'udp'
        }
      } else {
        type = type.replace(/\s+/, '').toLowerCase()
      }

      // 获取DNS的Family值
      const family = conf.family

      // 创建DNS对象
      if (type === 'https' || type === 'doh' || type === 'dns-over-https') {
        if (!server.includes('/')) {
          server = `https://${server}/dns-query`
        }

        // 基于 https
        dnsMap[provider] = new DNSOverHTTPS(provider, conf.cacheSize, preSetIpList, server, family, conf.sni || conf.servername)
      } else {
        // 获取DNS端口
        let port = conf.port

        // 处理带协议的DNS服务地址
        if (server.includes('://')) {
          server = server.split('://')[1]
        }
        // 处理带端口的DNS服务地址
        if (port == null && server.includes(':')) {
          // 判断是否为IPv6并带端口号
          if (server.includes(']:')) {
            [server, port] = server.split(']:')
            server = server.substring(1) // 移除第一个字符 `[`
          } else if (!ipUtil.isIPv6(server)) {
            [server, port] = server.split(':')
          }
        }

        // 去除host两边的中括号，因为可能是IPv6配置
        server = server.replace(/[[\]]/g, '')

        if (type === 'tls' || type === 'dot' || type === 'dns-over-tls') {
          // 基于 tls
          dnsMap[provider] = new DNSOverTLS(provider, conf.cacheSize, preSetIpList, server, port, family, conf.sni || conf.servername)
        } else if (type === 'tcp') {
          // 基于 tcp
          dnsMap[provider] = new DNSOverTCP(provider, conf.cacheSize, preSetIpList, server, port, family)
        } else {
          // 基于 udp
          dnsMap[provider] = new DNSOverUDP(provider, conf.cacheSize, preSetIpList, server, port, family)
        }
      }

      if (conf.forSNI || conf.forSni) {
        dnsMap.ForSNI = dnsMap[provider]
      }
    }

    // 创建预设IP的DNS
    dnsMap.PreSet = new DNSOverPreSetIpList(preSetIpList)
    if (dnsMap.ForSNI == null) {
      dnsMap.ForSNI = dnsMap.PreSet
    }

    log.info(`设置SNI默认使用的DNS为 '${dnsMap.ForSNI.dnsName}'（注：当某个域名配置了SNI但未配置DNS时，将默认使用该DNS）`)

    return dnsMap
  },
  getDNSAndFamily (dnsConfig, hostname) {
    // 1. 匹配 预设IP配置
    const hostnamePreSetIpList = matchUtil.matchHostname(dnsConfig.preSetIpList, hostname, 'matched preSetIpList(getDNSAndFamily)')
    if (hostnamePreSetIpList) {
      return {
        dns: dnsConfig.dnsMap.PreSet,
      }
    }

    // 2. 读取域名对应的DNS配置
    const dnsData = matchUtil.matchHostname(dnsConfig.mapping, hostname, 'get dns data')
    if (!dnsData) {
      return null
    }

    // 由于DNS中的usa已重命名为cloudflare，所以做以下处理，为了向下兼容
    let dns
    if (dnsData.dnsName === 'usa' && dnsConfig.dnsMap.usa == null && dnsConfig.dnsMap.cloudflare != null) {
      dns = dnsConfig.dnsMap.cloudflare
    } else {
      dns = dnsConfig.dnsMap[dnsData.dnsName]
      if (!dns) {
        return null
      }
    }

    return {
      dns,
      family: dnsData.family,
    }
  },
}

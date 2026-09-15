const https = require('node:https')
const dns = require('node:dns')
const net = require('node:net')
const log = require('../utils/util.log.server')
const matchUtil = require('../utils/util.match')

const CLOUDFLARE_IPS_URL = 'https://api.cloudflare.com/client/v4/ips'
const REFRESH_IP_RANGES_INTERVAL = 60 * 60 * 1000 // 1 小时
const REFRESH_PREFERRED_IP_INTERVAL = 5 * 60 * 1000 // 5 分钟

class CloudflareRoute {
  constructor () {
    this.enabled = false
    this.preferredEndpoint = ''
    this.mode = 'blacklist' // blacklist（默认）：名单内域名不重定向；whitelist：仅名单内域名重定向
    this.domains = { origin: {} } // 域名黑白名单（域名匹配串 -> true）
    this.cfBlockList = new net.BlockList()
    this.preferredIpv4 = null
    this.preferredIpv6 = null
    this.rangesTimer = null
    this.preferredTimer = null
    this.rangesReady = false
    this.preferredReady = false
    this.readyListener = null
    this.readyWaiters = []
    this.readyNotified = false
  }

  setReadyListener (fn) {
    this.readyListener = fn
  }

  isEnabled () {
    return this.enabled
  }

  isReady () {
    return !this.enabled || (this.rangesReady && this.preferredReady)
  }

  // 等待 Cloudflare 路由数据（IP 段 + 优选地址）就绪；未启用时立即返回
  whenReady (timeoutMs = 16000) {
    if (this.isReady()) {
      return Promise.resolve(true)
    }

    return new Promise((resolve, reject) => {
      let settled = false
      let timer = null

      const waiter = () => {
        if (settled) {
          return
        }
        settled = true
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        resolve(true)
      }

      timer = setTimeout(() => {
        if (settled) {
          return
        }
        settled = true
        timer = null
        this.readyWaiters = this.readyWaiters.filter(fn => fn !== waiter)
        reject(new Error('等待 Cloudflare 路由数据就绪超时'))
      }, timeoutMs)

      this.readyWaiters.push(waiter)
    })
  }

  init (config) {
    const conf = config && config.cloudflareRoute
    if (!conf) {
      return
    }

    this.enabled = conf.enabled === true
    this.preferredEndpoint = conf.preferredEndpoint || ''
    this.mode = conf.mode === 'whitelist' ? 'whitelist' : 'blacklist'
    this.domains = matchUtil.domainMapRegexply(conf.domains || {})
    this.preferredReady = false
    this.readyNotified = false

    this.stop()
    if (this.enabled) {
      this.refreshIpRanges()
      this.refreshPreferredIp()
      this.rangesTimer = setInterval(() => this.refreshIpRanges(), REFRESH_IP_RANGES_INTERVAL)
      this.preferredTimer = setInterval(() => this.refreshPreferredIp(), REFRESH_PREFERRED_IP_INTERVAL)
      if (this.rangesTimer.unref) {
        this.rangesTimer.unref()
      }
      if (this.preferredTimer.unref) {
        this.preferredTimer.unref()
      }
      log.info(`[cloudflare-route] 已启动，优选地址: ${this.preferredEndpoint || '(未填写)'}，模式: ${this.mode}`)
    } else {
      log.info('[cloudflare-route] 未启用')
    }
  }

  _notifyReadyIfNeeded () {
    if (this.readyNotified || !this.enabled || !this.rangesReady || !this.preferredReady) {
      return
    }
    this.readyNotified = true
    if (this.readyListener) {
      try {
        this.readyListener()
      } catch (e) {
        log.warn(`[cloudflare-route] ready 通知回调执行失败: ${e.message}`)
      }
    }

    const waiters = this.readyWaiters
    this.readyWaiters = []
    for (const waiter of waiters) {
      try {
        waiter()
      } catch (e) {
        log.warn(`[cloudflare-route] ready 等待回调执行失败: ${e.message}`)
      }
    }
  }

  stop () {
    if (this.rangesTimer) {
      clearInterval(this.rangesTimer)
      this.rangesTimer = null
    }
    if (this.preferredTimer) {
      clearInterval(this.preferredTimer)
      this.preferredTimer = null
    }
  }

  refreshIpRanges () {
    this.fetchCloudflareIpRanges()
      .then(({ ipv4Cidrs, ipv6Cidrs }) => {
        const blockList = new net.BlockList()
        for (const cidr of ipv4Cidrs) {
          this.addCidrToBlockList(blockList, cidr, 'ipv4')
        }
        for (const cidr of ipv6Cidrs) {
          this.addCidrToBlockList(blockList, cidr, 'ipv6')
        }
        this.cfBlockList = blockList
        this.rangesReady = true
        log.info(`[cloudflare-route] Cloudflare IP 段已更新：IPv4 ${ipv4Cidrs.length} 条，IPv6 ${ipv6Cidrs.length} 条`)
        this._notifyReadyIfNeeded()
      })
      .catch((e) => {
        log.warn(`[cloudflare-route] 获取 Cloudflare IP 段失败: ${e.message}`)
      })
  }

  addCidrToBlockList (blockList, cidr, type) {
    try {
      const [network, prefix] = cidr.split('/')
      blockList.addSubnet(network, Number.parseInt(prefix, 10), type)
    } catch (e) {
      log.warn(`[cloudflare-route] 无效的 CIDR: ${cidr}, error: ${e.message}`)
    }
  }

  refreshPreferredIp () {
    const endpoint = this.preferredEndpoint && this.preferredEndpoint.trim()
    if (!endpoint) {
      this.preferredIpv4 = null
      this.preferredIpv6 = null
      this.preferredReady = true
      this._notifyReadyIfNeeded()
      return Promise.resolve([])
    }

    if (net.isIP(endpoint)) {
      this.setPreferredIp(endpoint)
      this.preferredReady = true
      this._notifyReadyIfNeeded()
      return Promise.resolve([endpoint])
    }

    return this.resolveEndpoint(endpoint)
      .then((addresses) => {
        const ipv4 = addresses.find(item => item.family === 4)
        const ipv6 = addresses.find(item => item.family === 6)
        this.preferredIpv4 = ipv4 ? ipv4.address : null
        this.preferredIpv6 = ipv6 ? ipv6.address : null
        this.preferredReady = true
        this._notifyReadyIfNeeded()
        log.info(`[cloudflare-route] 优选地址解析结果: ${endpoint} -> ${addresses.map(item => item.address).join(', ') || '未解析到'}`)
        return addresses.map(item => item.address)
      })
      .catch((e) => {
        log.warn(`[cloudflare-route] 解析优选地址失败: ${endpoint}, error: ${e.message}`)
        this.preferredReady = true
        this._notifyReadyIfNeeded()
        return []
      })
  }

  setPreferredIp (ip) {
    const family = net.isIP(ip) === 6 ? 6 : 4
    if (family === 4) {
      this.preferredIpv4 = ip
    } else {
      this.preferredIpv6 = ip
    }
  }

  resolveEndpoint (hostname) {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err) {
          reject(err)
        } else {
          resolve(addresses.map(item => ({ address: item.address, family: item.family })))
        }
      })
    })
  }

  fetchCloudflareIpRanges () {
    return new Promise((resolve, reject) => {
      const req = https.get(CLOUDFLARE_IPS_URL, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (!json || !json.result || !Array.isArray(json.result.ipv4_cidrs) || !Array.isArray(json.result.ipv6_cidrs)) {
              reject(new Error('返回数据格式不正确'))
              return
            }
            resolve({
              ipv4Cidrs: json.result.ipv4_cidrs,
              ipv6Cidrs: json.result.ipv6_cidrs,
            })
          } catch (e) {
            reject(e)
          }
        })
      })
      req.on('error', reject)
      req.setTimeout(15000, () => {
        req.destroy(new Error('请求超时'))
      })
    })
  }

  getPreferredEndpoint () {
    return this.preferredEndpoint ? this.preferredEndpoint.trim() : ''
  }

  // 根据黑白名单模式判断某个域名是否应该重定向 Cloudflare IP
  shouldRewrite (hostname) {
    if (!hostname) {
      return true
    }
    const matched = matchUtil.matchHostname(this.domains, hostname, 'cloudflareRoute domains')
    if (this.mode === 'whitelist') {
      return !!matched
    }
    // blacklist：名单内域名不重定向，其余重定向
    return !matched
  }

  isCloudflareIp (ip) {
    if (!this.enabled || !this.rangesReady) {
      return false
    }
    const family = net.isIP(ip)
    if (family !== 4 && family !== 6) {
      return false
    }
    try {
      return this.cfBlockList.check(ip, family === 4 ? 'ipv4' : 'ipv6')
    } catch {
      return false
    }
  }

  // 若 IP 属于 Cloudflare 段，则返回优选 IP（保持地址族一致），否则原样返回
  rewriteIp (ip, hostname) {
    if (!this.enabled || !this.rangesReady || !this.isCloudflareIp(ip)) {
      return ip
    }
    if (!this.shouldRewrite(hostname)) {
      return ip
    }

    const family = net.isIP(ip)
    if (family === 4 && this.preferredIpv4) {
      return this.preferredIpv4
    }
    if (family === 6 && this.preferredIpv6) {
      return this.preferredIpv6
    }
    return ip
  }

  rewriteIps (ips, hostname) {
    if (!this.enabled || !this.rangesReady) {
      return ips
    }
    const list = Array.isArray(ips) ? ips : [ips]
    const result = []
    for (const ip of list) {
      const rewritten = this.rewriteIp(ip, hostname)
      if (rewritten && !result.includes(rewritten)) {
        result.push(rewritten)
      }
    }
    return result.length > 0 ? result : list
  }
}

module.exports = new CloudflareRoute()

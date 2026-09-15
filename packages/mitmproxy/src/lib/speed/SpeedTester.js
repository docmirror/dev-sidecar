// const { exec } = require('node:child_process')
const net = require('node:net')
const _ = require('lodash')
const log = require('../../utils/util.log.server')
const config = require('./config.js')
const matchUtil = require('../../utils/util.match.js')
const cloudflareRoute = require('../cloudflareRoute')
const { isZeroIp } = require('../dns/util.ip')
const { configFromFiles } = require('@docmirror/dev-sidecar/src/config/index.js')

const familyMapping = matchUtil.domainMapRegexply(configFromFiles.server.dns.familyMapping)

// const isWindows = process.platform === 'win32'

const DISABLE_TIMEOUT = 60 * 60 * 1000

class SpeedTester {
  constructor ({ hostname, port }) {
    this.dnsConfig = config.getConfig().dnsConfig || null

    this.hostname = hostname
    this.port = port || 443

    this.ready = false
    this.alive = []
    this.backupList = []

    this.testCount = 0
    this.lastReadTime = Date.now()
    this.keepCheckIntervalId = false

    this.tryTestCount = 0
    this.isTesting = false
    this.isTestingBackups = false
    this.pendingTest = false
    this.waitingForCloudflareReady = false

    this._probeIndex = 0 // 按需探测的轮转索引

    this.test() // 异步：初始化完成后先测速一次
  }

  // 按需探测：SpeedTester 未就绪时，轮转分配未失败 IP，并发请求自动分散
  pickNextForProbing () {
    // 第一轮：优先选未探测、未失败的 IP
    const fresh = this.backupList.filter(item =>
      item.status !== 'failed' && !item._probing,
    )
    if (fresh.length > 0) {
      this._probeIndex = this._probeIndex % fresh.length
      const pick = fresh[this._probeIndex]
      this._probeIndex++
      pick._probing = true
      return pick
    }
    // 第二轮：全部都在探测中，允许复用，总比回退到 DNS 缓存好
    const retry = this.backupList.filter(item => item.status !== 'failed')
    if (retry.length > 0) {
      this._probeIndex = this._probeIndex % retry.length
      return retry[this._probeIndex++]
    }
    return null
  }

  // 按需探测结果反馈：记录 IP 成败，供后续请求决策
  reportProbeResult (host, success) {
    const item = this.backupList.find(i => i.host === host)
    if (!item) {
      return
    }
    item._probing = false
    if (success) {
      item.status = 'success'
      item.time = item.time || 1
      if (!this.alive.some(i => i.host === host)) {
        this.alive.push(item)
      }
    } else {
      item.status = 'failed'
      // 从存活列表中移除失败 IP，避免后续请求和自动重试继续使用这个已失败的 IP
      this.alive = this.alive.filter(i => i.host !== host)
    }
  }

  pickFastAliveIpObj () {
    this.touch()

    // 防御：过滤掉状态已被标记为 failed 的存活 IP
    if (this.alive.length > 0) {
      this.alive = this.alive.filter(item => item.status !== 'failed')
    }

    if (this.alive.length === 0) {
      if (this.backupList.length > 0 && this.tryTestCount % 10 > 0) {
        this.testBackups() // 异步
      } else if (this.tryTestCount % 10 === 0) {
        this.test() // 异步
      }
      this.tryTestCount++

      return null
    }
    return this.alive[0]
  }

  touch () {
    this.lastReadTime = Date.now()
    if (!this.keepCheckIntervalId) {
      this.startChecker()
    }
  }

  startChecker () {
    if (this.keepCheckIntervalId) {
      clearInterval(this.keepCheckIntervalId)
    }
    this.keepCheckIntervalId = setInterval(() => {
      if (Date.now() - DISABLE_TIMEOUT > this.lastReadTime) {
        // 超过很长时间没有访问，取消测试
        clearInterval(this.keepCheckIntervalId)
        this.keepCheckIntervalId = false
        return
      }
      if (this.alive.length > 0) {
        this.testBackups() // 异步
      } else {
        this.test() // 异步
      }
    }, config.getConfig().interval)
  }

  // 按域名动态选择测速使用的 DNS：
  // 1. 预设IP优先级最高；
  // 2. 已在 DNS设置 中配置了 DNS 和 IP版本 的域名，使用该设置项；
  // 3. 其余域名使用 IP测速 中勾选的 dnsProviders。
  getEffectiveDnsConfig () {
    const dnsConfig = this.dnsConfig
    if (dnsConfig == null || dnsConfig.dnsMap == null) {
      return { dnsMap: {}, family: null }
    }

    // 1. 预设IP优先级最高
    const preSetIpList = matchUtil.matchHostname(dnsConfig.preSetIpList, this.hostname, 'matched preSetIpList(speedTest)')
    if (preSetIpList) {
      return {
        dnsMap: { PreSet: dnsConfig.dnsMap.PreSet },
        family: null,
      }
    }

    // 2. DNS设置 中已配置的域名，使用其配置的 DNS 和 IP版本
    const dnsData = matchUtil.matchHostname(dnsConfig.mapping, this.hostname, 'speedTest get dns data')
    if (dnsData && dnsConfig.dnsMap[dnsData.dnsName]) {
      return {
        dnsMap: { [dnsData.dnsName]: dnsConfig.dnsMap[dnsData.dnsName] },
        family: dnsData.family,
      }
    }

    // 3. 其余域名使用 IP测速 中勾选的 dnsProviders
    const dnsMap = {}
    const dnsProviders = config.getConfig().dnsProviders || []
    for (const dnsProvider of dnsProviders) {
      if (dnsConfig.dnsMap[dnsProvider]) {
        dnsMap[dnsProvider] = dnsConfig.dnsMap[dnsProvider]
      }
    }
    return { dnsMap, family: null }
  }

  async getIpListFromDns (dnsMap, family) {
    const ips = {}
    const promiseList = []
    for (const dnsKey in dnsMap) {
      const dns = dnsMap[dnsKey]
      const one = this.getFromOneDns(dns, family).then((ipList) => {
        if (ipList && ipList.length > 0) {
          for (const ip of ipList) {
            // Adblock 拦截返回的 0.0.0.0 / :: 不参与测速，避免出现在 IP 测速列表和 DNS 优选统计中
            if (isZeroIp(ip)) {
              log.info(`[speed] 忽略零 IP 地址（Adblock 拦截特征）: ${this.hostname} -> ${ip}`)
              continue
            }
            ips[ip] = { dns: ipList.isPreSet === true ? '预设IP' : dnsKey }
          }
        }
      })
      promiseList.push(one)
    }
    await Promise.all(promiseList)

    const items = []
    for (const ip in ips) {
      const item = { host: ip, dns: ips[ip].dns }
      // 预设 IP 优先级最高，不参与 Cloudflare 路由重定向
      if (item.dns !== '预设IP') {
        const rewritten = cloudflareRoute.rewriteIp(ip, this.hostname)
        if (rewritten !== ip) {
          // 命中 Cloudflare 路由重定向：测速内容替换为优选 IP 或 CNAME 域名
          item.host = rewritten
          item.cf = true
          item.cfOriginalHost = ip
        }
      }
      items.push(item)
    }
    return items
  }

  async getFromOneDns (dns, family) {
    const lookupFamily = family != null
      ? (Number.parseInt(family) === 6 ? 6 : 4)
      : (Number.parseInt(matchUtil.matchHostname(familyMapping, this.hostname, 'get family')) === 6 ? 6 : 4)
    return await dns._lookupWithPreSetIpList(this.hostname, { family: lookupFamily })
  }

  async test () {
    if (this.isTesting) {
      // 正在等待 Cloudflare 路由数据就绪的测速，就绪后自然会用最新数据继续，无需再挂起一轮
      if (!this.waitingForCloudflareReady) {
        // 当前正在测速时先挂起，待本轮结束后再重测，避免错过关键时机
        this.pendingTest = true
      }
      log.debug(`[speed] test skipped (already running): ${this.hostname}`)
      return
    }
    this.isTesting = true
    this.testCount++
    log.debug(`[speed] test start: ${this.hostname}, testCount: ${this.testCount}`)

    try {
      // Cloudflare 路由重定向开启后，若 IP 段/优选地址尚未就绪，先等待就绪再解析测速，
      // 避免首轮测速拿到原始 Cloudflare IP
      if (cloudflareRoute.isEnabled() && !cloudflareRoute.isReady()) {
        this.waitingForCloudflareReady = true
        log.info(`[speed] 等待 Cloudflare 路由数据就绪后开始测速: ${this.hostname}`)
        try {
          await cloudflareRoute.whenReady()
          log.info(`[speed] Cloudflare 路由数据已就绪，开始测速: ${this.hostname}`)
        } catch (e) {
          log.warn(`[speed] 等待 Cloudflare 路由数据就绪超时，将按原始解析测速: ${this.hostname}, error: ${e.message}`)
        } finally {
          this.waitingForCloudflareReady = false
        }
      }

      const { dnsMap, family } = this.getEffectiveDnsConfig()
      const newList = await this.getIpListFromDns(dnsMap, family)
      // Cloudflare 路由重定向命中后，只测优选 IP/域名，不再保留旧的原始解析 IP
      if (newList.some(item => item.cf === true)) {
        this.backupList = _.unionBy(newList, 'host')
      } else {
        const newBackupList = [...newList, ...this.backupList]
        this.backupList = _.unionBy(newBackupList, 'host')
      }
      // 兜底：剔除历史遗留的零 IP（Adblock 拦截特征），确保不会进入测速与优选
      this.backupList = this.backupList.filter(item => !isZeroIp(item.host))
      await this.testBackups()
      log.info(`[speed] test end: ${this.hostname} ➜ ip-list:`, this.backupList, `, testCount: ${this.testCount}`)
      if (config.notify) {
        config.notify({ key: 'test' })
      }
    } catch (e) {
      log.error(`[speed] test failed: ${this.hostname}, testCount: ${this.testCount}, error:`, e)
    } finally {
      this.isTesting = false
      if (this.pendingTest) {
        this.pendingTest = false
        this.test()
      }
    }
  }

  async testBackups () {
    if (this.isTestingBackups) {
      log.debug(`[speed] testBackups skipped (already running): ${this.hostname}`)
      return
    }
    this.isTestingBackups = true

    try {
      if (this.backupList.length > 0) {
        const aliveList = []

        const testAll = []
        for (const item of this.backupList) {
          testAll.push(this._doTest(item, aliveList))
        }
        await Promise.all(testAll)

        // 全部测速完成后，根据耗时进行排序
        aliveList.sort((a, b) => a.time - b.time)
        this.backupList.sort((a, b) => {
          if (a.time === b.time) {
            return 0
          }
          if (a.time == null) {
            return 1
          }
          if (b.time == null) {
            return -1
          }
          return a.time - b.time
        })

        this.alive = aliveList
      }

      this.ready = true
    } finally {
      this.isTestingBackups = false
    }
  }

  async _doTest (item, aliveList) {
    try {
      const ret = await this.testOne(item)
      item.title = `${ret.by}测速成功：${ret.target}`
      log.info(`[speed] test success: ${this.hostname} ➜ ${item.host}:${this.port} from DNS '${item.dns}'`)
      _.merge(item, ret)
      aliveList.push({ ...ret, ...item })
    } catch (e) {
      if (item.time == null) {
        item.title = e.message
        item.status = 'failed'
      }
      if (!e.message.includes('timeout')) {
        log.warn(`[speed] test error:   ${this.hostname} ➜ ${item.host}:${this.port} from DNS '${item.dns}', errorMsg: ${e.message}`)
      }
    }
  }

  testByTCP (item) {
    return new Promise((resolve, reject) => {
      const { host, dns } = item
      const startTime = Date.now()

      let isOver = false
      const timeout = 5000
      let timeoutId = null

      const client = net.createConnection({ host, port: this.port, family: host.includes(':') ? 6 : 4 }, () => {
        isOver = true
        clearTimeout(timeoutId)

        const connectionTime = Date.now()
        resolve({ status: 'success', by: 'TCP', target: `${host}:${this.port}`, time: connectionTime - startTime })
        client.end()
      })
      client.on('error', (e) => {
        isOver = true
        clearTimeout(timeoutId)

        log.warn('[speed] test by TCP error:  ', this.hostname, `➜ ${host}:${this.port} from DNS '${dns}', cost: ${Date.now() - startTime} ms, errorMsg:`, e.message)
        reject(e)
        client.destroy()
      })

      timeoutId = setTimeout(() => {
        if (!isOver) {
          isOver = true
          log.warn('[speed] test by TCP timeout:', this.hostname, `➜ ${host}:${this.port} from DNS '${dns}', cost: ${Date.now() - startTime} ms`)
          reject(new Error('timeout'))
          client.destroy()
        }
      }, timeout)
    })
  }

  // 暂不使用
  // testByPing (item) {
  //   return new Promise((resolve, reject) => {
  //     const { host, dns } = item
  //     const startTime = Date.now()
  //
  //     // 设置超时程序
  //     let isOver = false
  //     const timeout = 5000
  //     const timeoutId = setTimeout(() => {
  //       if (!isOver) {
  //         log.warn('[speed] test by PING timeout:', this.hostname, `➜ ${host} from DNS '${dns}', cost: ${Date.now() - startTime} ms`)
  //         reject(new Error('timeout'))
  //       }
  //     }, timeout)
  //
  //     // 协议选择（如强制ping6）
  //     const usePing6 = !isWindows && host.includes(':') // Windows无ping6命令
  //     const cmd = usePing6
  //       ? `ping6 -c 2 ${host}`
  //       : isWindows
  //         ? `ping -n 2 ${host}`
  //         : `ping -c 2 ${host}`
  //
  //     log.debug('[speed] test by PING start:', this.hostname, `➜ ${host} from DNS '${dns}'`)
  //     exec(cmd, (error, stdout, _stderr) => {
  //       isOver = true
  //       clearTimeout(timeoutId)
  //
  //       if (error) {
  //         log.warn('[speed] test by PING error:', this.hostname, `➜ ${host} from DNS '${dns}', cost: ${Date.now() - startTime} ms, error: 目标不可达或超时`)
  //         reject(new Error('目标不可达或超时'))
  //         return
  //       }
  //
  //       // 提取延迟数据（正则匹配）
  //       const regex = /[=<](\d+(?:\.\d*)?)ms/gi // 适配Linux/Windows
  //       const times = []
  //       let match
  //       // eslint-disable-next-line no-cond-assign
  //       while ((match = regex.exec(stdout)) !== null) {
  //         times.push(Number.parseFloat(match[1]))
  //       }
  //
  //       if (times.length === 0) {
  //         log.warn('[speed] test by PING error:', this.hostname, `➜ ${host} from DNS '${dns}', cost: ${Date.now() - startTime} ms, error: 无法解析延迟`)
  //         reject(new Error('无法解析延迟'))
  //       } else {
  //         // 计算平均延迟
  //         const avg = times.reduce((a, b) => a + b, 0) / times.length
  //         resolve({ status: 'success', by: 'PING', target: host, time: Math.round(avg) })
  //       }
  //     })
  //   })
  // }

  testOne (item) {
    return new Promise((resolve, reject) => {
      const thenFun = (ret) => {
        resolve(ret)
      }

      // 先用TCP测速
      this.testByTCP(item)
        .then(thenFun)
        .catch((e) => {
          // // TCP测速失败，再用 PING 测速
          // this.testByPing(item)
          //   .then(thenFun)
          //   .catch((e2) => {
          //     reject(new Error(`TCP测速失败：${e.message}；PING测速失败：${e2.message}；`))
          //   })

          reject(new Error(`TCP测速失败：${item.host}:${this.port} ${e.message}`))
        })
    })
  }
}

module.exports = SpeedTester

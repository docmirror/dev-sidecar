// 1个小时不访问，取消获取
const _ = require('lodash')
const net = require('net')
const config = require('./config.js')
const log = require('../../utils/util.log.js')
const DISABLE_TIMEOUT = 60 * 60 * 1000
class SpeedTester {
  constructor ({ hostname }) {
    this.dnsMap = config.getConfig().dnsMap
    this.hostname = hostname
    this.lastReadTime = Date.now()
    this.ready = false
    this.alive = []
    this.backupList = []
    this.keepCheckId = false

    this.loadingIps = false
    this.loadingTest = false

    this.test()
  }

  pickFastAliveIp () {
    this.touch()
    if (this.alive.length === 0) {
      this.test()
      return null
    }
    return this.alive[0].host
  }

  touch () {
    this.lastReadTime = Date.now()
    if (!this.keepCheckId) {
      this.startChecker()
    }
  }

  startChecker () {
    if (this.keepCheckId) {
      clearInterval(this.keepCheckId)
    }
    this.keepCheckId = setInterval(() => {
      if (Date.now() - DISABLE_TIMEOUT > this.lastReadTime) {
        // 超过很长时间没有访问，取消测试
        clearInterval(this.keepCheckId)
        return
      }
      if (this.alive.length > 0) {
        this.testBackups()
        return
      }
      this.test()
    }, config.getConfig().interval)
  }

  async getIpListFromDns (dnsMap) {
    const ips = {}
    const promiseList = []
    for (const key in dnsMap) {
      const one = this.getFromOneDns(dnsMap[key]).then(ipList => {
        if (ipList) {
          for (const ip of ipList) {
            ips[ip] = 1
          }
        }
      })
      promiseList.push(one)
    }
    await Promise.all(promiseList)
    const items = []
    for (const ip in ips) {
      items.push({ host: ip, port: 443 })
    }
    return items
  }

  async getFromOneDns (dns) {
    return await dns._lookup(this.hostname)
  }

  async test () {
    const newList = await this.getIpListFromDns(this.dnsMap)
    const newBackupList = [...newList, ...this.backupList]
    this.backupList = _.unionBy(newBackupList, 'host')
    log.info('[speed]', this.hostname, ' ips:', this.backupList)
    await this.testBackups()
    if (config.notify) {
      config.notify({ key: 'test' })
    }
  }

  async testBackups () {
    const testAll = []
    const aliveList = []
    for (const item of this.backupList) {
      testAll.push(this.doTest(item, aliveList))
    }
    await Promise.all(testAll)
    this.alive = aliveList
    this.ready = true
  }

  async doTest (item, aliveList) {
    try {
      const ret = await this.testOne(item)
      _.merge(item, ret)
      aliveList.push({ ...ret, ...item })
      aliveList.sort((a, b) => a.time - b.time)
      this.backupList.sort((a, b) => a.time - b.time)
    } catch (e) {
      log.error('[speed] test error', this.hostname, item.host, e.message)
    }
  }

  testOne (item) {
    const timeout = 5000
    const { host, port } = item
    const startTime = Date.now()
    let isOver = false
    return new Promise((resolve, reject) => {
      let timeoutId = null
      const client = net.createConnection({ host, port }, () => {
        // 'connect' 监听器
        const connectionTime = Date.now()
        isOver = true
        clearTimeout(timeoutId)
        resolve({ status: 'success', time: connectionTime - startTime })
        client.end()
      })
      client.on('end', () => {
      })
      client.on('error', (error) => {
        log.error('[speed]test error', this.hostname, host, error.message)
        isOver = true
        clearTimeout(timeoutId)
        reject(error)
      })

      timeoutId = setTimeout(() => {
        if (isOver) {
          return
        }
        log.error('[speed] test timeout', this.hostname, host)
        reject(new Error('timeout'))
        client.end()
      }, timeout)
    })
  }
}

module.exports = SpeedTester

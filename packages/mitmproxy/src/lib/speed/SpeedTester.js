// const { exec } = require('node:child_process')
const net = require('node:net')
const _ = require('lodash')
const log = require('../../utils/util.log.server')
const config = require('./config.js')

// const isWindows = process.platform === 'win32'

const DISABLE_TIMEOUT = 60 * 60 * 1000

class SpeedTester {
  constructor ({ hostname, port }) {
    this.dnsMap = config.getConfig().dnsMap

    this.hostname = hostname
    this.port = port || 443

    this.ready = false
    this.alive = []
    this.backupList = []

    this.testCount = 0
    this.lastReadTime = Date.now()
    this.keepCheckIntervalId = false

    this.tryTestCount = 0

    this.test() // 异步：初始化完成后先测速一次
  }

  pickFastAliveIpObj () {
    this.touch()

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

  async getIpListFromDns (dnsMap) {
    const ips = {}
    const promiseList = []
    for (const dnsKey in dnsMap) {
      const dns = dnsMap[dnsKey]
      const one = this.getFromOneDns(dns).then((ipList) => {
        if (ipList && ipList.length > 0) {
          for (const ip of ipList) {
            ips[ip] = { dns: ipList.isPreSet === true ? '预设IP' : dnsKey }
          }
        }
      })
      promiseList.push(one)
    }
    await Promise.all(promiseList)

    const items = []
    for (const ip in ips) {
      items.push({ host: ip, dns: ips[ip].dns })
    }
    return items
  }

  async getFromOneDns (dns) {
    return await dns._lookupWithPreSetIpList(this.hostname)
  }

  async test () {
    this.testCount++
    log.debug(`[speed] test start: ${this.hostname}, testCount: ${this.testCount}`)

    try {
      const newList = await this.getIpListFromDns(this.dnsMap)
      const newBackupList = [...newList, ...this.backupList]
      this.backupList = _.unionBy(newBackupList, 'host')
      await this.testBackups()
      log.info(`[speed] test end: ${this.hostname} ➜ ip-list:`, this.backupList, `, testCount: ${this.testCount}`)
      if (config.notify) {
        config.notify({ key: 'test' })
      }
    } catch (e) {
      log.error(`[speed] test failed: ${this.hostname}, testCount: ${this.testCount}, error:`, e)
    }
  }

  async testBackups () {
    if (this.backupList.length > 0) {
      const aliveList = []

      const testAll = []
      for (const item of this.backupList) {
        testAll.push(this.doTest(item, aliveList))
      }
      await Promise.all(testAll)
      this.alive = aliveList
    }

    this.ready = true
  }

  async doTest (item, aliveList) {
    try {
      const ret = await this.testOne(item)
      item.title = `${ret.by}测速成功：${item.host}`
      log.info(`[speed] test success: ${this.hostname} ➜ ${item.host}:${this.port} from DNS '${item.dns}'`)
      _.merge(item, ret)
      aliveList.push({ ...ret, ...item })
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

      const client = net.createConnection({ host, port: this.port }, () => {
        isOver = true
        clearTimeout(timeoutId)

        const connectionTime = Date.now()
        resolve({ status: 'success', by: 'TCP', time: connectionTime - startTime })
        client.end()
      })
      client.on('error', (e) => {
        isOver = true
        clearTimeout(timeoutId)

        log.warn('[speed] test by TCP error:  ', this.hostname, `➜ ${host}:${this.port} from DNS '${dns}', cost: ${Date.now() - startTime} ms, errorMsg:`, e.message)
        reject(e)
        client.end()
      })

      timeoutId = setTimeout(() => {
        if (isOver) {
          return
        }

        log.warn('[speed] test by TCP timeout:', this.hostname, `➜ ${host}:${this.port} from DNS '${dns}', cost: ${Date.now() - startTime} ms`)
        reject(new Error('timeout'))
        client.end()
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
  //         resolve({ status: 'success', by: 'PING', time: Math.round(avg) })
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

          reject(new Error(`TCP测速失败：${e.message}`))
        })
    })
  }
}

module.exports = SpeedTester

/**
 * Test if can complete TCP handshakes (ports 80+443) with:
 *  - IPs known to be allowed
 *  - IPs known to be blocked
 */

const { createConnection } = require('node:net')
const { TestGroup } = require('../template')
const { FAMILY_VALUES, getCensorsString, getResultIcon } = require('../utils')

class TcpTester extends TestGroup {
  /**
   * A test group to assess the system's ability to establish
   * TCP connections
   */
  constructor(globalConfig, globalResults) {
    super(globalConfig, globalResults, 'TCP')
  }

  static getTestTag() {
    return 'TCP'
  }

  static getPrereqs() {
    return ['Route']
  }

  getDefaultResults() {
    return {
      IPv4: false,
      IPv6: false,
    }
  }

  checkIfShouldSkip(globalResults) {
    /**
     * Skip if TCP routing tests all failed
     */
    let skip = true
    for (const family in FAMILY_VALUES) {
      if (globalResults.Route[family].TCP) {
        this.results[family] = {}
        skip = false
      }
    }
    if (skip) {
      return 'no routable TCP networks'
    }
    return null
  }

  async startTest() {
    for (const family in FAMILY_VALUES) {
      if (this.results[family] === false) {
        continue // not routable
      }
      for (const port of this.config.ports) {
        this.results[family][port] = {}
        const addrs = this.config.addrs[family]
        for (const key of ['allow', 'block']) {
          for (const addr of addrs[key]) {
            this.startTestThread(
              TcpTester.tcpThread,
              [family, port, addr],
              `${key}, ${addr}:${port}`,
              this.config.timeout,
            )
          }
        }
      }
    }
  }

  logResults() {
    let resStr = ''
    for (const [family, portRes] of Object.entries(this.results)) {
      if (portRes === false) {
        continue
      }
      resStr += `${family}: `
      const censors = []
      const addrs = this.config.addrs[family]
      for (const [port, results] of Object.entries(portRes)) {
        const dstTag = `TCP:${port}`
        const allowList = addrs.allow
        const allowOkCnt = allowList.reduce((sum, addr) => sum + (results[addr] === null ? 1 : 0), 0)
        const allowTotal = allowList.length
        let resIcon
        if (allowOkCnt === allowTotal) { // can connect
          resIcon = getResultIcon(true)
        } else if (allowOkCnt === 0) { // can't connect
          resIcon = getResultIcon(false)
        } else { // test inconclusive
          resIcon = getResultIcon(null, `connected ${allowOkCnt}/${allowTotal}`)
        }
        resStr += `${dstTag} ${resIcon} `

        const blockList = addrs.block
        const blocksTotal = blockList.length

        const timeoutCnt = blockList.reduce((sum, addr) => sum + (results[addr] === 'timeout' ? 1 : 0), 0)
        if (timeoutCnt > 0) {
          censors.push(`Blocked ${dstTag} handshake timeouts: ${timeoutCnt}/${blocksTotal} timeouts`)
        }

        const errorCnt = blockList.reduce((sum, addr) => sum + (results[addr] === 'error' ? 1 : 0), 0)
        if (errorCnt > 0) {
          censors.push(`Blocked ${dstTag} handshake errors: ${errorCnt}/${blocksTotal} errors`)
        }
      }
      resStr += `\n${getCensorsString(censors)}`
    }
    return resStr
  }

  static async tcpThread(timeout, logger, results, family, port, addr) {
    results[family][port][addr] = 'timeout'

    const sock = createConnection({
      host: addr,
      port,
      family: FAMILY_VALUES[family] === 4 ? 4 : 6,
    })

    // Set socket timeout
    sock.setTimeout(1000) // 1 second timeout

    if (timeout.isSet) {
      sock.destroy()
      return
    }

    try {
      const dst = `${addr}:${port}`
      logger(`Connecting socket to ${dst}`)
      await new Promise((resolve, reject) => {
        sock.on('connect', resolve)
        sock.on('error', reject)
        sock.on('timeout', () => reject(new Error('timeout')))
      })
      if (timeout.isSet) {
        sock.destroy()
        return
      }
    } catch (error) {
      if (!timeout.isSet) {
        logger(`Failed with exception: ${error.message}`)
        if (error.message === 'timeout') {
          results[family][port][addr] = 'timeout'
        } else {
          results[family][port][addr] = 'error'
        }
      }
      sock.destroy()
      return
    }
    logger('Connected!')
    results[family][port][addr] = null
    sock.destroy()
  }
}

function getClientTests() {
  return [TcpTester]
}

module.exports = {
  TcpTester,
  getClientTests,
}

/**
 * Test if can complete TLS handshakes (port 443) with an IP
 * address that is allowed but subject to censorship. Test:
 *  - Handshake without any SNI
 *  - An SNI known to be allowed
 *  - An SNI known to be blocked
 *  - A known blocked SNI, but with ClientHello fragmenting
 */

const net = require('node:net')
const tls = require('node:tls')
const { TestGroup } = require('../template')
const { FAMILY_VALUES, getCensorsString, getResultIcon, LogColors } = require('../utils')

const SNI_TEST_STRATEGIES = ['none', 'allow', 'block', 'frag']

class TlsTester extends TestGroup {
  /**
   * A test group to assess the system's ability to
   * establish TLS connections
   */
  constructor(globalConfig, globalResults) {
    super(globalConfig, globalResults, 'TLS')
  }

  static getTestTag() {
    return 'TLS'
  }

  static getPrereqs() {
    return ['Route', 'TCP']
  }

  getDefaultResults() {
    return {
      IPv4: false,
      IPv6: false,
    }
  }

  checkIfShouldSkip(globalResults) {
    /**
     * Skip if TCP test failed
     */
    let skip = true
    for (const family in FAMILY_VALUES) {
      const tcpRes = globalResults.TCP && globalResults.TCP[family]
      if (tcpRes && tcpRes[443] && Object.values(tcpRes[443]).includes(null)) {
        this.results[family] = {}
        skip = false
      }
    }
    if (skip) {
      return 'cannot make TCP connections'
    }
    return null
  }

  async startTest() {
    for (const family in FAMILY_VALUES) {
      if (this.results[family] === false) {
        continue
      }
      const addr = this.config.addrs[family]
      if (!addr) {
        this.results[family] = false
        continue
      }
      this.results[family] = this.results[family] || {}
      for (const strategy of SNI_TEST_STRATEGIES) {
        let sni = null
        if (strategy === 'allow') {
          sni = this.config.snis.allow
        } else if (strategy === 'block' || strategy === 'frag') {
          sni = this.config.snis.block
        }
        this.startTestThread(
          TlsTester.tlsThread,
          [family, addr, sni, strategy],
          `${family}, ${strategy}`,
          this.config.timeout,
        )
      }
    }
  }

  logResults() {
    let resStr = ''
    for (const [family, results] of Object.entries(this.results)) {
      if (results === false) {
        continue
      }
      resStr += `${family}: `
      const noneIcon = getResultIcon(results.none === null)
      resStr += `IP-only ${noneIcon} `
      const allowIcon = getResultIcon(results.allow === null)
      resStr += `SNI ${allowIcon}\n`

      const censors = []
      const blockRes = results.block
      if (blockRes !== null) {
        censors.push(`Blocked SNI handshake ${blockRes}`)
      }
      resStr += getCensorsString(censors)

      const fragRes = results.frag
      if (fragRes === null) {
        resStr += `    Circumvention found: ${LogColors.GREEN}TLS record fragmentation${LogColors.RESET}\n`
      } else if (fragRes) {
        resStr += `    ${LogColors.RED}TLS record fragmentation ${fragRes}${LogColors.RESET}\n`
      } else {
        resStr += '    TLS record fragmentation test inconclusive\n'
      }
    }
    return resStr
  }

  static async tlsThread(timeout, logger, results, family, addr, sni, strategy) {
    results[family][strategy] = 'timeout'

    const sock = net.createConnection({
      host: addr,
      port: 443,
      family: FAMILY_VALUES[family] === 4 ? 4 : 6,
    })
    sock.setTimeout(1000)

    if (timeout.isSet) {
      sock.destroy()
      return
    }

    try {
      const dst = `${addr}:443`
      logger(`Connecting socket to ${dst}`)
      await new Promise((resolve, reject) => {
        sock.on('connect', resolve)
        sock.on('error', reject)
        sock.on('timeout', () => reject(new Error('timeout')))
      })
    } catch (error) {
      if (!timeout.isSet) {
        logger(`Connect failed with exception: ${error.message}`)
        results[family][strategy] = error.message === 'timeout' ? 'timeout' : 'error'
      }
      sock.destroy()
      return
    }

    let errMsg = null
    try {
      logger('Attempting TLS handshake')
      await new Promise((resolve, reject) => {
        const tlsSock = tls.connect({
          socket: sock,
          servername: sni || undefined,
          rejectUnauthorized: false,
        }, resolve)
        tlsSock.on('error', (error) => {
          logger(`TLS error: ${error.code} - ${error.message}`)
          if (strategy === 'block' && error.code === 'ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE') {
            resolve()
          } else if ((strategy === 'allow' || strategy === 'none') && error.code === 'ECONNRESET') {
            resolve()
          } else {
            reject(error)
          }
        })
      })
    } catch (error) {
      if (error.code !== 'ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE') {
        errMsg = error.message
      }
    }

    if (timeout.isSet) {
      sock.destroy()
      return
    }

    if (errMsg === null) {
      logger('TLS handshake complete!')
      results[family][strategy] = null
    } else {
      logger(`TLS handshake failed with error: ${errMsg}`)
      results[family][strategy] = 'error'
    }
    sock.destroy()
  }
}

function getClientTests() {
  return [TlsTester]
}

module.exports = {
  TlsTester,
  getClientTests,
}

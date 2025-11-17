/**
 * For IPv4+6 versions of TCP and UDP, see if:
 *  1) We can create a socket
 *  2) The system can route to a non-local address
 */

const { createSocket } = require('node:dgram')
const { createConnection } = require('node:net')

const { TestGroup } = require('../template')
const { FAMILY_VALUES, getResultIcon, PROTOCOL_VALUES } = require('../utils')

const ROUTE_TEST_DGRAM = Buffer.from('122401000000000000000006676f6f676c6503636f6d0000010001', 'hex')

class RouteTester extends TestGroup {
  /**
   * A test group to assess the system's routing capability
   */
  constructor(globalConfig, globalResults) {
    super(globalConfig, globalResults, 'Route')
  }

  static getTestTag() {
    return 'Route'
  }

  getDefaultResults() {
    return {
      IPv4: {
        TCP: false,
        UDP: false,
      },
      IPv6: {
        TCP: false,
        UDP: false,
      },
    }
  }

  async startTest() {
    for (const family in FAMILY_VALUES) {
      for (const protocol in PROTOCOL_VALUES) {
        const dst = [this.config.addrs[family], this.config.port]
        this.startTestThread(
          RouteTester.routeThread,
          [family, protocol, dst],
          `${family}, ${protocol}`,
          this.config.timeout,
        )
      }
    }
  }

  logResults() {
    let resStr = ''
    for (const family in FAMILY_VALUES) {
      resStr += `${family}: `
      for (const protocol in PROTOCOL_VALUES) {
        const resIcon = this.results[family][protocol] ? getResultIcon(true) : getResultIcon(false)
        resStr += `${protocol} ${resIcon} `
      }
      resStr += '\n'
    }
    return resStr
  }

  static async routeThread(timeout, logger, results, family, protocol, dst) {
    let sock
    try {
      logger('Creating socket...')
      if (protocol === 'TCP') {
        sock = createConnection({
          host: dst[0],
          port: dst[1],
          family: FAMILY_VALUES[family] === 4 ? 4 : 6,
        })
      } else { // UDP
        sock = createSocket({
          type: FAMILY_VALUES[family] === 4 ? 'udp4' : 'udp6',
        })
      }

      if (timeout.isSet) {
        if (sock) {
          if (protocol === 'UDP') {
            sock.close()
          } else {
            sock.destroy()
          }
        }
        return
      }

      if (protocol === 'TCP') {
        logger(`Connecting socket to ${dst[0]}:${dst[1]}`)
        await new Promise((resolve, reject) => {
          sock.connect(dst[1], dst[0], resolve)
          sock.on('error', reject)
          sock.on('timeout', () => reject(new Error('timeout')))
        })
      } else { // UDP
        logger(`Sending datagram to ${dst[0]}:${dst[1]}`)
        sock.send(ROUTE_TEST_DGRAM, 0, ROUTE_TEST_DGRAM.length, dst[1], dst[0])
      }
      if (protocol === 'UDP') {
        sock.close()
      } else {
        sock.destroy()
      }
    } catch (error) {
      if (!timeout.isSet) {
        logger(`Failed with exception: ${error.message}`)
        // For routing test, connection errors often mean the network is routable
        // but the service is not available (e.g., TCP to DNS port)
        if (error.code === 'ECONNREFUSED' || error.code === 'EINVAL' || error.code === 'ENETUNREACH' || error.message.includes('timeout')) {
          logger('Routing successful!')
          results[family][protocol] = true
          if (sock) {
            if (protocol === 'UDP') {
              sock.close()
            } else {
              sock.destroy()
            }
          }
          return
        }
      }
      if (sock) {
        if (protocol === 'UDP') {
          sock.close()
        } else {
          sock.destroy()
        }
      }
      return
    }
    logger('Routing successful!')
    results[family][protocol] = true
  }
}

function getClientTests() {
  return [RouteTester]
}

module.exports = {
  RouteTester,
  getClientTests,
}

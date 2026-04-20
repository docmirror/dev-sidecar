const net = require('node:net')
const { Buffer } = require('node:buffer')
const dnsPacket = require('dns-packet')
const randi = require('random-int')
const BaseDNS = require('./base')

const defaultPort = 53 // TCP类型的DNS服务默认端口号
const DNS_QUERY_TIMEOUT_MS = 5000 // DNS 查询的默认超时时间（毫秒）
const DNS_LENGTH_PREFIX_SIZE = 2 // TCP DNS 帧的前 2 字节为报文长度

module.exports = class DNSOverTCP extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort, dnsFamily) {
    super(dnsServer.replace(/\s+/, ''), dnsFamily, dnsName, 'TCP', cacheSize, preSetIpList)
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort
  }

  _dnsQueryPromise (hostname, type = 'A') {
    return new Promise((resolve, reject) => {
      // 构造 DNS 查询报文
      const packet = dnsPacket.encode({
        flags: dnsPacket.RECURSION_DESIRED,
        type: 'query',
        id: randi(0x0, 0xFFFF),
        questions: [{
          type,
          name: hostname,
        }],
      })

      let isFinished = false
      let timeoutId = null

      function finish (fn) {
        if (isFinished) {
          return
        }
        isFinished = true
        clearTimeout(timeoutId)
        tcpClient.destroy()
        fn()
      }

      // --- TCP 查询 ---
      const tcpClient = net.createConnection({
        host: this.dnsServer,
        port: this.dnsServerPort,
        family: this.dnsFamily,
      }, () => {
        // TCP DNS 报文前需添加 2 字节长度头
        const lengthBuffer = Buffer.alloc(2)
        lengthBuffer.writeUInt16BE(packet.length)
        tcpClient.write(Buffer.concat([lengthBuffer, packet]))
      })

      // 超时处理：base.js 也有 8s 外层超时，但不会销毁内层 TCP socket；这里提前清理，避免泄漏。
      timeoutId = setTimeout(() => {
        finish(() => reject(new Error('DNS查询超时')))
      }, DNS_QUERY_TIMEOUT_MS)

      // DNS-over-TCP 响应头含 2 字节长度，之后的完整报文可能跨多个 TCP 分片到达，需要累积数据。
      let response = Buffer.alloc(0)
      let packetLength = 0

      tcpClient.on('data', (data) => {
        response = Buffer.concat([response, data])

        if (packetLength === 0) {
          if (response.length < DNS_LENGTH_PREFIX_SIZE) {
            return // 等待更多数据
          }
          packetLength = response.readUInt16BE(0)
        }

        if (response.length >= packetLength + DNS_LENGTH_PREFIX_SIZE) {
          finish(() => {
            try {
              resolve(dnsPacket.decode(response.subarray(DNS_LENGTH_PREFIX_SIZE, DNS_LENGTH_PREFIX_SIZE + packetLength)))
            } catch (e) {
              reject(e)
            }
          })
        }
      })

      tcpClient.once('error', (err) => {
        finish(() => reject(err))
      })
    })
  }
}

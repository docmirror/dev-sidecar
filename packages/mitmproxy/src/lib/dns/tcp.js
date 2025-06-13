const net = require('node:net')
const { Buffer } = require('node:buffer')
const dnsPacket = require('dns-packet')
const randi = require('random-int')
const BaseDNS = require('./base')

const defaultPort = 53 // TCP类型的DNS服务默认端口号

module.exports = class DNSOverTCP extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort) {
    super(dnsName, 'TCP', cacheSize, preSetIpList)
    this.dnsServer = dnsServer
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort
    this.isIPv6 = dnsServer.includes(':') && dnsServer.includes('[') && dnsServer.includes(']')
  }

  _doDnsQuery (hostname, options = {}) {
    return new Promise((resolve, reject) => {
      // 构造 DNS 查询报文
      const packet = dnsPacket.encode({
        flags: dnsPacket.RECURSION_DESIRED,
        type: 'query',
        id: randi(0x0, 0xFFFF),
        questions: [{
          type: options.family === 6 ? 'AAAA' : 'A',
          name: hostname,
        }],
      })

      // --- TCP 查询 ---
      const tcpClient = net.createConnection({
        host: this.dnsServer,
        port: this.dnsServerPort,
        family: this.isIPv6 ? 6 : 4
      }, () => {
        // TCP DNS 报文前需添加 2 字节长度头
        const lengthBuffer = Buffer.alloc(2)
        lengthBuffer.writeUInt16BE(packet.length)
        tcpClient.write(Buffer.concat([lengthBuffer, packet]))
      })

      tcpClient.once('data', (data) => {
        const length = data.readUInt16BE(0)
        const response = dnsPacket.decode(data.subarray(2, 2 + length))
        resolve(response)
        tcpClient.end()
      })

      tcpClient.once('error', (err) => {
        reject(err)
        tcpClient.end()
      })
    })
  }
}

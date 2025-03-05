const dgram = require('node:dgram')
const dnsPacket = require('dns-packet')
const randi = require('random-int')
const BaseDNS = require('./base')

const udpClient = dgram.createSocket('udp4')

const defaultPort = 53 // UDP类型的DNS服务默认端口号

module.exports = class DNSOverUDP extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort) {
    super(dnsName, 'UDP', cacheSize, preSetIpList)
    this.dnsServer = dnsServer
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort
  }

  _doDnsQuery (hostname) {
    return new Promise((resolve, reject) => {
      // 构造 DNS 查询报文
      const packet = dnsPacket.encode({
        flags: dnsPacket.RECURSION_DESIRED,
        type: 'query',
        id: randi(0x0, 0xFFFF),
        questions: [{
          type: 'A',
          name: hostname,
        }],
      })

      // 发送 UDP 查询
      udpClient.send(packet, 0, packet.length, this.dnsServerPort, this.dnsServer, (err) => {
        if (err) {
          reject(err)
        }
      })

      // 接收 UDP 响应
      udpClient.once('message', (msg) => {
        const response = dnsPacket.decode(msg)
        resolve(response)
      })
    })
  }
}

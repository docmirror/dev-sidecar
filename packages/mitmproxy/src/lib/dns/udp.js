const dgram = require('node:dgram')
const dnsPacket = require('dns-packet')
const randi = require('random-int')
const BaseDNS = require('./base')

const defaultPort = 53 // UDP类型的DNS服务默认端口号

module.exports = class DNSOverUDP extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort) {
    super(dnsName, 'UDP', cacheSize, preSetIpList)
    this.dnsServer = dnsServer
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort

    this.isIPv6 = dnsServer.includes(':') && dnsServer.includes('[') && dnsServer.includes(']')
    this.socketType = this.isIPv6 ? 'udp6' : 'udp4'
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

      // 创建客户端
      const udpClient = dgram.createSocket(this.socketType, (msg, _rinfo) => {
        const response = dnsPacket.decode(msg)
        resolve(response)
        udpClient.close()
      })

      // 发送 UDP 查询
      udpClient.send(packet, 0, packet.length, this.dnsServerPort, this.dnsServer, (err, _bytes) => {
        if (err) {
          reject(err)
          udpClient.close()
        }
      })
    })
  }
}

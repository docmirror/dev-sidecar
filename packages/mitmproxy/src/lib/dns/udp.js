const dgram = require('node:dgram')
const dnsPacket = require('dns-packet')
const randi = require('random-int')
const BaseDNS = require('./base')

const defaultPort = 53 // UDP类型的DNS服务默认端口号

module.exports = class DNSOverUDP extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort, dnsFamily) {
    super(dnsServer.replace(/\s+/, ''), dnsFamily, dnsName, 'UDP', cacheSize, preSetIpList)
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort

    this.socketType = this.dnsFamily === 6 ? 'udp6' : 'udp4'
  }

  _dnsQueryPromise (hostname, type = 'A') {
    return new Promise((resolve, reject) => {
      let isOver = false
      const timeout = 5000
      let timeoutId = null

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

      // 统一收尾函数：保证只执行一次，清理定时器并关闭 socket
      function finish (fn) {
        if (isOver) {
          return
        }
        isOver = true
        clearTimeout(timeoutId)
        try { udpClient.close() } catch { /* 已关闭，忽略 */ }
        fn()
      }

      // 创建客户端
      const udpClient = dgram.createSocket(this.socketType)

      udpClient.on('message', (msg, _rinfo) => {
        finish(() => {
          try {
            resolve(dnsPacket.decode(msg))
          } catch (e) {
            reject(e)
          }
        })
      })

      udpClient.on('error', (err) => {
        finish(() => reject(err))
      })

      // 发送 UDP 查询
      udpClient.send(packet, 0, packet.length, this.dnsServerPort, this.dnsServer, (err, _bytes) => {
        if (err) {
          finish(() => reject(err))
        }
      })

      // 设置超时任务
      timeoutId = setTimeout(() => {
        finish(() => reject(new Error('DNS查询超时')))
      }, timeout)
    })
  }
}

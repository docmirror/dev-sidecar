/**
 * 由于组件 `dns-over-tls@0.0.9` 不支持 `rejectUnauthorized` 和 `timeout` 两个参数，所以将源码复制过来，并简化了代码。
 */
const dnsPacket = require('dns-packet')
const tls_1 = require('node:tls')
const randi = require('random-int')

const TWO_BYTES = 2

function getDnsQuery ({ type, name, klass, id }) {
  return {
    id,
    type: 'query',
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [{ class: klass, name, type }],
  }
}

function query ({ host, servername, type, name, klass, port, family, rejectUnauthorized, timeout }) {
  return new Promise((resolve, reject) => {
    if (!host || !servername || !name) {
      throw new Error('At least host, servername and name must be set.')
    }

    let response = Buffer.alloc(0)
    let packetLength = 0
    const dnsQuery = getDnsQuery({ id: randi(0x0, 0xFFFF), type, name, klass })
    const dnsQueryBuf = dnsPacket.streamEncode(dnsQuery)
    const socket = tls_1.connect({ host, port, servername, family: Number.parseInt(family) === 6 ? 6 : 4, rejectUnauthorized, timeout })

    // 超时处理
    let isFinished = false
    let timeoutId
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        isFinished = true
        socket.destroy()
        reject(new Error('DNS查询超时'))
      }, timeout)
    }

    socket.on('secureConnect', () => socket.write(dnsQueryBuf))
    socket.on('data', (data) => {
      if (timeout) {
        isFinished = true
        clearTimeout(timeoutId)
      }

      response = Buffer.concat([response, data])

      // 等待至少 2 字节的长度头到达后再读取报文长度
      if (packetLength === 0) {
        if (response.length < TWO_BYTES) {
          return // 等待更多数据
        }
        packetLength = response.readUInt16BE(0)
        if (packetLength < 12) {
          reject(new Error('Below DNS minimum packet length (DNS Header is 12 bytes)'))
          socket.destroy()
          return
        }
      }

      // 使用 >= 代替 === ：防止极端情况下数据量超过预期时 Promise 永远不 resolve
      if (response.length >= packetLength + TWO_BYTES) {
        socket.destroy()
        resolve(dnsPacket.streamDecode(response.subarray(0, packetLength + TWO_BYTES)))
      }
    })
    socket.on('error', (err) => {
      if (timeout) {
        isFinished = true
        clearTimeout(timeoutId)
      }
      reject(err)
    })
  })
}

exports.query = query
exports.default = { query }

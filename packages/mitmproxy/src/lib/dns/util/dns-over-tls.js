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

function query ({ host, servername, type, name, klass, port, rejectUnauthorized, timeout }) {
  return new Promise((resolve, reject) => {
    if (!host || !servername || !name) {
      throw new Error('At least host, servername and name must be set.')
    }

    let response = Buffer.alloc(0)
    let packetLength = 0
    const dnsQuery = getDnsQuery({ id: randi(0x0, 0xFFFF), type, name, klass })
    const dnsQueryBuf = dnsPacket.streamEncode(dnsQuery)
    const socket = tls_1.connect({ host, port, servername, rejectUnauthorized, timeout })

    // 超时处理
    let isFinished = false
    let interval
    if (timeout > 0) {
      interval = setInterval(() => {
        if (!isFinished) {
          socket.destroy((...args) => {
            console.info('socket destory callback args:', args)
          })

          reject(new Error('DNS查询超时'))
        }
      }, timeout)
    }

    socket.on('secureConnect', () => socket.write(dnsQueryBuf))
    socket.on('data', (data) => {
      if (timeout) {
        isFinished = true
        clearInterval(interval)
      }

      if (response.length === 0) {
        packetLength = data.readUInt16BE(0)
        if (packetLength < 12) {
          reject(new Error('Below DNS minimum packet length (DNS Header is 12 bytes)'))
        }
        response = Buffer.from(data)
      } else {
        response = Buffer.concat([response, data])
      }

      if (response.length === packetLength + TWO_BYTES) {
        socket.destroy()
        resolve(dnsPacket.streamDecode(response))
      } else {
        reject(new Error('响应长度不正确'))
      }
    })
    socket.on('error', (err) => {
      if (timeout) {
        isFinished = true
        clearInterval(interval)
      }
      reject(err)
    })
  })
}

exports.query = query
exports.default = { query }

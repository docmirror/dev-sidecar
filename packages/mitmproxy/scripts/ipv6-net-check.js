const net = require('node:net')

// 显式诊断脚本（非 mocha 测试）：检查本机 IPv6 连通性
// 用法: node packages/mitmproxy/scripts/ipv6-net-check.js
const TEST_HOST = '6.ipw.cn'
const TEST_PORT = 80
const TIMEOUT = 5000

async function testIPv6Connection () {
  const socket = new net.Socket()
  socket.setTimeout(TIMEOUT)

  try {
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        const { address, port } = socket.address()
        console.log(`成功连接到 ${TEST_HOST} 的IPv6地址 [${address}]:${port}`)
        socket.end()
        resolve()
      })

      socket.on('timeout', () => {
        socket.destroy()
        reject(new Error('连接超时'))
      })

      socket.on('error', (err) => {
        reject(err)
      })

      socket.connect({ port: TEST_PORT, host: TEST_HOST, family: 6 })
    })

    return true
  } catch (err) {
    console.error('IPv6连接测试失败:', err.message)
    return false
  } finally {
    socket.destroy()
  }
}

testIPv6Connection()
  .then((success) => {
    console.log(`IPv6连接测试结果: ${success ? '成功' : '失败'}`)
    process.exit(success ? 0 : 1)
  })
  .catch((err) => {
    console.error('测试过程中发生错误:', err)
    process.exit(1)
  })

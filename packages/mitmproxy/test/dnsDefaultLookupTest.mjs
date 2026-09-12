import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// 回归测试：Node 20+ 默认开启 autoSelectFamily，会以 { all: true } 调用自定义 lookup，
// 期望回传完整地址数组。旧实现只回传单个 IP 字符串，导致
// ERR_INVALID_IP_ADDRESS: Invalid IP address: undefined。
const dnsLookupModulePath = require.resolve('../src/lib/proxy/mitmproxy/dnsLookup.js')

const IPV6 = '2603:1030:a07:e::102'
const IPV4 = '20.202.1.1'

function mockDnsLookup (dnsModule) {
  const originalLookup = dnsModule.lookup
  dnsModule.lookup = (hostname, options, callback) => {
    if (options && options.all === true) {
      callback(null, [
        { address: IPV6, family: 6 },
        { address: IPV4, family: 4 },
      ])
    } else {
      callback(null, IPV4, 4)
    }
  }
  return () => {
    dnsModule.lookup = originalLookup
  }
}

function lookupOnce (lookup, options) {
  return new Promise((resolve, reject) => {
    let callCount = 0
    lookup('example.com', options, (err, address, family) => {
      callCount++
      if (callCount > 1) {
        reject(new Error('lookup callback 被重复调用'))
        return
      }
      if (err) {
        reject(err)
        return
      }
      resolve({ address, family, callCount })
    })
    // 回调是同步触发的，这里兜底防止异步时无限等待
    setTimeout(() => reject(new Error('lookup 回调超时')), 2000)
  })
}

async function main () {
  const dnsModule = require('node:dns')
  const restoreDns = mockDnsLookup(dnsModule)

  try {
    delete require.cache[dnsLookupModulePath]
    const dnsLookup = require(dnsLookupModulePath)
    const lookup = dnsLookup.createDefaultLookupFunc(null, 'test', 'target')

    // 1. all: true 时必须回传完整地址数组（修复前的关键回归点）
    const allResult = await lookupOnce(lookup, { all: true })
    assert.deepStrictEqual(allResult.address, [
      { address: IPV6, family: 6 },
      { address: IPV4, family: 4 },
    ])
    assert.strictEqual(allResult.callCount, 1)

    // 2. 非 all 模式仍回传单个 IP + family
    const singleResult = await lookupOnce(lookup, { family: 4 })
    assert.strictEqual(singleResult.address, IPV4)
    assert.strictEqual(singleResult.family, 4)
    assert.strictEqual(singleResult.callCount, 1)

    // 3. all 模式解析为空数组时按 ENOTFOUND 处理，不回传空数组
    dnsModule.lookup = (hostname, options, callback) => {
      callback(null, [])
    }
    delete require.cache[dnsLookupModulePath]
    const dnsLookup2 = require(dnsLookupModulePath)
    const lookup2 = dnsLookup2.createDefaultLookupFunc(null, 'test', 'target')
    const emptyResult = await new Promise((resolve) => {
      let settled = false
      lookup2('example.com', { all: true }, (err, address) => {
        if (settled)
          return
        settled = true
        resolve({ err, address })
      })
    })
    assert.strictEqual(emptyResult.err.code, 'ENOTFOUND')
    assert.strictEqual(emptyResult.address, undefined)
  } finally {
    restoreDns()
    delete require.cache[dnsLookupModulePath]
  }

  console.log('dnsDefaultLookupTest passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

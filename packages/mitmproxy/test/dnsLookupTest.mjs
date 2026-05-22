import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const BaseDNS = require('../src/lib/dns/base.js')

class MockDNS extends BaseDNS {
  constructor () {
    super('mock-dns', 4, 'mock-dns', 'UDP', 10, null)
  }

  async _dnsQueryPromise () {
    return {
      answers: [
        { type: 'A', data: undefined },
        { type: 'A', data: 'not-an-ip' },
      ],
    }
  }
}

async function main () {
  const mockDns = new MockDNS()
  const lookupResult = await mockDns.lookup('api.github.com', { family: 4 })
  assert.strictEqual(lookupResult, 'api.github.com')

  const speedModulePath = require.resolve('../src/lib/speed/index.js')
  const dnsLookupModulePath = require.resolve('../src/lib/proxy/mitmproxy/dnsLookup.js')

  const originalSpeedModule = require.cache[speedModulePath]

  try {
    let dnsLookupCalls = 0

    require.cache[speedModulePath] = {
      exports: {
        getSpeedTester: () => null,
      },
    }

    const dnsLookup = require(dnsLookupModulePath)
    const lookup = dnsLookup.createLookupFunc(null, {
      dns: {
        dnsName: 'mock-dns',
        lookup: async () => {
          dnsLookupCalls++
          return '::1'
        },
      },
      family: 4,
    }, 'connect', 'api.github.com:443', 443, {})

    const resolved = await new Promise((resolve, reject) => {
      lookup('api.github.com', { all: true }, (err, addresses) => {
        if (err) {
          reject(err)
          return
        }
        resolve({ addresses })
      })
    })

    assert.strictEqual(dnsLookupCalls, 1)
    assert.deepStrictEqual(resolved.addresses, [{ address: '::1', family: 6 }])
  } finally {
    if (originalSpeedModule) {
      require.cache[speedModulePath] = originalSpeedModule
    } else {
      delete require.cache[speedModulePath]
    }
    delete require.cache[dnsLookupModulePath]
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

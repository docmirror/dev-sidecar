import assert from 'node:assert'
import { isIPv6 } from '../src/lib/dns/util.ip.js'

assert.strictEqual(isIPv6, isIPv6)
assert.strictEqual(isIPv6('2001:0db8:0000:0000:0000:0000:1428:57ab'), true); // true
assert.strictEqual(isIPv6('[2001:0db8:0000:0000:0000:0000:1428:57ab]'), true); // true
assert.strictEqual(isIPv6('[2001:0db8:0000:0000:0000:0000:1428:57ab]:443'), true); // true
assert.strictEqual(isIPv6('http://[2001:0db8:0000:0000:0000:0000:1428:57ab]:443'), true); // true
assert.strictEqual(isIPv6('2001:db8:0:0:0:0:1428:57ab'), true); // true
assert.strictEqual(isIPv6('http://[2001:db8:0:0:0:0:1428:57ab]:443'), true); // true
assert.strictEqual(isIPv6('2001:db8::1428:57ab'), true); // true
assert.strictEqual(isIPv6('http://[2001:db8::1428:57ab]:443'), true); // true
assert.strictEqual(isIPv6('fe80::1'), true); // true
assert.strictEqual(isIPv6('http://[fe80::1]:443'), true); // true
assert.strictEqual(isIPv6('::1'), true); // true
assert.strictEqual(isIPv6('http://[::1]:443'), true); // true
assert.strictEqual(isIPv6('2001:4860:4860::8888'), true); // true
assert.strictEqual(isIPv6('http://[2001:4860:4860::8888]:443'), true); // true
assert.strictEqual(isIPv6('http://example.com'), false); // false

import defaultDns from 'node:dns'
import dns from '../src/lib/dns/index.js'

const dnsProviders = dns.initDNS({
  // DoH
  DoH1: {
    server: 'https://dns.alidns.com/dns-query',
  },
  DoH2: {
    server: 'https://dns.google/dns-query',
    family: 6,
  },
  // DoT
  DoT1: {
    server: 'tls://dns.alidns.com',
  },
  DoT2: {
    server: 'tls://[2620:fe::fe]'
  },
  // tcp
  TCP1: {
    server: 'tcp://223.5.5.5',
  },
  TCP2: {
    server: "tcp://[2606:4700:4700::1111]"
  },
  // udp
  UDP1: {
    server: 'udp://223.5.5.5',
  },
  UDP2: {
    server: 'udp://[2606:4700:4700::1111]',
  },
}, null)

const hostname = 'rr4---sn-npoe7nek.gvt1.com'
// const hostname = 'rr5---sn-4g5e6nzl.googlevideo.com'
// const hostname = 'www.youtube.com'

const family = 6

async function testDoH1 () {
  return dnsProviders.DoH1.lookup(hostname, { family })
}
async function testDoH2 () {
  return dnsProviders.DoH2.lookup(hostname, { family })
}
async function testDoT1 () {
  return dnsProviders.DoT1.lookup(hostname, { family })
}
async function testDoT2 () {
  return dnsProviders.DoT2.lookup(hostname, { family })
}
async function testTCP1 () {
  return dnsProviders.TCP1.lookup(hostname, { family })
}
async function testTCP2 () {
  return dnsProviders.TCP2.lookup(hostname, { family })
}
async function testUDP1 () {
  return dnsProviders.UDP1.lookup(hostname, { family })
}
async function testUDP2 () {
  return dnsProviders.UDP2.lookup(hostname, { family })
}

// eslint-disable-next-line antfu/no-top-level-await
const ip11 = await testDoH1(hostname)
console.log(`\n\n===> 11. test DoH1（IPv${family}）: ${hostname} -> ${ip11}`, '\n\n')
// eslint-disable-next-line antfu/no-top-level-await
const ip12 = await testDoH2(hostname)
console.log(`\n\n===> 12. test DoH2（IPv${family}）: ${hostname} -> ${ip12}`, '\n\n')

// eslint-disable-next-line antfu/no-top-level-await
const ip21 = await testDoT1(hostname)
console.log(`\n\n===> 21. test DoT（IPv${family}）: ${hostname} -> ${ip21}`, '\n\n')
// eslint-disable-next-line antfu/no-top-level-await
const ip22 = await testDoT2(hostname)
console.log(`\n\n===> 22. test DoT（IPv${family}）: ${hostname} -> ${ip22}`, '\n\n')

// eslint-disable-next-line antfu/no-top-level-await
const ip31 = await testTCP1(hostname)
console.log(`\n\n===> 31. test TCP（IPv${family}）: ${hostname} -> ${ip31}`, '\n\n')
// eslint-disable-next-line antfu/no-top-level-await
const ip32 = await testTCP2(hostname)
console.log(`\n\n===> 32. test TCP（IPv${family}）: ${hostname} -> ${ip32}`, '\n\n')

// eslint-disable-next-line antfu/no-top-level-await
const ip41 = await testUDP1(hostname)
console.log(`\n\n===> 41. test UDP1（IPv${family}）: ${hostname} -> ${ip41}`, '\n\n')
// eslint-disable-next-line antfu/no-top-level-await
const ip42 = await testUDP2(hostname)
console.log(`\n\n===> 42. test UDP2（IPv${family}）: ${hostname} -> ${ip42}`, '\n\n')

// eslint-disable-next-line node/handle-callback-err
defaultDns.lookup(hostname, { family }, (...args) => {
  console.log(`\n\n===> 51. test Default DNS（IPv${family}）: ${hostname} -> ${args[1]}`, '\n\n', args)
})
if (family === 6) {
  defaultDns.resolve6(hostname, (...args) => {
    console.log(`\n\n===> 52. test Default DNS（IPv${family}）: ${hostname} -> ${args[1]}`, '\n\n', args)
  })
} else {
  defaultDns.resolve4(hostname, (...args) => {
    console.log(`\n\n===> 52. test Default DNS（IPv${family}）: ${hostname} -> ${args[1]}`, '\n\n', args)
  })
}

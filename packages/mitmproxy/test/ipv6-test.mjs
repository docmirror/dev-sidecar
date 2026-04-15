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
  },
  // DoT
  DoT1: {
    server: 'tls://dns.alidns.com',
  },
  DoT2: {
    server: 'tls://[2620:fe::fe]',
  },
  // tcp
  TCP1: {
    server: 'tcp://223.5.5.5',
  },
  TCP2: {
    server: "tcp://[2606:4700:4700::1111]",
  },
  // udp
  UDP1: {
    server: 'udp://223.5.5.5',
  },
  UDP2: {
    server: 'udp://[2001:4860:4860::8888]',
    sni: 'g.cn',
  },
}, null)

const hostname = 'rr4---sn-npoe7nek.gvt1.com'
// const hostname = 'rr5---sn-4g5e6nzl.googlevideo.com'
// const hostname = 'ipv6.google.com'
// const hostname = 'www.youtube.com'

const family = 6

async function test(dns) {
  const ip = await dns.lookup(hostname, { family })
  console.log(`\n\n【${dns.dnsName} - ${dns.dnsServer}（IPv${dns.dnsFamily}）】 ${hostname} -> ${ip}（IPv${family}）`, '\n\n')
}

await test(dnsProviders.DoH1)
await test(dnsProviders.DoH2)
await test(dnsProviders.DoT1)
await test(dnsProviders.DoT2)
await test(dnsProviders.TCP1)
await test(dnsProviders.TCP2)
await test(dnsProviders.UDP1)
await test(dnsProviders.UDP2)

// eslint-disable-next-line node/handle-callback-err
defaultDns.lookup(hostname, { family }, (...args) => {
  console.log(`\n\n【test Default DNS（IPv${family}）】 ${hostname} -> ${args[1]}`, '\n\n', args)
})
if (family === 6) {
  defaultDns.resolve6(hostname, (...args) => {
    console.log(`\n\n【test Default DNS（IPv${family}）】 ${hostname} -> ${args[1]}`, '\n\n', args)
  })
} else {
  defaultDns.resolve4(hostname, (...args) => {
    console.log(`\n\n【test Default DNS（IPv${family}）】 ${hostname} -> ${args[1]}`, '\n\n', args)
  })
}

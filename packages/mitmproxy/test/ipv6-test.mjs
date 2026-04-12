import defaultDns from 'node:dns'
import dns from '../src/lib/dns/index.js'

const dnsProviders = dns.initDNS({
  // https
  aliyunHTTPS: {
    type: 'https',
    server: 'https://dns.alidns.com/dns-query',
    cacheSize: 1000,
  },

  // tls
  aliyunTLS: {
    server: 'tls://dns.alidns.com',
    cacheSize: 1000,
  },

  // tcp
  aliyunTCP: {
    server: 'tcp://223.5.5.5',
    cacheSize: 1000,
  },

  // udp
  aliyunUDP: {
    server: 'udp://223.5.5.5',
    cacheSize: 1000,
  },
}, null)

const hostname = 'rr4---sn-npoe7nek.gvt1.com'
// const hostname = 'rr5---sn-4g5e6nzl.googlevideo.com'
// const hostname = 'www.youtube.com'

const family = 6

async function testDoH () {
  return dnsProviders.aliyunHTTPS.lookup(hostname, { family })
}
async function testDoT () {
  return dnsProviders.aliyunTLS.lookup(hostname, { family })
}
async function testTCP () {
  return dnsProviders.aliyunTCP.lookup(hostname, { family })
}
async function testUDP () {
  return dnsProviders.aliyunUDP.lookup(hostname, { family })
}

// eslint-disable-next-line antfu/no-top-level-await
const ip1 = await testDoH(hostname)
console.log(`\n\n===> 1. test DoH（IPv${family}）: ${hostname} -> ${ip1}`, '\n\n')

// eslint-disable-next-line antfu/no-top-level-await
const ip2 = await testDoT(hostname)
console.log(`\n\n===> 2. test DoT（IPv${family}）: ${hostname} -> ${ip2}`, '\n\n')

// eslint-disable-next-line antfu/no-top-level-await
const ip3 = await testTCP(hostname)
console.log(`\n\n===> 3. test TCP（IPv${family}）: ${hostname} -> ${ip3}`, '\n\n')

// eslint-disable-next-line antfu/no-top-level-await
const ip4 = await testUDP(hostname)
console.log(`\n\n===> 4. test UDP（IPv${family}）: ${hostname} -> ${ip4}`, '\n\n')

// eslint-disable-next-line node/handle-callback-err
defaultDns.lookup(hostname, { family }, (...args) => {
  console.log(`\n\n===> 5. test Default DNS（IPv${family}）: ${hostname} -> ${args[1]}`, '\n\n', args)
})
if (family === 6) {
  defaultDns.resolve6(hostname, (...args) => {
    console.log(`\n\n===> 5.1. test Default DNS（IPv${family}）: ${hostname} -> ${args[1]}`, '\n\n', args)
  })
} else {
  defaultDns.resolve4(hostname, (...args) => {
    console.log(`\n\n===> 5.2. test Default DNS（IPv${family}）: ${hostname} -> ${args[1]}`, '\n\n', args)
  })
}

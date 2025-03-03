import assert from 'node:assert'
import dns from '../src/lib/dns/index.js'

const presetIp = '100.100.100.100'

const dnsProviders = dns.initDNS({
  // https
  cloudflare: {
    type: 'https',
    server: 'https://1.1.1.1/dns-query',
    cacheSize: 1000,
  },
  quad9: {
    server: 'https://9.9.9.9/dns-query',
    cacheSize: 1000,
  },
  aliyun: {
    type: 'https',
    server: 'https://dns.alidns.com/dns-query',
    cacheSize: 1000,
  },
  safe360: {
    server: 'https://doh.360.cn/dns-query',
    cacheSize: 1000,
  },
  rubyfish: {
    server: 'https://rubyfish.cn/dns-query',
    cacheSize: 1000,
  },
  py233: {
    server: ' https://i.233py.com/dns-query',
    cacheSize: 1000,
  },

  // tls
  cloudflareTLS: {
    type: 'tls',
    server: '1.1.1.1',
    servername: 'cloudflare-dns.com',
    cacheSize: 1000,
  },
  quad9TLS: {
    server: 'tls://9.9.9.9',
    servername: 'dns.quad9.net',
    cacheSize: 1000,
  },
  aliyunTLS: {
    type: 'tls',
    server: '223.5.5.5',
    cacheSize: 1000,
  },
  aliyunTLS2: {
    server: 'tls://223.6.6.6',
    cacheSize: 1000,
  },
  safe360TLS: {
    server: 'tls://dot.360.cn',
    cacheSize: 1000,
  },

  // tcp
  googleTCP: {
    type: 'tcp',
    server: '8.8.8.8',
    cacheSize: 1000,
  },
  aliyunTCP: {
    server: 'tcp://223.5.5.5',
    cacheSize: 1000,
  },

  // udp
  googleUDP: {
    // type: 'udp', // 默认是udp可以不用标
    server: '8.8.8.8',
    cacheSize: 1000,
  },
  aliyunUDP: {
    server: 'udp://223.5.5.5',
    cacheSize: 1000,
  },
}, {
  origin: {
    'xxx.com': [
      presetIp
    ]
  }
})


const presetHostname = 'xxx.com'
const hostname1 = 'github.com'
const hostname2 = 'api.github.com'
const hostname3 = 'hk.docmirror.cn'
const hostname4 = 'github.docmirror.cn'
const hostname5 = 'gh.docmirror.top'
const hostname6 = 'gh2.docmirror.top'

let ip


console.log('\n--------------- test PreSet ---------------\n')
ip = await dnsProviders.PreSet.lookup(presetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('===> test PreSet:', ip, '\n\n')
console.log('\n\n')


console.log('\n--------------- test https ---------------\n')
ip = await dnsProviders.cloudflare.lookup(presetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.cloudflare.type, 'https')
// ip = await dnsProviders.cloudflare.lookup(hostname1)
// console.log('===> test cloudflare:', ip, '\n\n')

assert.strictEqual(dnsProviders.quad9.type, 'https')
// ip = await dnsProviders.quad9.lookup(hostname1)
// console.log('===> test quad9:', ip, '\n\n')

assert.strictEqual(dnsProviders.aliyun.type, 'https')
// ip = await dnsProviders.aliyun.lookup(hostname1)
// console.log('===> test aliyun:', ip, '\n\n')

assert.strictEqual(dnsProviders.safe360.type, 'https')
// ip = await dnsProviders.safe360.lookup(hostname1)
// console.log('===> test safe360:', ip, '\n\n')

assert.strictEqual(dnsProviders.rubyfish.type, 'https')
// ip = await dnsProviders.rubyfish.lookup(hostname1)
// console.log('===> test rubyfish:', ip, '\n\n')

assert.strictEqual(dnsProviders.py233.type, 'https')
// ip = await dnsProviders.py233.lookup(hostname1)
// console.log('===> test py233:', ip, '\n\n')


console.log('\n--------------- test TLS ---------------\n')
ip = await dnsProviders.cloudflareTLS.lookup(presetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.cloudflareTLS.type, 'tls')
// ip = await dnsProviders.cloudflareTLS.lookup(hostname1)
// console.log('===> test cloudflareTLS:', ip, '\n\n')

assert.strictEqual(dnsProviders.quad9TLS.type, 'tls')
// ip = await dnsProviders.quad9TLS.lookup(hostname1)
// console.log('===> test quad9TLS:', ip, '\n\n')

assert.strictEqual(dnsProviders.aliyunTLS.type, 'tls')
// ip = await dnsProviders.aliyunTLS.lookup(hostname1)
// console.log('===> test aliyunTLS:', ip, '\n\n')

assert.strictEqual(dnsProviders.aliyunTLS2.type, 'tls')
// ip = await dnsProviders.aliyunTLS2.lookup(hostname1)
// console.log('===> test aliyunTLS2:', ip, '\n\n')

assert.strictEqual(dnsProviders.safe360TLS.type, 'tls')
// ip = await dnsProviders.safe360TLS.lookup(hostname1)
// console.log('===> test safe360TLS:', ip, '\n\n')


console.log('\n--------------- test TCP ---------------\n')
ip = await dnsProviders.googleTCP.lookup(presetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.googleTCP.type, 'tcp')
// ip = await dnsProviders.googleTCP.lookup(hostname1)
// console.log('===> test googleTCP:', ip, '\n\n')

assert.strictEqual(dnsProviders.aliyunTCP.type, 'tcp')
// ip = await dnsProviders.aliyunTCP.lookup(hostname1)
// console.log('===> test aliyunTCP:', ip, '\n\n')


console.log('\n--------------- test UDP ---------------\n')
ip = await dnsProviders.googleUDP.lookup(presetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.googleUDP.type, 'udp')
// ip = await dnsProviders.googleUDP.lookup(hostname1)
// console.log('===> test googleUDP:', ip, '\n\n')

assert.strictEqual(dnsProviders.aliyunUDP.type, 'udp')
// ip = await dnsProviders.aliyunUDP.lookup(hostname1)
// console.log('===> test aliyunUDP:', ip, '\n\n')

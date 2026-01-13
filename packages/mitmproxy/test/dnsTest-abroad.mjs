import assert from 'node:assert'
import dns from '../src/lib/dns'
import matchUtil from '../src/utils/util.match.js'

const presetIp = '100.100.100.100'
const preSetIpList = matchUtil.domainMapRegexply({
  'xxx.com': [
    presetIp,
  ],
})

// 境外DNS测试
const dnsProviders = dns.initDNS({
  // udp
  cloudflareUdp: {
    server: 'udp://1.1.1.1',
  },
  quad9Udp: {
    server: 'udp://9.9.9.9',
  },

  // tcp
  cloudflareTcp: {
    server: 'tcp://1.1.1.1',
  },
  quad9Tcp: {
    server: 'tcp://9.9.9.9',
  },

  // https
  cloudflare: {
    server: 'https://1.1.1.1/dns-query',
  },
  quad9: {
    server: 'https://9.9.9.9/dns-query',
    forSNI: true,
  },
  rubyfish: {
    server: 'https://rubyfish.cn/dns-query',
  },
  py233: {
    server: ' https://i.233py.com/dns-query',
  },

  // tls
  cloudflareTLS: {
    type: 'tls',
    server: '1.1.1.1',
    servername: 'cloudflare-dns.com',
  },
  quad9TLS: {
    server: 'tls://9.9.9.9',
    servername: 'dns.quad9.net',
  },
}, preSetIpList)

const hasPresetHostname = 'xxx.com'
const noPresetHostname = 'yyy.com'

const hostname1 = 'github.com'
const hostname2 = 'api.github.com'
const hostname3 = 'hk.docmirror.cn'
const hostname4 = 'github.docmirror.cn'
const hostname5 = 'gh.docmirror.top'
const hostname6 = 'gh2.docmirror.top'

let ip

console.log('\n--------------- test ForSNI ---------------\n')
console.log(`===> test ForSNI: ${dnsProviders.ForSNI.dnsName}`, '\n\n')
assert.strictEqual(dnsProviders.ForSNI, dnsProviders.quad9)

console.log('\n--------------- test PreSet ---------------\n')
ip = await dnsProviders.PreSet.lookup(hasPresetHostname)
console.log(`===> test PreSet: ${hasPresetHostname} ->`, ip, '\n\n')
console.log('\n\n')
assert.strictEqual(ip, presetIp) // 预设过IP，等于预设的IP

ip = await dnsProviders.PreSet.lookup(noPresetHostname)
console.log(`===> test PreSet: ${noPresetHostname} ->`, ip, '\n\n')
console.log('\n\n')
assert.strictEqual(ip, noPresetHostname) // 未预设IP，等于域名自己

console.log('\n--------------- test udp ---------------\n')
ip = await dnsProviders.cloudflareUdp.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.cloudflareUdp.dnsType, 'UDP')
ip = await dnsProviders.cloudflareUdp.lookup(hostname1)
console.log(`===> test cloudflare: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.quad9Udp.dnsType, 'UDP')
ip = await dnsProviders.quad9Udp.lookup(hostname1)
console.log(`===> test quad9: ${hostname1} ->`, ip, '\n\n')

console.log('\n--------------- test tcp ---------------\n')
ip = await dnsProviders.cloudflareTcp.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.cloudflareTcp.dnsType, 'TCP')
ip = await dnsProviders.cloudflareTcp.lookup(hostname1)
console.log(`===> test cloudflare: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.quad9Tcp.dnsType, 'TCP')
ip = await dnsProviders.quad9Tcp.lookup(hostname1)
console.log(`===> test quad9: ${hostname1} ->`, ip, '\n\n')

console.log('\n--------------- test https ---------------\n')
ip = await dnsProviders.cloudflare.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.cloudflare.dnsType, 'HTTPS')
ip = await dnsProviders.cloudflare.lookup(hostname1)
console.log(`===> test cloudflare: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.quad9.dnsType, 'HTTPS')
ip = await dnsProviders.quad9.lookup(hostname1)
console.log(`===> test quad9: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.rubyfish.dnsType, 'HTTPS')
ip = await dnsProviders.rubyfish.lookup(hostname1)
console.log(`===> test rubyfish: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.py233.dnsType, 'HTTPS')
ip = await dnsProviders.py233.lookup(hostname1)
console.log(`===> test py233: ${hostname1} ->`, ip, '\n\n')

console.log('\n--------------- test TLS ---------------\n')
ip = await dnsProviders.cloudflareTLS.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.cloudflareTLS.dnsType, 'TLS')
ip = await dnsProviders.cloudflareTLS.lookup(hostname1)
console.log(`===> test cloudflareTLS: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.quad9TLS.dnsType, 'TLS')
ip = await dnsProviders.quad9TLS.lookup(hostname1)
console.log(`===> test quad9TLS: ${hostname1} ->`, ip, '\n\n')

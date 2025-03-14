import assert from 'node:assert'
import dns from '../src/lib/dns/index.js'
import matchUtil from '../src/utils/util.match.js'

const presetIp = '100.100.100.100'
const preSetIpList = matchUtil.domainMapRegexply({
  'xxx.com': [
    presetIp
  ]
})

// 境外DNS测试
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
    forSNI: true,
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

import assert from 'node:assert'
import dns from '../src/lib/dns/index.js'
import matchUtil from '../src/utils/util.match.js'

const presetIp = '100.100.100.100'
const preSetIpList = matchUtil.domainMapRegexply({
  'xxx.com': [
    presetIp,
  ],
})

// 常用DNS测试
const dnsProviders = dns.initDNS({
  // https
  aliyun: {
    type: 'https',
    server: 'https://dns.alidns.com/dns-query',
    cacheSize: 1000,
  },
  aliyun2: {
    type: 'https',
    server: 'dns.alidns.com', // 会自动补上 `https://` 和 `/dns-query`
    cacheSize: 1000,
  },
  safe360: {
    server: 'https://doh.360.cn/dns-query',
    cacheSize: 1000,
    forSNI: true,
  },

  // tls
  aliyunTLS: {
    server: 'tls://223.5.5.5:853',
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
    port: 53,
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
assert.strictEqual(dnsProviders.ForSNI, dnsProviders.safe360)

const dnsProviders2 = dns.initDNS({
  aliyun: {
    server: 'udp://223.5.5.5',
  },
}, {})
console.log(`===> test ForSNI2: ${dnsProviders2.ForSNI.dnsName}`, '\n\n')
assert.strictEqual(dnsProviders2.ForSNI, dnsProviders2.PreSet) // 未配置forSNI的DNS时，默认使用PreSet作为ForSNI

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
ip = await dnsProviders.aliyun.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.aliyun.dnsType, 'HTTPS')
ip = await dnsProviders.aliyun.lookup(hostname1)
console.log(`===> test aliyun: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.aliyun2.dnsType, 'HTTPS')
ip = await dnsProviders.aliyun2.lookup(hostname1)
console.log(`===> test aliyun2: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.safe360.dnsType, 'HTTPS')
ip = await dnsProviders.safe360.lookup(hostname1)
console.log(`===> test safe360: ${hostname1} ->`, ip, '\n\n')

console.log('\n--------------- test TLS ---------------\n')
ip = await dnsProviders.aliyunTLS.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.aliyunTLS.dnsType, 'TLS')
ip = await dnsProviders.aliyunTLS.lookup(hostname1)
console.log(`===> test aliyunTLS: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.aliyunTLS2.dnsType, 'TLS')
ip = await dnsProviders.aliyunTLS2.lookup(hostname1)
console.log(`===> test aliyunTLS2: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.safe360TLS.dnsType, 'TLS')
ip = await dnsProviders.safe360TLS.lookup(hostname1)
console.log(`===> test safe360TLS: ${hostname1} ->`, ip, '\n\n')

console.log('\n--------------- test TCP ---------------\n')
ip = await dnsProviders.googleTCP.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.googleTCP.dnsType, 'TCP')
ip = await dnsProviders.googleTCP.lookup(hostname1)
console.log(`===> test googleTCP: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.aliyunTCP.dnsType, 'TCP')
ip = await dnsProviders.aliyunTCP.lookup(hostname1)
console.log(`===> test aliyunTCP: ${hostname1} ->`, ip, '\n\n')

console.log('\n--------------- test UDP ---------------\n')
ip = await dnsProviders.googleUDP.lookup(hasPresetHostname)
assert.strictEqual(ip, presetIp) // test preset
console.log('\n\n')

assert.strictEqual(dnsProviders.googleUDP.dnsType, 'UDP')
ip = await dnsProviders.googleUDP.lookup(hostname1)
console.log(`===> test googleUDP: ${hostname1} ->`, ip, '\n\n')

assert.strictEqual(dnsProviders.aliyunUDP.dnsType, 'UDP')
ip = await dnsProviders.aliyunUDP.lookup(hostname1)
console.log(`===> test aliyunUDP: ${hostname1} ->`, ip, '\n\n')

dnsProviders.aliyunUDP.lookup(hostname1).then((ip0) => {
  console.log(`===> test aliyunUDP: ${hostname1} ->`, ip0, '\n\n')
})
dnsProviders.aliyunUDP.lookup(hostname2).then((ip0) => {
  console.log(`===> test aliyunUDP: ${hostname2} ->`, ip0, '\n\n')
})
dnsProviders.aliyunUDP.lookup('baidu.com').then((ip0) => {
  console.log('===> test aliyunUDP: baidu.com ->', ip0, '\n\n')
})
dnsProviders.aliyunUDP.lookup('gitee.com').then((ip0) => {
  console.log('===> test aliyunUDP: gitee.com ->', ip0, '\n\n')
})

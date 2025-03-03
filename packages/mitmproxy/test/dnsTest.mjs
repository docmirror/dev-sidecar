import dns from '../src/lib/dns/index.js'

const dnsProviders = dns.initDNS({
  aliyun: {
    type: 'https',
    server: 'https://dns.alidns.com/dns-query',
    cacheSize: 1000,
  },
  cloudflare: {
    type: 'https',
    server: 'https://1.1.1.1/dns-query',
    cacheSize: 1000,
  },
  ipaddress: {
    type: 'ipaddress',
    server: 'ipaddress',
    cacheSize: 1000,
  },
  quad9: {
    type: 'https',
    server: 'https://9.9.9.9/dns-query',
    cacheSize: 1000,
  },
  rubyfish: {
    type: 'https',
    server: 'https://rubyfish.cn/dns-query',
    cacheSize: 1000,
  },
  py233: {
    type: 'https',
    server: ' https://i.233py.com/dns-query',
    cacheSize: 1000,
  },

  // sb: {
  //   type: 'https',
  //   server: 'https://doh.dns.sb/dns-query',
  //   cacheSize: 1000
  // },
  // adguard: {
  //   type: 'https',
  //   server: ' https://dns.adguard.com/dns-query',
  //   cacheSize: 1000
  // }
})

// const test = '111<tr><th>IP Address</th><td><ul class="comma-separated"><li>140.82.113.4</li></ul></td></tr>2222'
// // <tr><th>IP Address</th><td><ul class="comma-separated"><li>140.82.113.4</li></ul></td></tr>
// // <tr><th>IP Address</th><td><ul class="comma-separated"><li>(.*)</li></ul></td></tr>
// const regexp = /<tr><th>IP Address<\/th><td><ul class="comma-separated"><li>(.*)<\/li><\/ul><\/td><\/tr>/
// const matched = regexp.exec(test)
// console.log('data:', matched)

const hostname1 = 'github.com'
const hostname2 = 'api.github.com'
const hostname3 = 'hk.docmirror.cn'
const hostname4 = 'github.docmirror.cn'
const hostname5 = 'gh.docmirror.top'
const hostname6 = 'gh2.docmirror.top'

let ip


// console.log('test cloudflare')
// ip = await dnsProviders.cloudflare.lookup(hostname1)
// console.log('ip:', ip)
// ip = await dnsProviders.cloudflare.lookup(hostname2)
// console.log('ip:', ip)
// ip = await dnsProviders.cloudflare.lookup(hostname3)
// console.log('ip:', ip)
// ip = await dnsProviders.cloudflare.lookup(hostname4)
// console.log('ip:', ip)
// ip = await dnsProviders.cloudflare.lookup(hostname5)
// console.log('ip:', ip)
// ip = await dnsProviders.cloudflare.lookup(hostname6)
// console.log('ip:', ip)

// console.log('test py233')
// ip = await dnsProviders.py233.lookup(hostname1)
// console.log('ip:', ip)

// console.log('test ipaddress')
// ip = await dnsProviders.ipaddress.lookup(hostname1)
// console.log('ip:', ip)

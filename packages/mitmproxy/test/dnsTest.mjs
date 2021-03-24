import dns from '../src/lib/dns/index.js'

const dnsProviders = dns.initDNS({
  aliyun: {
    type: 'https',
    server: 'https://dns.alidns.com/dns-query',
    cacheSize: 1000
  },
  usa: {
    type: 'https',
    server: 'https://1.1.1.1/dns-query',
    cacheSize: 1000
  },
  ipaddress: {
    type: 'ipaddress',
    server: 'ipaddress',
    cacheSize: 1000
  },
  quad9: {
    type: 'https',
    server: 'https://9.9.9.9/dns-query',
    cacheSize: 1000
  },
  rubyfish: {
    type: 'https',
    server: 'https://rubyfish.cn/dns-query',
    cacheSize: 1000
  },
  py233: {
    type: 'https',
    server: ' https://i.233py.com/dns-query',
    cacheSize: 1000
  }

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

const hostname0 = 'github.com'
// console.log('first')
// dnsProviders.usa.lookup(hostname0)
console.log('test')
dnsProviders.py233.lookup(hostname0)
// dnsProviders.usa.lookup(hostname0)
// dnsProviders.ipaddress.lookup(hostname0)
// dnsProviders.ipaddress.lookup(hostname0)

// const hostname = 'api.github.com'
// dnsProviders.usa.lookup(hostname)

// const hostname1 = 'api.github.com'
// dnsProviders.usa.lookup(hostname1)
//
// const hostname2 = 'hk.docmirror.cn'
// dnsProviders.usa.lookup(hostname2)
// const hostname3 = 'github.docmirror.cn'
// dnsProviders.usa.lookup(hostname3)
// const hostname4 = 'gh.docmirror.top'
// dnsProviders.usa.lookup(hostname4)
// const hostname5 = 'gh2.docmirror.top'
// dnsProviders.usa.lookup(hostname5)

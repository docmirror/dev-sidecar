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
  }
})

const hostname0 = 'github.com'
dnsProviders.usa.lookup(hostname0)
dnsProviders.usa.lookup(hostname0)
dnsProviders.usa.lookup(hostname0)

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

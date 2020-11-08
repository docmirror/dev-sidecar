import dns from '../src/lib/dns/index.js'

const dnsProviders = dns.initDNS({
  aliyun: {
    type: 'https',
    server: 'https://dns.alidns.com/dns-query',
    cacheSize: 1000
  },
  usa: {
    type: 'https',
    server: 'https://cloudflare-dns.com/dns-query',
    cacheSize: 1000
  }
})

// let hostname = 'www.yonsz.com'
// dnsProviders.usa.lookup(hostname)

// const hostname = 'api.github.com'
// dnsProviders.usa.lookup(hostname)

const hostname1 = 'api.github.com'
dnsProviders.aliyun.lookup(hostname1)

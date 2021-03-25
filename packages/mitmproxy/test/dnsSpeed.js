const SpeedTester = require('../src/lib/speed/SpeedTester.js')
const SpeedTest = require('../src/lib/speed/index.js')
const dns = require('../src/lib/dns/index.js')

const dnsMap = dns.initDNS({
  // ipaddress: {
  //   type: 'ipaddress',
  //   server: 'ipaddress',
  //   cacheSize: 1000
  // },
  usa: {
    type: 'https',
    server: 'https://1.1.1.1/dns-query',
    cacheSize: 1000
  }
  // py233: { //污染
  //   type: 'https',
  //   server: ' https://i.233py.com/dns-query',
  //   cacheSize: 1000
  // }
  // google: { //不可用
  //   type: 'https',
  //   server: 'https://8.8.8.8/dns-query',
  //   cacheSize: 1000
  // },
  // dnsSB: { //不可用
  //   type: 'https',
  //   server: 'https://doh.dns.sb/dns-query',
  //   cacheSize: 1000
  // }
})

SpeedTest.initSpeedTest({ hostnameList: {}, dnsMap })

const tester = new SpeedTester({ hostname: 'github.com' })
tester.test().then(ret => {
  console.log(tester.alive)
})

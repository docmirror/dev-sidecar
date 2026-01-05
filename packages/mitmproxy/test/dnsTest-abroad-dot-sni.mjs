import DNSOverTLS from '../src/lib/dns/tls.js'

// 境外DNS的DoT配置sni测试
const servers = [
  // 'dot.360.cn',

  '1.1.1.1', // 可直连，无需SNI（有时候可以，有时候不行）
  'one.one.one.one',
  'cloudflare-dns.com',
  'security.cloudflare-dns.com',
  'family.cloudflare-dns.com',
  '1dot1dot1dot1.cloudflare-dns.com',

  'dot.sb',
  '185.222.222.222',
  '45.11.45.11',

  'dns.adguard.com',
  'dns.adguard-dns.com',
  'dns-family.adguard.com',
  'family.adguard-dns.com',
  'dns-unfiltered.adguard.com',
  'unfiltered.adguard-dns.com',
  'dns.bebasid.com',
  'unfiltered.dns.bebasid.com',
  'antivirus.bebasid.com',
  'internetsehat.bebasid.com',
  'family-adblock.bebasid.com',
  'oisd.dns.bebasid.com',
  'hagezi.dns.bebasid.com',
  'dns.cfiec.net',
  'dns.opendns.com',
  'familyshield.opendns.com',
  'sandbox.opendns.com',
  'family-filter-dns.cleanbrowsing.org',
  'adult-filter-dns.cleanbrowsing.org',
  'security-filter-dns.cleanbrowsing.org',
  'p0.freedns.controld.com',
  'p1.freedns.controld.com',
  'p2.freedns.controld.com',
  'p3.freedns.controld.com',
  'dns.decloudus.com',
  'getdnsapi.net',
  'dnsovertls.sinodun.com',
  'dnsovertls1.sinodun.com',
  'dns.de.futuredns.eu.org',
  'dns.us.futuredns.eu.org',
  'unicast.censurfridns.dk',
]

const hostnames = [
  'github.com',
  'mvnrepository.com',
]
const sni = 'baidu.com'
// const sni = ''

console.log(`\n--------------- 测试DoT的SNI功能：共 ${servers.length} 个服务，${hostnames.length} 个域名，SNI: ${sni || '无'} ---------------\n`)

let n = 0
let success = 0
let error = 0
const arr = []

function count (isSuccess, hostname, idx, dns, result, cost) {
  if (isSuccess) {
    success++
    const ipList = []
    for (const answer of result.answers) {
      ipList[ipList.length] = answer.data
    }
    arr[idx] = `${dns.dnsServer} : ${hostname} -> [ ${ipList.join(', ')} ] , cost: ${cost} ms`
  } else {
    error++
  }

  n++

  if (n === servers.length * hostnames.length) {
    console.info(`\n\n=============================================================================\n全部测完：总计：${servers.length * hostnames.length}, 成功：${success}，失败：${error}`)
    for (const item of arr) {
      if (item) {
        console.info(item)
      }
    }
    console.info('=============================================================================\n\n')
  }
}

let x = 0
for (let i = 0; i < servers.length; i++) {
  for (const hostname of hostnames) {
    const dns = new DNSOverTLS(`dns-${i}-${hostname}`, null, null, servers[i], null, sni)
    const start = Date.now()
    const idx = x
    dns._doDnsQuery(hostname)
      .then((result) => {
        console.info(`===> ${dns.dnsServer}: ${hostname} ->`, result.answers, '\n\n')
        count(true, hostname, idx, dns, result, Date.now() - start)
      })
      .catch((e) => {
        console.error(`===> ${dns.dnsServer}: ${hostname} 失败：`, e, '\n\n')
        count(false, hostname)
      })
    x++
  }
}

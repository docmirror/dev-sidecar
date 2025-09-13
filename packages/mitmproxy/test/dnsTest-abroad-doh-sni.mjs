import DNSOverHTTPS from "../src/lib/dns/https.js";

// 境外DNS的DoH配置sni测试
const servers = [
	'https://dns.quad9.net/dns-query',
	'https://max.rethinkdns.com/dns-query',
	'https://sky.rethinkdns.com/dns-query',
	'https://doh.opendns.com/dns-query',
	'https://cloudflare-dns.com/dns-query',
	'https://dns.google/dns-query',
	'https://dns.bebasid.com/unfiltered',
	'https://0ms.dev/dns-query',
	'https://dns.decloudus.com/dns-query',
	'https://wikimedia-dns.org/dns-query',
	'https://doh.applied-privacy.net/query',
	'https://private.canadianshield.cira.ca/dns-query',
	// 'https://dns.controld.com/comss', // 可直连，无需SNI
	'https://kaitain.restena.lu/dns-query',
	'https://doh.libredns.gr/dns-query',
	'https://doh.libredns.gr/ads',
	'https://dns.switch.ch/dns-query',
	'https://doh.nl.ahadns.net/dns-query',
	'https://doh.la.ahadns.net/dns-query',
	'https://dns.dnswarden.com/uncensored',
	'https://doh.ffmuc.net/dns-query',
	'https://dns.oszx.co/dns-query',
	'https://doh.tiarap.org/dns-query',
	'https://jp.tiarap.org/dns-query',
	'https://dns.adguard.com/dns-query',
	'https://rubyfish.cn/dns-query',
	'https://i.233py.com/dns-query',
]

const hostnames = [
	'github.com',
	'mvnrepository.com',
]
const sni = 'baidu.com'
// const sni = ''

console.log(`\n--------------- 测试DoH的SNI功能：共 ${servers.length} 个服务，${hostnames.length} 个域名，SNI: ${sni || '无'} ---------------\n`)

let n = 0
let success = 0
let error = 0
const arr = []

function count (isSuccess, hostname, idx, dns, result, cost) {
	if (isSuccess) {
		success++
		const ipList = []
		for (const answer of result.answers) {
			ipList[ipList.length] = answer.data;
		}
		arr[idx] = `${dns.dnsServer} : ${hostname} -> [ ${ipList.join(', ')} ] , cost: ${cost} ms`;
	} else {
		error++
	}

	n++

	if (n === servers.length * hostnames.length) {
		console.info(`\n\n=============================================================================\n全部测完：总计：${servers.length * hostnames.length}, 成功：${success}，失败：${error}`);
		for (const item of arr) {
			if (item) {
				console.info(item);
			}
		}
		console.info('=============================================================================\n\n')
	}
}

let x = 0;
for (let i = 0; i < servers.length; i++) {
	for (const hostname of hostnames) {
		const dns = new DNSOverHTTPS(`dns-${i}-${hostname}`, null, null, servers[i], sni)
		const start = Date.now()
		const idx = x;
		dns._doDnsQuery(hostname)
			.then((result) => {
				console.info(`===> ${dns.dnsServer}: ${hostname} ->`, result.answers, '\n\n')
				count(true, hostname, idx, dns, result, Date.now() - start)
			})
			.catch((e) => {
				console.error(`===> ${dns.dnsServer}: ${hostname} 失败：`, e, '\n\n')
				count(false, hostname)
			})
		x++;
	}
}

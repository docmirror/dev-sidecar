import DNSOverHTTPS from "../src/lib/dns/https.js";

// 境外DNS的DoH配置sni测试
const servers = [
	'https://dns.quad9.net/dns-query',
	'https://max.rethinkdns.com/dns-query',
	'https://sky.rethinkdns.com/dns-query',
	'https://doh.opendns.com/dns-query',
	'https://1.1.1.1/dns-query',
	'https://dns.cloudflare.com/dns-query',
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
	'https://i.233py.com/dns-query'

]

const hostname1 = 'github.com'
const sni = 'baidu.com'

console.log(`\n--------------- 测试DoH的SNI功能：共 ${servers.length} 个DoH服务 ---------------\n`)

let n = 0
let success = 0
let error = 0
const arr = []

function count (isSuccess, i, doh, result) {
	n++
	if (isSuccess) {
		success++
		arr[i] = `${doh.dnsServer} : ${hostname1} -> ${result.answers[0].data}`;
	} else error++

	if (n === servers.length) {
		console.info(`\n\n=============================================================================\n全部测完：总计：${servers.length}, 成功：${success}，失败：${error}`);
		for (const item of arr) {
			if (item) {
				console.info(item);
			}
		}
		console.info('=============================================================================\n\n')
	}
}

for (let i = 0; i < servers.length; i++) {
	const n = i;
	const doh = new DNSOverHTTPS(`dns${i}`, null, null, servers[i], sni)
	doh._doDnsQuery(hostname1)
		.then((result) => {
			// console.info(`===> test testDoH '${doh.dnsServer}': ${hostname1} ->`, result.answers, '\n\n')
			count(true, n, doh, result)
		})
		.catch((e) => {
			// console.error(`===> test testDoH '${doh.dnsServer}': ${hostname1} 失败：`, e, '\n\n')
			count(false)
		})
}

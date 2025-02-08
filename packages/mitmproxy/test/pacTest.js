const assert = require('node:assert')
const pac = require('../src/lib/proxy/middleware/source/pac')

const pacClient = pac.createPacClient('../gui/extra/pac/pac.txt') // 相对于 mitmproxy 目录的相对路径，而不是当前 test 目录的。

const string = pacClient.FindProxyForURL('https://www.facebook.com', 'www.facebook.com')
console.log(`facebook: ${string}`)
assert.strictEqual(string, pacClient.proxyUrl)

const string2 = pacClient.FindProxyForURL('https://http2.golang.org', 'http2.golang.org')
console.log(`golang: ${string2}`)
assert.strictEqual(string2, 'DIRECT;')

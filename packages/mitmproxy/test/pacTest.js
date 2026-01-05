import { strictEqual } from 'node:assert'
import { createPacClient } from '../src/lib/proxy/middleware/source/pac'

const pacClient = createPacClient('../gui/extra/pac/pac.txt') // 相对于 mitmproxy 目录的相对路径，而不是当前 test 目录的。

const string = pacClient.FindProxyForURL('https://www.facebook.com', 'www.facebook.com')
console.log(`facebook: ${string}`)
strictEqual(string, pacClient.proxyUrl)

const string2 = pacClient.FindProxyForURL('https://http2.golang.org', 'http2.golang.org')
console.log(`golang: ${string2}`)
strictEqual(string2, 'DIRECT;')

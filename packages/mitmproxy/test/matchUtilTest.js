import { strictEqual } from 'node:assert'
import { domainMapRegexply, matchHostname } from '../src/utils/util.match'

const hostMap = domainMapRegexply({
  'aaa.com': true,
  '*bbb.com': true,
  '*.ccc.com': true,
  '^.{1,3}ddd.com$': true,
  '*.cn': true,
  '.github.com': true,

  '*.eee.com': true,
  '.eee.com': false, // 此配置将被忽略，因为有 '*.eee.com' 了，优先级更高
})

console.log(hostMap)
strictEqual(hostMap['^.*bbb\\.com$'], true)
strictEqual(hostMap['^.*\\.ccc\\.com$'], true)
strictEqual(hostMap['^.{1,3}ddd.com$'], true)
strictEqual(hostMap['^.*\\.cn$'], true)
strictEqual(hostMap['^.*\\.github\\.com$'], true)
strictEqual(hostMap['^.*\\.github\\.com$'], true)
strictEqual(hostMap['^.*\\.eee\\.com$'], true)

const origin = hostMap.origin
strictEqual(origin['aaa.com'], true)
strictEqual(origin['*bbb.com'], true)
strictEqual(origin['*.ccc.com'], true)
strictEqual(origin['*.cn'], true)
strictEqual(origin['*.github.com'], true)
strictEqual(origin['.eee.com'], undefined)

const value11 = matchHostname(hostMap, 'aaa.com', 'test1.1')
const value12 = matchHostname(hostMap, 'aaaa.com', 'test1.2')
const value13 = matchHostname(hostMap, 'aaaa.comx', 'test1.3')
console.log('test1: aaa.com')
strictEqual(value11, true)
strictEqual(value12, undefined)
strictEqual(value13, undefined)

const value21 = matchHostname(hostMap, 'bbb.com', 'test2.1')
const value22 = matchHostname(hostMap, 'xbbb.com', 'test2.2')
const value23 = matchHostname(hostMap, 'bbb.comx', 'test2.3')
const value24 = matchHostname(hostMap, 'x.bbb.com', 'test2.4')
console.log('test2: *bbb.com')
strictEqual(value21, true)
strictEqual(value22, true)
strictEqual(value23, undefined)
strictEqual(value24, true)

const value31 = matchHostname(hostMap, 'ccc.com', 'test3.1')
const value32 = matchHostname(hostMap, 'x.ccc.com', 'test3.2')
const value33 = matchHostname(hostMap, 'xccc.com', 'test3.3')
console.log('test3: *.ccc.com')
strictEqual(value31, true)
strictEqual(value32, true)
strictEqual(value33, undefined)

const value41 = matchHostname(hostMap, 'ddd.com', 'test4.1')
const value42 = matchHostname(hostMap, 'x.ddd.com', 'test4.2')
const value43 = matchHostname(hostMap, 'xddd.com', 'test4.3')
console.log('test4: ^.{1,3}ddd.com$')
strictEqual(value41, undefined)
strictEqual(value42, true)
strictEqual(value43, true)

const value51 = matchHostname(hostMap, 'zzz.cn', 'test5.1')
const value52 = matchHostname(hostMap, 'x.zzz.cn', 'test5.2')
const value53 = matchHostname(hostMap, 'zzz.cnet.com', 'test5.3')
console.log('test5: *.cn')
strictEqual(value51, true)
strictEqual(value52, true)
strictEqual(value53, undefined)

const value61 = matchHostname(hostMap, 'github.com', 'test6.1')
const value62 = matchHostname(hostMap, 'api.github.com', 'test6.2')
const value63 = matchHostname(hostMap, 'aa.bb.github.com', 'test6.3')
const value64 = matchHostname(hostMap, 'aaagithub.com', 'test6.4')
console.log('test6: .github.com')
strictEqual(value61, true)
strictEqual(value62, true)
strictEqual(value63, true)
strictEqual(value64, undefined)

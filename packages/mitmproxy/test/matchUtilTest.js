const assert = require('node:assert')
const matchUtil = require('../src/utils/util.match')

const hostMap = matchUtil.domainMapRegexply({
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
assert.strictEqual(hostMap['^.*bbb\\.com$'], true)
assert.strictEqual(hostMap['^.*\\.ccc\\.com$'], true)
assert.strictEqual(hostMap['^.{1,3}ddd.com$'], true)
assert.strictEqual(hostMap['^.*\\.cn$'], true)
assert.strictEqual(hostMap['^.*\\.github\\.com$'], true)
assert.strictEqual(hostMap['^.*\\.github\\.com$'], true)
assert.strictEqual(hostMap['^.*\\.eee\\.com$'], true)

const origin = hostMap.origin
assert.strictEqual(origin['aaa.com'], true)
assert.strictEqual(origin['*bbb.com'], true)
assert.strictEqual(origin['*.ccc.com'], true)
assert.strictEqual(origin['*.cn'], true)
assert.strictEqual(origin['*.github.com'], true)
assert.strictEqual(origin['.eee.com'], undefined)

const value11 = matchUtil.matchHostname(hostMap, 'aaa.com', 'test1.1')
const value12 = matchUtil.matchHostname(hostMap, 'aaaa.com', 'test1.2')
const value13 = matchUtil.matchHostname(hostMap, 'aaaa.comx', 'test1.3')
console.log('test1: aaa.com')
assert.strictEqual(value11, true)
assert.strictEqual(value12, undefined)
assert.strictEqual(value13, undefined)

const value21 = matchUtil.matchHostname(hostMap, 'bbb.com', 'test2.1')
const value22 = matchUtil.matchHostname(hostMap, 'xbbb.com', 'test2.2')
const value23 = matchUtil.matchHostname(hostMap, 'bbb.comx', 'test2.3')
const value24 = matchUtil.matchHostname(hostMap, 'x.bbb.com', 'test2.4')
console.log('test2: *bbb.com')
assert.strictEqual(value21, true)
assert.strictEqual(value22, true)
assert.strictEqual(value23, undefined)
assert.strictEqual(value24, true)

const value31 = matchUtil.matchHostname(hostMap, 'ccc.com', 'test3.1')
const value32 = matchUtil.matchHostname(hostMap, 'x.ccc.com', 'test3.2')
const value33 = matchUtil.matchHostname(hostMap, 'xccc.com', 'test3.3')
console.log('test3: *.ccc.com')
assert.strictEqual(value31, true)
assert.strictEqual(value32, true)
assert.strictEqual(value33, undefined)

const value41 = matchUtil.matchHostname(hostMap, 'ddd.com', 'test4.1')
const value42 = matchUtil.matchHostname(hostMap, 'x.ddd.com', 'test4.2')
const value43 = matchUtil.matchHostname(hostMap, 'xddd.com', 'test4.3')
console.log('test4: ^.{1,3}ddd.com$')
assert.strictEqual(value41, undefined)
assert.strictEqual(value42, true)
assert.strictEqual(value43, true)

const value51 = matchUtil.matchHostname(hostMap, 'zzz.cn', 'test5.1')
const value52 = matchUtil.matchHostname(hostMap, 'x.zzz.cn', 'test5.2')
const value53 = matchUtil.matchHostname(hostMap, 'zzz.cnet.com', 'test5.3')
console.log('test5: *.cn')
assert.strictEqual(value51, true)
assert.strictEqual(value52, true)
assert.strictEqual(value53, undefined)

const value61 = matchUtil.matchHostname(hostMap, 'github.com', 'test6.1')
const value62 = matchUtil.matchHostname(hostMap, 'api.github.com', 'test6.2')
const value63 = matchUtil.matchHostname(hostMap, 'aa.bb.github.com', 'test6.3')
const value64 = matchUtil.matchHostname(hostMap, 'aaagithub.com', 'test6.4')
console.log('test6: .github.com')
assert.strictEqual(value61, true)
assert.strictEqual(value62, true)
assert.strictEqual(value63, true)
assert.strictEqual(value64, undefined)

const matchUtil = require('../src/utils/util.match')

const hostMap = matchUtil.domainMapRegexply({
  'aaa.com': true,
  '*bbb.com': true,
  '*.ccc.com': true,
  '^.{1,3}ddd.com$': true,
  '*.cn': true,
})

console.log(hostMap)

console.log('test1: aaa.com')
const value11 = matchUtil.matchHostname(hostMap, 'aaa.com', 'test1.1')
const value12 = matchUtil.matchHostname(hostMap, 'aaaa.com', 'test1.2')
const value13 = matchUtil.matchHostname(hostMap, 'aaaa.comx', 'test1.3')
console.log(value11) // true
console.log(value12) // undefined
console.log(value13) // undefined

console.log('test2: *bbb.com')
const value21 = matchUtil.matchHostname(hostMap, 'bbb.com', 'test2.1')
const value22 = matchUtil.matchHostname(hostMap, 'xbbb.com', 'test2.2')
const value23 = matchUtil.matchHostname(hostMap, 'bbb.comx', 'test2.3')
const value24 = matchUtil.matchHostname(hostMap, 'x.bbb.com', 'test2.4')
console.log(value21) // true
console.log(value22) // true
console.log(value23) // undefined
console.log(value24) // true

console.log('test3: *.ccc.com')
const value31 = matchUtil.matchHostname(hostMap, 'ccc.com', 'test3.1')
const value32 = matchUtil.matchHostname(hostMap, 'x.ccc.com', 'test3.2')
const value33 = matchUtil.matchHostname(hostMap, 'xccc.com', 'test3.3')
console.log(value31) // true
console.log(value32) // true
console.log(value33) // undefined

console.log('test4: ^.{1,3}ddd.com$')
const value41 = matchUtil.matchHostname(hostMap, 'ddd.com', 'test4.1')
const value42 = matchUtil.matchHostname(hostMap, 'x.ddd.com', 'test4.2')
const value43 = matchUtil.matchHostname(hostMap, 'xddd.com', 'test4.3')
console.log(value41) // undefined
console.log(value42) // true
console.log(value43) // true

console.log('test5: *.cn')
const value51 = matchUtil.matchHostname(hostMap, 'eee.cn', 'test5.1')
const value52 = matchUtil.matchHostname(hostMap, 'x.eee.cn', 'test5.2')
const value53 = matchUtil.matchHostname(hostMap, 'aaaa.cnet.com', 'test5.3')
console.log(value51) // true
console.log(value52) // true
console.log(value53) // undefined

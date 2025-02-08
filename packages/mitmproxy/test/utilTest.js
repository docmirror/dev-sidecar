const assert = require('node:assert')
const util = require('../src/lib/proxy/common/util')

let arr

arr = util.parseHostnameAndPort('www.baidu.com')
console.log('arr1:', arr)
assert.strictEqual(arr.length === 1, true) // true
assert.strictEqual(arr[0] === 'www.baidu.com', true) // true

arr = util.parseHostnameAndPort('www.baidu.com', 80)
console.log('arr2:', arr)
assert.strictEqual(arr.length === 2, true) // true
assert.strictEqual(arr[0] === 'www.baidu.com', true) // true
assert.strictEqual(arr[1] === 80, true) // true

arr = util.parseHostnameAndPort('www.baidu.com:8080')
console.log('arr3:', arr)
assert.strictEqual(arr.length === 2, true) // true
assert.strictEqual(arr[0] === 'www.baidu.com', true) // true
assert.strictEqual(arr[1] === 8080, true) // true

arr = util.parseHostnameAndPort('www.baidu.com:8080', 8080)
console.log('arr4:', arr)
assert.strictEqual(arr.length === 2, true) // true
assert.strictEqual(arr[0] === 'www.baidu.com', true) // true
assert.strictEqual(arr[1] === 8080, true) // true

arr = util.parseHostnameAndPort('[2001:abcd::1]')
console.log('arr5:', arr)
assert.strictEqual(arr.length === 1, true) // true
assert.strictEqual(arr[0] === '[2001:abcd::1]', true) // ture

arr = util.parseHostnameAndPort('[2001:abcd::1]', 80)
console.log('arr6:', arr)
assert.strictEqual(arr.length === 2, true) // true
assert.strictEqual(arr[0] === '[2001:abcd::1]', true) // ture
assert.strictEqual(arr[1] === 80, true) // ture

arr = util.parseHostnameAndPort('[2001:abcd::1]:8080')
console.log('arr7:', arr)
assert.strictEqual(arr.length === 2, true) // true
assert.strictEqual(arr[0] === '[2001:abcd::1]', true) // true
assert.strictEqual(arr[1] === 8080, true) // ture

arr = util.parseHostnameAndPort('[2001:abcd::1]:8080', 8080)
console.log('arr8:', arr)
assert.strictEqual(arr.length === 2, true) // true
assert.strictEqual(arr[0] === '[2001:abcd::1]', true) // true
assert.strictEqual(arr[1] === 8080, true) // ture

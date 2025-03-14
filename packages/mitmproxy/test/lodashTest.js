const assert = require('node:assert')
const lodash = require('lodash')

// test lodash.isEqual
const arr1 = [1, 2, 3]
const arr2 = [1, 2, 3]
const arr3 = [3, 2, 1]
assert.strictEqual(lodash.isEqual(arr1, arr2), true)
assert.strictEqual(lodash.isEqual(arr1.sort(), arr3.sort()), true)

// test lodash.isEmpty

function isEmpty (obj) {
  return obj == null || (lodash.isObject(obj) && lodash.isEmpty(obj))
}

// true
assert.strictEqual(isEmpty(null), true)
assert.strictEqual(isEmpty({}), true)
assert.strictEqual(isEmpty([]), true)
// false
assert.strictEqual(isEmpty(true), false)
assert.strictEqual(isEmpty(false), false)
assert.strictEqual(isEmpty(1), false)
assert.strictEqual(isEmpty(0), false)
assert.strictEqual(isEmpty(-1), false)
assert.strictEqual(isEmpty(''), false)
assert.strictEqual(isEmpty('1'), false)

// test lodash.unionBy
const list = [
  { host: 1, port: 1, dns: 2 },
  { host: 1, port: 1, dns: 3 },
  { host: 1, port: 2, dns: 3 },
  { host: 1, port: 2, dns: 3 },
]
console.info(lodash.unionBy(list, 'host', 'port'))

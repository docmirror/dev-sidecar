import { strictEqual } from 'node:assert'
import { isEmpty as _isEmpty, isEqual, isObject, unionBy } from 'lodash'

// test lodash.isEqual
const arr1 = [1, 2, 3]
const arr2 = [1, 2, 3]
const arr3 = [3, 2, 1]
strictEqual(isEqual(arr1, arr2), true)
strictEqual(isEqual(arr1.sort(), arr3.sort()), true)

// test lodash.isEmpty

function isEmpty (obj) {
  return obj == null || (isObject(obj) && _isEmpty(obj))
}

// true
strictEqual(isEmpty(null), true)
strictEqual(isEmpty({}), true)
strictEqual(isEmpty([]), true)
// false
strictEqual(isEmpty(true), false)
strictEqual(isEmpty(false), false)
strictEqual(isEmpty(1), false)
strictEqual(isEmpty(0), false)
strictEqual(isEmpty(-1), false)
strictEqual(isEmpty(''), false)
strictEqual(isEmpty('1'), false)

// test lodash.unionBy
const list = [
  { host: 1, port: 1, dns: 2 },
  { host: 1, port: 1, dns: 3 },
  { host: 1, port: 2, dns: 3 },
  { host: 1, port: 2, dns: 3 },
]
console.info(unionBy(list, 'host', 'port'))

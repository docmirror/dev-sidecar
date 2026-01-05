import { strictEqual } from 'node:assert'
import { parseHostnameAndPort } from '../src/lib/proxy/common/util'

let arr

arr = parseHostnameAndPort('www.baidu.com')
console.log('arr1:', arr)
strictEqual(arr.length === 1, true) // true
strictEqual(arr[0] === 'www.baidu.com', true) // true

arr = parseHostnameAndPort('www.baidu.com', 80)
console.log('arr2:', arr)
strictEqual(arr.length === 2, true) // true
strictEqual(arr[0] === 'www.baidu.com', true) // true
strictEqual(arr[1] === 80, true) // true

arr = parseHostnameAndPort('www.baidu.com:8080')
console.log('arr3:', arr)
strictEqual(arr.length === 2, true) // true
strictEqual(arr[0] === 'www.baidu.com', true) // true
strictEqual(arr[1] === 8080, true) // true

arr = parseHostnameAndPort('www.baidu.com:8080', 8080)
console.log('arr4:', arr)
strictEqual(arr.length === 2, true) // true
strictEqual(arr[0] === 'www.baidu.com', true) // true
strictEqual(arr[1] === 8080, true) // true

arr = parseHostnameAndPort('[2001:abcd::1]')
console.log('arr5:', arr)
strictEqual(arr.length === 1, true) // true
strictEqual(arr[0] === '[2001:abcd::1]', true) // ture

arr = parseHostnameAndPort('[2001:abcd::1]', 80)
console.log('arr6:', arr)
strictEqual(arr.length === 2, true) // true
strictEqual(arr[0] === '[2001:abcd::1]', true) // ture
strictEqual(arr[1] === 80, true) // ture

arr = parseHostnameAndPort('[2001:abcd::1]:8080')
console.log('arr7:', arr)
strictEqual(arr.length === 2, true) // true
strictEqual(arr[0] === '[2001:abcd::1]', true) // true
strictEqual(arr[1] === 8080, true) // ture

arr = parseHostnameAndPort('[2001:abcd::1]:8080', 8080)
console.log('arr8:', arr)
strictEqual(arr.length === 2, true) // true
strictEqual(arr[0] === '[2001:abcd::1]', true) // true
strictEqual(arr[1] === 8080, true) // ture

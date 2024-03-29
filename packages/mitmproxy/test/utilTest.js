const util = require('../src/lib/proxy/common/util')

let arr

arr = util.parseHostnameAndPort('www.baidu.com')
console.log(arr)
console.log(arr.length === 1) // true
console.log(arr[0] === 'www.baidu.com') // true

arr = util.parseHostnameAndPort('www.baidu.com', 80)
console.log(arr)
console.log(arr.length === 2) // true
console.log(arr[0] === 'www.baidu.com') // true
console.log(arr[1] === 80) // true

arr = util.parseHostnameAndPort('www.baidu.com:8080')
console.log(arr)
console.log(arr.length === 2) // true
console.log(arr[0] === 'www.baidu.com') // true
console.log(arr[1] === 8080) // true

arr = util.parseHostnameAndPort('www.baidu.com:8080', 8080)
console.log(arr)
console.log(arr.length === 2) // true
console.log(arr[0] === 'www.baidu.com') // true
console.log(arr[1] === 8080) // true

arr = util.parseHostnameAndPort('[2001:abcd::1]')
console.log(arr)
console.log(arr.length === 1) // true
console.log(arr[0] === '[2001:abcd::1]') // ture

arr = util.parseHostnameAndPort('[2001:abcd::1]', 80)
console.log(arr)
console.log(arr.length === 2) // true
console.log(arr[0] === '[2001:abcd::1]') // ture
console.log(arr[1] === 80) // ture

arr = util.parseHostnameAndPort('[2001:abcd::1]:8080')
console.log(arr)
console.log(arr.length === 2) // true
console.log(arr[0] === '[2001:abcd::1]') // true
console.log(arr[1] === 8080) // ture

arr = util.parseHostnameAndPort('[2001:abcd::1]:8080', 8080)
console.log(arr)
console.log(arr.length === 2) // true
console.log(arr[0] === '[2001:abcd::1]') // true
console.log(arr[1] === 8080) // ture

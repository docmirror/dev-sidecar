const lodash = require('lodash')

const arr1 = [1, 2, 3]
const arr2 = [3, 2, 1]
console.log(lodash.isEqual(arr1.sort(), arr2.sort()))

const CryptoJs = require('crypto-js')
const ret = CryptoJs.SHA256('111111111111')
console.log(ret.toString(CryptoJs.enc.Base64))
console.log(1 / 2)

const version1 = '1.7.0'
console.log(version1.substring(0, version1.lastIndexOf('.')))

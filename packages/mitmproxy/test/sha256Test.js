const CryptoJs = require('crypto-js')
const ret = CryptoJs.SHA256('111111111111')
console.log(ret.toString(CryptoJs.enc.Base64))
console.log(1 / 2)

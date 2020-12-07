const pac = require('../src/lib/proxy/middleware/source/pac')
const string = pac.FindProxyForURL('https://www.facebook.com', 'www.facebook.com')
console.log(string)

const string2 = pac.FindProxyForURL('https://http2.golang.org', 'http2.golang.org')
console.log(string2)

const pac = require('../src/lib/interceptor/impl/source/pac')
const string = pac.FindProxyForURL('https://www.facebook.com', 'www.facebook.com')
console.log(string)

// const cmd1 = require('node-cmd')
// cmd1.get('set',
//   function (err, data, stderr) {
//     console.log('cmd complete:', err, data, stderr)
//     if (err) {
//       console.error('cmd 命令执行错误：', err, stderr)
//     } else {
//       console.log('cmd 命令执行结果：', data)
//     }
//   }
// )

// var process = require('child_process')
//
// var cmd = 'set'
// process.exec(cmd, function (error, stdout, stderr) {
//   console.log('error:' + error)
//   console.log('stdout:' + stdout)
//   console.log('stderr:' + stderr)
// })

// var HttpsProxyAgent = require('https-proxy-agent')
// var proxy = 'http://127.0.0.1:1181'
// var agent = new HttpsProxyAgent(proxy)
// console.log('111',process.env.NODE_EXTRA_CA_CERTS)
// const https = require('https')
// https_options = {
//   "agent": agent,
// };
// https.get('https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js', https_options,(res) => {
//   console.log('状态码:', res.statusCode)
//   console.log('请求头:', res.headers)
//
//   res.on('data', (d) => {
//     process.stdout.write(d)
//   })
// }).on('error', (e) => {
//   console.error(e)
// })

const fs = require('fs')
const content = fs.readFileSync('C:\\Users\\Administrator\\.dev-sidecar\\dev-sidecar.ca.crt')
console.log('content:',JSON.stringify(content.toString().replace(new RegExp('\r\n','g'),'\n')));

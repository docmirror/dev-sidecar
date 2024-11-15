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

// const process = require('child_process')
//
// const cmd = 'set'
// process.exec(cmd, function (error, stdout, stderr) {
//   console.log('error:' + error)
//   console.log('stdout:' + stdout)
//   console.log('stderr:' + stderr)
// })

// const HttpsProxyAgent = require('https-proxy-agent')
// const proxy = 'http://user:pass@xxx.com:port'
// const agent = new HttpsProxyAgent(proxy)
// const https = require('https')
// https.get('https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js', (res) => {
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
const request = require('request')

request({
  url: 'https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js',
  proxy: 'http://127.0.0.1:31181',
  ca: fs.readFileSync('C:/Users/Administrator/.dev-sidecar/dev-sidecar.ca.crt')
// eslint-disable-next-line handle-callback-err
}, (err, res, body) => {
  console.log(body)
})

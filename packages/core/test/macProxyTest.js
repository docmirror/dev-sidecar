// const childProcess = require('child_process')
// const util = require('util')
// const exec = util.promisify(childProcess.exec)
//
// async function test () {
//   const wifiAdaptor = (await exec('sh -c "networksetup -listnetworkserviceorder | grep `route -n get 0.0.0.0 | grep \'interface\' | cut -d \':\' -f2` -B 1 | head -n 1 | cut -d \' \' -f2"')).stdout.trim()
//
//   await exec(`networksetup -setwebproxystate '${wifiAdaptor}' off`)
//   return await exec(`networksetup -setsecurewebproxystate '${wifiAdaptor}' off`)
// }
// test().then((ret) => {
//   console.log('haha', ret)
// })
let wifiAdaptor = '(151) test'
wifiAdaptor = wifiAdaptor.substring(wifiAdaptor.indexOf(' ')).trim()
console.log(wifiAdaptor)

const mitmproxy = require('../../../lib/proxy')
const ProxyOptions = require('./options')

function fireError (e) {
  process.send({ type: 'error', event: e })
}
function fireStatus (status) {
  process.send({ type: 'status', event: status })
}

let server
function start () {
  const config = JSON.parse(process.argv[2])
  const proxyOptions = ProxyOptions(config)
  console.log('proxy options:', proxyOptions)
  const newServer = mitmproxy.createProxy(proxyOptions, () => {
    fireStatus(true)
    console.log('代理服务已启动：127.0.0.1:' + proxyOptions.port)
  })
  newServer.on('close', () => {
    if (server === newServer) {
      server = null
      fireStatus(false)
    }
  })
  newServer.on('error', (e) => {
    console.log('server error', e)
    // newServer = null
    fireError(e)
  })
}

const api = {
  async  close () {
    return new Promise((resolve, reject) => {
      if (server) {
        server.close((err) => {
          if (err) {
            console.log('close error', err, ',', err.code, ',', err.message, ',', err.errno)
            if (err.code === 'ERR_SERVER_NOT_RUNNING') {
              console.log('代理服务关闭成功')
              resolve()
              return
            }
            reject(err)
          } else {
            console.log('代理服务关闭成功')
            resolve()
          }
        })
      } else {
        console.log('server is null')
        fireStatus(false)
        resolve()
      }
    })
  }
}

process.on('message', function (msg) {
  console.log('child get msg: ' + JSON.stringify(msg))
  if (msg.type === 'action') {
    api[msg.event.key](msg.event.params)
  }
})

// 启动服务
start()

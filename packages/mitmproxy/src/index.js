const mitmproxy = require('./lib/proxy')
const ProxyOptions = require('./options')
const config = require('./lib/proxy/common/config')

function fireError (e) {
  process.send({ type: 'error', event: e })
}
function fireStatus (status) {
  process.send({ type: 'status', event: status })
}

let server

function registerProcessListener () {
  process.on('message', function (msg) {
    console.log('child get msg: ' + JSON.stringify(msg))
    if (msg.type === 'action') {
      api[msg.event.key](msg.event.params)
    }
  })

  process.on('SIGINT', () => {
    console.log('on sigint : closed ')
    process.exit(0)
  })

  // 避免异常崩溃
  process.on('uncaughtException', function (err) {
    if (err.code === 'ECONNABORTED') {
      //  console.error(err.errno)
      return
    }
    console.error(err)
  })

  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
    // application specific logging, throwing an error, or other logic here
  })
}

const api = {
  async start (config) {
    const proxyOptions = ProxyOptions(config)
    console.log('proxy options:', proxyOptions)
    if (proxyOptions.setting && proxyOptions.setting.NODE_TLS_REJECT_UNAUTHORIZED === false) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'
    }
    const newServer = mitmproxy.createProxy(proxyOptions, () => {
      fireStatus(true)
      console.log('代理服务已启动：127.0.0.1:' + proxyOptions.port)
    })
    newServer.on('close', () => {
      console.log('server will closed ')
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
    server = newServer

    registerProcessListener()
  },
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

module.exports = {
  ...api,
  config
}

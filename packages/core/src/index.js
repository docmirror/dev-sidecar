const expose = require('./expose.js')

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// 避免异常崩溃
process.on('uncaughtException', function (err) {
  if (err.code === 'ECONNABORTED') {
    //  console.error(err.errno)
    return
  }
  console.error('uncaughtException', err)
})

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

module.exports = expose

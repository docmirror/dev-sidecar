const expose = require('./expose.js')
const log = require('./utils/util.log')
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// 避免异常崩溃
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNABORTED') {
    //  console.error(err.errno)
    return
  }
  log.error('Process Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, p) => {
  log.error('Process Unhandled Rejection at: Promise:', p, ', reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

module.exports = expose

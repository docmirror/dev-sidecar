import expose from './expose.js';
import log from './utils/util.log.core.js';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// 避免异常崩溃
process.on('uncaughtException', (err) => {
  log.error('Process Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, p) => {
  log.error('Process Unhandled Rejection at: Promise:', p, ', reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

export default expose;

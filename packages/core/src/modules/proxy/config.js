// 单独拆出来为了风格统一
// 复用主配置里的 proxy 默认值，避免重复维护两份配置
const mainConfig = require('../../config')

module.exports = mainConfig.server.proxy

// 相对路径到 packages/core/src/config/index.js
const mainConfig = require('../../../config')

module.exports = {
  name: '梯子',
  enabled: false, // 默认关闭梯子
  ...mainConfig.server.plugin.overwall,
}

module.exports = {
  name: '网络检测',
  statusOff: true,
  enabled: false,
  tip: '运行网络检测来评估当前网络环境',
  startup: {},
  // FreeEye 自带一套 tests（位于本目录的 checkpoints/ 和 config.json），
  // 这里保留最小配置以便在 dev-sidecar 中显示和切换插件。
  setting: {
    // 如果需要覆盖内置测试配置，可以在这里提供相对于插件目录或工作目录的路径
    testsConfigFile: 'config.json',
    testsDir: 'checkpoints',
    // 默认网络请求超时时间（秒），插件内部的测试可以参考或覆盖
    defaultTimeout: 3,
  },
}

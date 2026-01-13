import mainConfig from '../../../config'

export default {
  name: '网络检测',
  statusOff: true,
  enabled: false,
  tip: '运行网络检测来评估当前网络环境',
  startup: {},
  // FreeEye 自带一套 tests（位于本目录的 checkpoints/ 和 config.json），
  // 这里保留最小配置以便在 dev-sidecar 中显示和切换插件。
  setting: {
    testsDir: 'checkpoints',
    // 默认网络请求超时时间（秒），插件内部的测试可以参考或覆盖
    defaultTimeout: 3,
  },
  // 复用主配置里的 free_eye 默认值，避免重复维护两份配置
  // TODO: 此处config并未读取到用户自定义配置
  ...mainConfig.server.plugin.free_eye,
}

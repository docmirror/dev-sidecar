module.exports = {
  name: 'PIP加速',
  statusOff: true,
  enabled: null, // 没有开关
  tip: '如果你没有安装pip则不需要启动它',
  startup: {
  },
  setting: {
    command: 'pip',
    trustedHost: 'pypi.org',
    registry: 'https://pypi.org/simple/'// 可以选择切换官方或者淘宝镜像
  }
}

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
    registry: 'https://pypi.org/simple/', // 可以选择切换官方或者淘宝镜像
    registryList: {
      aliyun: {
        name: '阿里镜像',
        value: 'https://mirrors.aliyun.com/pypi/simple/',
      },
      baidu: {
        name: '百度镜像',
        value: 'https://mirror.baidu.com/pypi/simple/',
      },
      douban: {
        name: '豆瓣镜像',
        value: 'http://pypi.douban.com/simple/',
      },
      sohu: {
        name: '搜狐镜像',
        value: 'http://mirrors.sohu.com/Python/',
      },
      ustclug: {
        name: '中科大镜像',
        value: 'https://pypi.mirrors.ustc.edu.cn/simple/',
      },
      bfsu: {
        name: '北京外国语大学镜像',
        value: 'https://mirrors.bfsu.edu.cn/pypi/web/simple/',
      },
      nju: {
        name: '南京大学镜像',
        value: 'https://mirror.nju.edu.cn/pypi/web/simple/',
      },
      tsinghua: {
        name: '清华大学镜像',
        value: 'https://pypi.tuna.tsinghua.edu.cn/simple/',
      },
      hust: {
        name: '华中科大镜像',
        value: 'https://mirrors.hust.edu.cn/pypi/web/simple/',
      },
      sdut: {
        name: '山东理工大学镜像',
        value: 'http://pypi.sdutlinux.org/',
      },
    },
  },
}

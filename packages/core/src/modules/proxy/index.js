const ProxyPlugin = function (context) {
  const { config, event, shell, log } = context
  const api = {
    async start () {
      return api.setProxy()
    },

    async close () {
      return api.unsetProxy()
    },

    async restart () {
      await api.close()
      await api.start()
    },

    async setProxy () {
      const ip = '127.0.0.1'
      const port = config.get().server.port
      const setEnv = config.get().proxy.setEnv
      await shell.setSystemProxy({ ip, port, setEnv })
      log.info(`开启系统代理成功：${ip}:${port}`)
      event.fire('status', { key: 'proxy.enabled', value: true })
      return { ip, port }
    },

    async unsetProxy (setEnv) {
      if (setEnv) {
        setEnv = config.get().proxy.setEnv
      }
      try {
        await shell.setSystemProxy({ setEnv })
        event.fire('status', { key: 'proxy.enabled', value: false })
        log.info('关闭系统代理成功')
        return true
      } catch (err) {
        log.error('关闭系统代理失败', err)
        return false
      }
    },

    async setEnableLoopback () {
      await shell.enableLoopback()
      log.info('打开EnableLoopback成功')
      return true
    }
  }
  return api
}
module.exports = {
  key: 'proxy',
  config: {
    enabled: true,
    name: '系统代理',
    use: 'local',
    other: [],
    setEnv: false,
    excludeIpList: [
      // region 中国大陆，可直接访问，无需代理

      // 中国大陆域名，大部分可直接访问，无需代理
      '*.cn',
      'cn.*',

      // CSDN
      '*.csdn.net',

      // 百度
      '*.baidu.com',

      // 腾讯
      '*.tencent.com',
      '*.qq.com',
      '*.weixin.com',
      '*.wechat.com',

      // 阿里
      '*.alipay.com',
      '*.taobao.com',
      '*.tmall.com',
      '*.aliyun.com',
      '*.dingtalk.com', // 不排除会导致钉钉的团队文档打不开（原因未知）

      // Gitee
      'gitee.com',
      '*.gitee.com',
      '*.gitee.io',

      // OSS
      '*.sonatype.org',
      // Maven镜像
      '*.maven.org',
      // Maven Repository
      '*.mvnrepository.com',
      'challenges.cloudflare.com', // 在访问 mvnrepository.com 的人机校验时使用，国内可直接访问，所以不需要代理，代理了反而变慢了。

      // 苹果
      '*.apple.com',
      '*.icloud.com',

      // 微软
      '*.microsoft.com',
      '*.windows.com',
      '*.office.com',
      '*.office.net',
      '*.live.com',
      '*.msn.com',

      // WPS
      '*.wps.com',

      // 奇虎
      '*.qihoo.com',
      '*.qihucdn.com',
      // 360
      '*.360.com',
      '*.360safe.com',
      '*.360buyimg.com',
      '*.360buy.com',

      // 京东
      '*.jd.com',
      '*.jcloud.com',
      '*.jcloudcs.com',
      '*.jcloudcache.com',
      '*.jcloudcdn.com',
      '*.jcloudlb.com',

      // endregion

      // 本地地址，无需代理
      'localhost',
      'localhost.*', // 部分VPN会在host中添加这种格式的域名指向127.0.0.1，所以也排除掉
      '127.*',
      'test.*', // 本地开发时，测试用的虚拟域名格式，无需代理

      // 服务器端常用地址，无需代理
      '10.*',
      '172.16.*',
      '172.17.*',
      '172.18.*',
      '172.19.*',
      '172.20.*',
      '172.21.*',
      '172.22.*',
      '172.23.*',
      '172.24.*',
      '172.25.*',
      '172.26.*',
      '172.27.*',
      '172.28.*',
      '172.29.*',
      '172.30.*',
      '172.31.*',

      // 局域网地址，无需代理
      '192.168.*'
    ]
  },
  status: {
    enabled: false,
    proxyTarget: ''
  },
  plugin: ProxyPlugin
}

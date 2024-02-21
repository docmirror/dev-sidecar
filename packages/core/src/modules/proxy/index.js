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
        log.error('关闭系统代理失败:', err)
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
    excludeIpList: {
      // region 常用国内可访问域名

      // 中国大陆
      '*.cn': true,
      'cn.*': true,
      '*china*': true,

      // 系统之家
      '*.xitongzhijia.net': true,

      // CSDN
      '*.csdn.net': true,

      // 百度
      '*.baidu.com': true,
      '*.baiducontent.com': true,
      '*.bdimg.com': true,
      '*.bdstatic.com': true,
      '*.bdydns.com': true,

      // 腾讯
      '*.tencent.com': true,
      '*.qq.com': true,
      '*.weixin.com': true,
      '*.weixinbridge.com': true,
      '*.wechat.com': true,
      '*.idqqimg.com': true,
      '*.gtimg.com': true,
      '*.qpic.com': true,
      '*.qlogo.com': true,
      '*.myapp.com': true,
      '*.myqcloud.com': true,

      // 阿里
      '*.aliyun.com': true,
      '*.alipay.com': true,
      '*.taobao.com': true,
      '*.tmall.com': true,
      '*.alipayobjects.com': true,
      '*.dingtalk.com': true,
      '*.mmstat.com': true,
      '*.alicdn.com': true,
      '*.hdslb.com': true,

      // Gitee
      'gitee.com': true,
      '*.gitee.com': true,
      '*.gitee.io': true,
      '*.giteeusercontent.com': true,

      // Mozilla Firefox
      '*.mozilla.org': true,
      '*.mozilla.com': true,
      '*.mozilla.net': true,
      '*.firefox.com': true,
      '*.firefox.org': true,
      '*.mozillademos.org': true,
      '*.mozillians.org': true,
      '*.mozillians.net': true,
      '*.mozillians.com': true,

      // OSS
      '*.sonatype.org': true,
      // Maven镜像
      '*.maven.org': true,
      // Maven Repository
      '*.mvnrepository.com': true,
      'challenges.cloudflare.com': true, // 在访问 mvnrepository.com 的人机校验时使用，国内可直接访问，所以不需要代理，代理了反而变慢了。

      // 苹果
      '*.apple.com': true,
      '*.icloud.com': true,

      // 微软
      '*.microsoft.com': true,
      '*.windows.com': true,
      '*.office.com': true,
      '*.office.net': true,
      '*.live.com': true,
      '*.msn.com': true,

      // WPS
      '*.wps.com': true,

      // 奇虎
      '*.qihoo.com': true,
      '*.qihucdn.com': true,
      // 360
      '*.360.com': true,
      '*.360safe.com': true,
      '*.360buyimg.com': true,
      '*.360buy.com': true,

      // 京东
      '*.jd.com': true,
      '*.jcloud.com': true,
      '*.jcloudcs.com': true,
      '*.jcloudcache.com': true,
      '*.jcloudcdn.com': true,
      '*.jcloudlb.com': true,

      // 哔哩哔哩
      '*.bilibili.com': true,
      '*.bilivideo.com.com': true,
      '*.biliapi.net': true,

      // 移动
      '*.10086.com': true,
      '*.10086cloud.com': true,

      // 移动：139邮箱
      '*.139.com': true,

      // 迅雷
      '*.xunlei.com': true,

      // 网站ICP备案查询
      '*.icpapi.com': true,

      // AGE动漫
      '*.agedm.*': true,
      '*.zhimg.com': true,
      '*.bdxiguaimg.com': true,
      '*.toutiaoimg.com': true,
      '*.bytecdntp.com': true,
      '*.bytegoofy.com': true,
      '*.toutiao.com': true,
      '*.toutiaovod.com': true,
      '*.aliyuncs.com': true,
      '*.127.net': true,
      '43.240.74.134': true,

      // ZzzFun
      '*.zzzfun.one': true,
      '*.zzzfun.vip': true,

      // 必应
      '*.bing.com': true,

      // 我的个人域名
      '*.easyj.icu': true,

      // 未知公司
      '*.bcebos.com': true,
      'icannwiki.org': true,
      '*.icannwiki.org': true,
      '*.sectigo.com': true,
      '*.pingdom.net': true,

      // endregion

      // 本地地址，无需代理
      'localhost': true,
      'localhost.*': true, // 部分VPN会在host中添加这种格式的域名指向127.0.0.1，所以也排除掉
      '127.*': true,
      'test.*': true, // 本地开发时，测试用的虚拟域名格式，无需代理

      // 服务器端常用地址，无需代理
      '10.*': true,
      '172.16.*': true,
      '172.17.*': true,
      '172.18.*': true,
      '172.19.*': true,
      '172.20.*': true,
      '172.21.*': true,
      '172.22.*': true,
      '172.23.*': true,
      '172.24.*': true,
      '172.25.*': true,
      '172.26.*': true,
      '172.27.*': true,
      '172.28.*': true,
      '172.29.*': true,
      '172.30.*': true,
      '172.31.*': true,

      // 局域网地址，无需代理
      '192.168.*': true
    }
  },
  status: {
    enabled: false,
    proxyTarget: ''
  },
  plugin: ProxyPlugin
}

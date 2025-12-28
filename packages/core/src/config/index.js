/* eslint-disable style/no-tabs */
const path = require('node:path')
const configLoader = require('./local-config-loader')

function getRootCaCertPath () {
  return path.join(configLoader.getUserBasePath(), '/dev-sidecar.ca.crt')
}

function getRootCaKeyPath () {
  return path.join(configLoader.getUserBasePath(), '/dev-sidecar.ca.key.pem')
}

const defaultConfig = {
  app: {
    mode: 'default',
    autoStart: {
      enabled: false,
    },
    remoteConfig: {
      enabled: true,
      // 共享远程配置地址
      url: 'https://gitee.com/wangliang181230/dev-sidecar/raw/docmirror2.x/packages/core/src/config/remote_config.json',
      // 个人远程配置地址
      personalUrl: '',
    },
    startShowWindow: true, // 启动时是否打开窗口：true=打开窗口, false=隐藏窗口
    needCheckHideWindow: true, // 是否需要在隐藏窗口时做检查
    showHideShortcut: 'Alt + S', // 显示/隐藏窗口快捷键
    windowSize: { width: 900, height: 750 }, // 启动时，窗口的尺寸
    theme: 'dark', // 主题：light=亮色, dark=暗色
    autoChecked: true, // 是否自动检查更新
    skipPreRelease: true, // 是否忽略预发布版本
    dock: {
      hideWhenWinClose: false,
    },
    closeStrategy: 0,
    showShutdownTip: true,

    // 日志相关配置
    logFileSavePath: path.join(configLoader.getUserBasePath(), '/logs'), // 日志文件保存路径
    keepLogFileCount: 15, // 保留日志文件数
    maxLogFileSize: 1, // 最大日志文件大小
    maxLogFileSizeUnit: 'GB', // 最大日志文件大小单位
  },
  server: {
    enabled: true,
    host: '127.0.0.1',
    port: 31181,
    setting: {
      NODE_TLS_REJECT_UNAUTHORIZED: true,
      verifySsl: true,
      script: {
        enabled: true,
        defaultDir: './extra/scripts/',
      },
      userBasePath: configLoader.getUserBasePath(),
      rootCaFile: {
        certPath: getRootCaCertPath(),
        keyPath: getRootCaKeyPath(),
      },

      // 默认超时时间配置
      defaultTimeout: 20000, // 请求超时时间
      defaultKeepAliveTimeout: 30000, // 连接超时时间

      // 指定域名超时时间配置
      timeoutMapping: {
        'github.com': {
          timeout: 20000,
          keepAliveTimeout: 30000,
        },
      },

      // 慢速IP延迟时间：测速超过该值时，则视为延迟高，显示为橙色
      lowSpeedDelay: 200,
    },
    compatible: {
      // **** 自定义兼容配置 **** //
      // connect阶段所需的兼容性配置
      connect: {
        // 参考配置（无path）
        // 'xxx.xxx.xxx.xxx:443': {
        //   ssl: false
        // }
      },
      // request阶段所需的兼容性配置
      request: {
        // 参考配置（配置方式同 `拦截配置`）
        // 'xxx.xxx.xxx.xxx:443': {
        //   '.*': {
        //     rejectUnauthorized: false
        //   }
        // }
      },
    },
    intercept: {
      enabled: true,
    },
    intercepts: {
      'github.com': {
        '.*': {
          sni: 'baidu.com',
        },
        '^(/[\\w-.]+){2,}/?(\\?.*)?$': {
          // 篡改猴插件地址，以下是高速镜像地址
          tampermonkeyScript: 'https://gitee.com/wangliang181230/dev-sidecar/raw/scripts/tampermonkey.js',
          // Github油猴脚本地址，以下是高速镜像地址
          script: 'https://gitee.com/wangliang181230/dev-sidecar/raw/scripts/GithubEnhanced-High-Speed-Download.user.js',
          remark: '注：上面所使用的脚本地址，为高速镜像地址。',
          desc: '油猴脚本：高速下载 Git Clone/SSH、Release、Raw、Code(ZIP) 等文件 (公益加速)、项目列表单文件快捷下载、添加 git clone 命令',
        },
        // 以下三项暂时先注释掉，因为已经有油猴脚本提供高速下载地址了。
        // '/.*/.*/releases/download/': {
        //   redirect: 'gh.api.99988866.xyz/https://github.com',
        //   desc: 'release文件加速下载跳转地址'
        // },
        // '/.*/.*/archive/': {
        //   redirect: 'gh.api.99988866.xyz/https://github.com'
        // },
        // 以下代理地址不支持该类资源的代理，暂时注释掉
        // '/.*/.*/blame/': {
        //   redirect: 'gh.api.99988866.xyz/https://github.com'
        // },
        '/fluidicon.png': {
          cacheDays: 365,
          desc: 'Github那只猫的图片，缓存1年',
        },
        '^(/[^/]+){2}/pull/\\d+/open_with_menu.*$': {
          cacheDays: 7,
          desc: 'PR详情页：标题右边那个Code按钮的HTML代码请求地址，感觉上应该可以缓存。暂时先设置为缓存7天',
        },
        '^((/[^/]+){2,})/raw((/[^/]+)+\\.(jpg|jpeg|png|gif))(\\?.*)?$': {
          // eslint-disable-next-line no-template-curly-in-string
          proxy: 'https://raw.githubusercontent.com${m[1]}${m[3]}',
          sni: 'baidu.com',
          cacheDays: 7,
          desc: '仓库内图片，重定向改为代理，并缓存7天。',
        },
        '^((/[^/]+){2,})/raw((/[^/]+)+\\.js)(\\?.*)?$': {
          // eslint-disable-next-line no-template-curly-in-string
          proxy: 'https://raw.githubusercontent.com${m[1]}${m[3]}',
          sni: 'baidu.com',
          responseReplace: { headers: { 'content-type': 'application/javascript; charset=utf-8' } },
          desc: '仓库内脚本，重定向改为代理，并设置响应头Content-Type。作用：方便script拦截器直接使用，避免引起跨域问题和脚本内容限制问题。',
        },
      },
      'github.githubassets.com': {
        '.*': {
          sni: 'baidu.com',
        },
        '^(/[^/]+)*/[^./]+\\.(svg|png|gif|jpg|jpeg|ico|js|css)(\\?.*)?$': {
          cacheDays: 365,
          desc: '图片、JS文件、CSS文件，缓存1年',
        },
        '.*.backup': {
          desc: 'github.com域名下，该请求已经不存在，此配置暂时先备份掉。',
          proxy: 'github.com',
          sni: 'baidu.com',
          responseReplace: {
            headers: {
              'access-control-allow-origin': '*',
              'cross-origin-resource-policy': 'cross-origin',
              'set-cookie': '[remove]',
            },
          },
        },
      },
      'opengraph.githubassets.com': {
        '^/(([^/]+/){3}issues/\\d+)?(\\?.*)?$': {
          cacheDays: 365,
        },
        '.*': {
          sni: 'baidu.com',
        },
      },
      '*.githubusercontent.com': {
        '.*': {
          sni: 'baidu.com',
          requestReplace: {
            headers: {
              'accept-language': 'en-US,en;q=0.8',
            },
          },
        },
      },
      'camo.githubusercontent.com': {
        '^[a-zA-Z0-9/]+(\\?.*)?$': {
          cacheDays: 365,
          desc: '图片，缓存1年',
        },
      },
      'collector.github.com': {
        '/github/collect': {
          success: true,
          status: 204,
          desc: '采集数据，快速成功',
        },
        '.*': {
          sni: 'baidu.com',
        },
      },
      'gist.github.com': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      '*.github.io': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      '*.gravatar.com': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      '*.windows.net': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      'customer-stories-feed.github.com': {
        '.*': { proxy: 'customer-stories-feed.fastgit.org' },
      },
      'user-images.githubusercontent.com': {
        '^/.*\\.png(\\?.*)?$': {
          cacheDays: 365,
          desc: '用户在PR或issue等内容中上传的图片，缓存1年。注：每张图片都有唯一的ID，不会重复，可以安心缓存',
        },
      },
      'private-user-images.githubusercontent.com': {
        '^/.*\\.png(\\?.*)?$': {
          cacheDays: 30,
          cacheHours: null,
          desc: '用户在PR或issue等内容中上传的图片，缓存30天',
        },
      },
      'avatars.githubusercontent.com': {
        '^/u/\\d+(\\?.*)?$': {
          cacheDays: 365,
          desc: '用户头像，缓存1年',
        },
      },
      'api.github.com': {
        '^/_private/browser/stats$': {
          success: true,
          desc: 'github的访问速度分析上传，没有必要，直接返回成功',
        },
        '.*': {
          sni: 'baidu.com',
        },
      },
      '*.docker.com': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      'login.docker.com': {
        '/favicon.ico': {
          proxy: 'hub.docker.com',
          sni: 'baidu.com',
          desc: '登录页面的ico，采用hub.docker.com的',
        },
        '.*': {
          sni: 'login.docker.com', // 配置它自己是为了覆盖 *.docker.com 中的SNI配置，此配置优先级更高
        },
        'download.docker.com': {
          '.*': {
            sni: 'download.docker.com', // 配置它自己是为了覆盖 *.docker.com 中的SNI配置，此配置优先级更高
          },
        },
        'hub.docker.com': {
          '.*': {
            sni: 'none',
          },
        },

        // google cdn
        'www.google.com': {
          '/recaptcha/.*': { proxy: 'www.recaptcha.net' },
        // '.*': {
        //   proxy: 'gg.docmirror.top/_yxorp',
        //   desc: '呀，被你发现了，偷偷的用，别声张'
        // }
        },
        'www.gstatic.com': {
          '/recaptcha/.*': { proxy: 'www.recaptcha.net' },
        },
        'ajax.googleapis.com': {
          '.*': {
            proxy: 'ajax.lug.ustc.edu.cn',
            backup: ['gapis.geekzu.org'],
            test: 'ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js',
          },
        },
        // 'fonts.googleapis.com': {
        //   '.*': {
        //     proxy: 'fonts.loli.net',
        //     test: 'https://fonts.googleapis.com/css?family=Oswald',
        //   },
        // },
        // 'fonts.gstatic.com': {
        //   '.*': {
        //     proxy: 'gstatic.loli.net',
        //     backup: ['fonts-gstatic.proxy.ustclug.org']
        //   }
        // },
        'fonts.(googleapis|gstatic).com': {
          '.*': {
            proxy: 'fonts.googleapis.cn',
          },
        },
        '^(?!.*(translate-pa).google(?:apis|usercontent)?.com).*google(?:apis|usercontent)?.com$': {
          '.*': {
            sni: 'www.google.cn',
            desc: '部分需要走其它代理的服务',
          },
        },
        '^.*(youtube.com|gstatic.com|youtube.nocookie.com|youtu.be|ggpht.com|i.ytimg.com|blogger.com|doodles.google|about.google|android.com)$': {
          '.*': {
            sni: 'www.google.cn',
          },
        },
        'themes.googleapis.com': {
          '.*': {
            proxy: 'themes.loli.net',
            backup: ['themes.proxy.ustclug.org'],
          },
        },
        'themes.googleusercontent.com': {
          '.*': { proxy: 'google-themes.proxy.ustclug.org' },
        },
        'clients*.google.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
        'www.googleapis.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
        'lh*.googleusercontent.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
        // mapbox-node-binary.s3.amazonaws.com/sqlite3/v5.0.0/napi-v3-win32-x64.tar.gz
        '*.s3.1amazonaws1.com': {
          '/sqlite3/.*': {
            redirect: 'npm.taobao.org/mirrors',
          },
        },
        // 'packages.elastic.co': { '.*': { proxy: 'elastic.proxy.ustclug.org' } },
        // 'ppa.launchpad.net': { '.*': { proxy: 'launchpad.proxy.ustclug.org' } },
        // 'archive.cloudera.com': { '.*': { regexp: '/cdh5/.*', proxy: 'cloudera.proxy.ustclug.org' } },
        // 'downloads.lede-project.org': { '.*': { proxy: 'lede.proxy.ustclug.org' } },
        // 'downloads.openwrt.org': { '.*': { proxy: 'openwrt.proxy.ustclug.org' } },
        // 'secure.gravatar.com': { '.*': { proxy: 'gravatar.proxy.ustclug.org' } },

        // Pixiv站点所需SNI配置（结合预设IP中的配置，可直连访问Pixiv站点）
        '*.pixiv.net': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.pixiv.org': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.pximg.net': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.ads-pixiv.net': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.nikke-global.com': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        'i.pximg.net': {
          '.*': {
            cacheDays: 365,
            requestReplace: {
              headers: {
                referer: 'https://www.pixiv.net/',
              },
              desc: '篡改请求头\'Referer\'，使Pixiv图片链接可以单独在浏览器打开',
            },
          },
        },

        // YouTube
        '*.youtube.com': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.youtu.be': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.youtube-nocookie.com': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.ggpht.com': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        'i.ytimg.com': {
          '.*': {
            sni: 'baidu.com',
          },
        },

        // jsdelivr静态资源的拦截配置
        'cdn.jsdelivr.net': {
          '^/.*\\.(js|css|png|jpg|jpeg|gif|json)(\\?.*)?$': {
            proxy: 'fastly.jsdelivr.net',
            backup: [
              'gcore.jsdelivr.net',
            ],
          },
        },

        // 油猴脚本站
        '*.greasyfork.org': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.cn-greasyfork.org': {
          '.*': {
            sni: 'baidu.com',
          },
        },

        // huggingface：AI集成平台
        '*.huggingface.co': {
          '.*': {
            sni: 'huggingface.cn',
          },
        },

        // vueJS国内站点
        'cn.vuejs.org': {
          '.*': {
            sni: 'vuejs.org',
          },
        },

        // Z-lib相关
        '*z-library.sk': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },
        '*z-lib.help': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },

        // Steam相关
        '*.steamserver.net': {
          '.*': {
            sni: 'www.baidu.com',
            desc: 'steam登录不稳定？无法复现先这么写',
          },
        },
        'images.steamusercontent.com': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*steamcommunity.com': {
          '^(?!/discussions).*$': {
            sni: 'www.baidu.com',
            desc: '讨论区锁区,考虑不拦截丢给彩蛋',
          },
        },
        '^(?!.*cloudflare).*steamstatic.com$': {
          '.*': {
            sni: 'baidu.com',
            desc: 'steam社区数据不能也不需调整sni,直接直连',
          },
        },
        '*.steampowered.com': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },

        // DuckDuckGo相关
        'external-content.duckduckgo.com': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },
        '*duckduckgo.com': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },

        // OneDrive相关
        '*onedrive.live.com': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },

        // Dropbox相关
        '*dropbox.com': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },

        // f-droid相关
        '*f-droid.org': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },
        'fdroid.org': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },

        // apkmirrors相关
        '*apkmirror.com': {
          '.*': {
            sni: 'none',
          },
        },

        // DS_DOWNLOAD配置
        'jsd.proxy.aks.moe': {
          '^.*\\?DS_DOWNLOAD$': {
            requestReplace: { doDownload: true },
            responseReplace: { doDownload: true },
          },
        },
        'fastly.jsdelivr.net': {
          '^.*\\?DS_DOWNLOAD$': {
            requestReplace: { doDownload: true },
            responseReplace: { doDownload: true },
          },
        },
        'jsdelivr.pai233.top': {
          '^.*\\?DS_DOWNLOAD$': {
            requestReplace: { doDownload: true },
            responseReplace: { doDownload: true },
          },
        },
        'raw.incept.pw': {
          '^.*\\?DS_DOWNLOAD$': {
            requestReplace: { doDownload: true },
            responseReplace: { doDownload: true },
          },
        },

        // 其它站点
        '*.msecnd.net': {
          '.*': {
            sni: 'baidu.com',
          },
        },
        '*.instagram.com': {
          '.*': {
            sni: 'g.cn',
          },
        },
        '*.cdninstagram.com': {
          '.*': {
            sni: 'g.cn',
          },
        },
        '*.intercom.io': {
          '.*': {
            sni: 'g.cn',
          },
        },
        '*startpage.com': {
          '.*': {
            sni: 'www.baidu.com',
          },
        },

        // 广告拦截配置
        '*.carbonads.com': {
          '/carbon.*': {
            abort: true,
            desc: '广告拦截',
          },
        },
        '*.buysellads.com': {
          '/ads/.*': {
            abort: true,
            desc: '广告拦截',
          },
        },
      },
      // 预设置IP列表
      'preSetIpList': {
        'github.com': {
          '4.237.22.38': false,
          '20.26.156.215': false,
          '20.27.177.113': true,
          '20.87.245.0': false,
          '20.200.245.247': true,
          '20.201.28.151': false,
          '20.205.243.166': true,
          '140.82.113.3': false,
          '140.82.114.4': false,
          '140.82.116.3': false,
          '140.82.116.4': false,
          '140.82.121.3': false,
          '140.82.121.4': false,
        },
        'gist.github.com': {
          '20.27.177.113': true,
          '20.200.245.247': true,
          '20.205.243.166': false,
          '140.82.116.3': true,
          '140.82.116.4': true,
          '4.237.22.38': true,
        },
        'github.dev': {
          '20.43.185.14': true,
          '20.99.227.183': true,
          '51.137.3.17': true,
          '52.224.38.193': true,
        },
        'api.github.com': {
          '20.26.156.210': true,
          '20.27.177.116': true,
          '20.87.245.6': true,
          '20.200.245.245': true,
          '20.201.28.148': true,
          '20.205.243.168': true,
          '20.248.137.49': true,
          '140.82.112.5': true,
          '140.82.113.6': true,
          '140.82.116.6': true,
          '140.82.121.6': true,
        },
        'codeload.github.com': {
          '20.26.156.216': true,
          '20.27.177.114': true,
          '20.87.245.7': true,
          '20.200.245.246': true,
          '20.201.28.149': true,
          '20.205.243.165': true,
          '20.248.137.55': true,
          '140.82.113.9': true,
          '140.82.114.10': true,
          '140.82.116.10': true,
          '140.82.121.9': true,
        },
        '*.githubusercontent.com': {
          '146.75.92.133': true,
          '199.232.88.133': true,
          '199.232.144.133': true,
        },
        'viewscreen.githubusercontent.com': {
          '140.82.112.21': true,
          '140.82.112.22': true,
          '140.82.113.21': true,
          '140.82.113.22': true,
          '140.82.114.21': true,
          '140.82.114.22': true,
        },
        'github.io': {
          '185.199.108.153': true,
          '185.199.109.153': true,
          '185.199.110.153': true,
          '185.199.111.153': true,
        },
        '*.githubassets.com': {
          '185.199.108.154': true,
          '185.199.109.154': true,
          '185.199.110.154': true,
          '185.199.111.154': true,
        },
        '^(analytics|ghcc)\\.githubassets\\.com$': {
          '185.199.108.153': true,
          '185.199.110.153': true,
          '185.199.109.153': true,
          '185.199.111.153': true,
        },

        // Docker Hub
        'hub.docker.com': {
          '52.4.183.149': true,

          // 已失效的IP
          '44.221.37.199': null,
          '52.44.227.212': null,
          '54.156.14.194': null,
          '54.156.140.159': null,
          '54.208.73.48': null,
          '100.29.167.200': null,
        },
        'sessions-bugsnag.docker.com': {
          '54.156.14.194': true,
          '54.208.73.48': true,
          '100.29.167.200': true,

          // 已失效的IP
          '44.221.37.199': null,
          '52.44.227.212': null,
          '54.156.140.159': null,
        },

        // Pixiv
        '*.pixiv.net': {
        // 以下为 `cdn-origin.pixiv.net` 域名的IP
          '210.140.139.154': true,
          '210.140.139.157': true,
          '210.140.139.160': true,
        },
        'i.pximg.net': {
          '210.140.139.132': true,
          '210.140.139.137': true,
          '203.137.29.48': true,
          '210.140.139.134': true,
          '203.137.29.49': true,
          '210.140.139.133': true,
          '210.140.139.135': true,
          '203.137.29.47': true,
        },
        'a.pixiv.org': {
          '210.140.139.182': true,
          '210.140.139.183': true,
          '210.140.139.184': true,
        },
        'api.fanbox.cc': {
          '172.64.146.116': true,
        },
        '*.fanbox.cc': {
          '210.140.139.155': true,
        },

        // Google
        'fonts.googleapis.cn': {
          '120.253.255.34': true,
          '220.181.174.98': true,
          '114.250.67.34': true,
          '203.208.41.98': true,
          '220.181.174.162': true,
        },
        '^(aistudio|.*pa.clients6|apis).google.com$': {
          '8.137.102.117': {
            desc: 'AI Studio相关,阿里云,解锁地区限制',
          },
        },
        'scholar.googleusercontent.com': {
          '142.251.190.206': true,
          '172.217.204.206': true,
          '172.253.122.206': true,
        },
        '(*account*|scholar).google.com': {
          '172.217.204.206': true,
        },
        '^.*(with)?google(apis|usercontent)?.com.*$': {
          '8.137.102.117': {
            desc: '阿里云中转',
          },
          '142.251.189.206': {
            desc: '自动地区官方',
          },
        },
        '^.*(youtube.com|gstatic.com|youtube.nocookie.com|youtu.be|ggpht.com|i.ytimg.com|blogger.com|doodles.google|about.google|android.com)$': {
          '8.137.102.117': {
            desc: '阿里云中转',
          },
          '142.251.189.206': {
            desc: '自动地区官方',
          },
        },
        // "_google_backup":{
        // 	"8.137.102.117": {
        // 		"desc": "阿里云中转"
        // 	},
        // 	"47.102.115.14":"true",
        // 	"194.87.31.227":"true",
        // 	"136.124.0.28":"true",
        // 	"136.124.0.29":"true",
        // 	"34.49.133.3":"true",
        // 	"142.251.189.206":"true",
        // 	"142.251.190.206":"true",
        // 	"172.217.204.206":"true",
        // 	"172.253.122.206":"true",
        // 	"38.180.33.93":"true"
        // },

        // YouTube
        '*.youtube.com': {
          '8.137.102.117': true,
        },
        '*.youtu.be': {
          '8.137.102.117': true,
        },
        '*.youtube-nocookie.com': {
          '8.137.102.117': true,
        },
        '*.ggpht.com': {
          '8.137.102.117': true,
        },
        'i.ytimg.com': {
          '8.137.102.117': true,
        },
        '*.gstatic.com': {
          '8.137.102.117': true,
        },

        // Hugging Face
        '*.huggingface.co': {
          '3.167.200.113': true,
        },

        // Greasy Fork
        '*.greasyfork.org': {
          '96.126.98.220': true,
          '50.116.4.196': true,
        },
        '*.cn-greasyfork.org': {
          '96.126.98.220': true,
          '50.116.4.196': true,
        },
        '*.instagram.com': {
          '163.70.159.174': true,
          '57.144.144.34': true,
          '57.144.216.34': true,
          '157.240.229.174': true,
          '57.144.188.34': true,
          '157.240.210.174': true,
          '157.240.252.174': true,
          '102.132.97.174': true,
          '31.13.94.174': true,
          '31.13.85.174': true,
          '102.132.104.174': true,
        },
        '*.cdninstagram.com': {
          '57.144.152.192': true,
          '57.144.220.192': true,
          '57.144.216.192': true,
        },

        // z-lib
        '*z-library.sk': {
          '176.123.7.105': true,
        },
        '*z-lib.help': {
          '176.123.7.105': true,
        },

        // steam
        'community.cloudflare.steamstatic.com': {
          '104.18.42.105': true,
          '172.64.145.151': true,
        },
        '*.steamstatic.com': {
          '151.101.91.52': true,
          '146.75.47.52': true,
          '146.75.115.52': true,
          '151.101.111.52': true,
          '151.101.3.52': true,
          '151.101.195.52': true,
          '151.101.79.52': true,
          '151.101.67.52': true,
          '146.75.51.52': true,
        },
        'images.steamusercontent.com': {
          '23.2.16.208': true,
          '203.69.138.224': true,
          '23.54.155.102': true,
          '23.56.109.164': true,
          '184.30.148.77': true,
          '184.27.185.92': true,
          '23.40.43.24': true,
          '218.231.251.9': true,
          '23.216.145.139': true,
          '184.24.77.66': true,
          '23.46.10.70': true,
          '23.212.190.51': true,
          '104.77.160.215': true,
          '2.20.68.235': true,
          '95.101.24.216': true,
          '41.175.223.40': true,
          '23.207.202.198': true,
          '95.100.156.90': true,
        },
        'cdn.steamcommunity.com': {
          '23.221.227.5': true,
        },
        '*steamcommunity.com': {
          '23.194.234.100': true,
          '23.76.43.59': true,
          '184.84.187.165': true,
          '23.51.204.111': true,
        },
        'api.steampowered.com': {
          '23.216.236.253': true,
          '23.199.145.101': true,
          '104.68.46.176': true,
          '184.85.112.102': true,
          '23.36.106.129': true,
          '23.207.106.113': true,
          '23.5.250.50': true,
          '104.71.182.190': true,
        },
        'store.steampowered.com': {
          '23.46.197.62': true,
          '23.205.36.100': true,
          '23.202.181.219': true,
          '23.206.181.48': true,
          '23.219.73.99': true,
          '23.35.101.126': true,
          '104.99.49.179': true,
          '23.218.33.47': true,
        },
        'checkout.steampowered.com': {
          '23.58.97.230': true,
          '23.195.152.91': true,
          '23.196.173.177': true,
          '23.35.101.126': true,
          '23.54.153.177': true,
        },

        // DuckDuckGo
        'external-content.duckduckgo.com': {
          '20.43.160.189': true,
        },
        '*duckduckgo.com': {
          '20.43.161.105': true,
        },

        // OneDrive
        '*onedrive.live.com': {
          '13.107.42.13': true,
        },

        // Dropbox
        '*dropbox.com': {
          '162.125.248.18': true,
        },

        // f-droid
        'forum.f-droid.org': {
          '37.218.242.53': true,
        },
        '*f-droid.org': {
          '37.218.243.72': true,
        },
        'fdroid.org': {
          '37.218.243.72': true,
        },

        // apkmirror
        '*apkmirror.com': {
          '104.17.67.215': true,
        },

        // startpage
        '*startpage.com': {
          '67.63.58.139': true,
        },

        // 其它
        'cdn.jsdelivr.net': {
          '104.16.89.20': true,
        },
      },
      'dns': {
        providers: {
          'cf-DoT': {
            server: 'tls://1.1.1.1',
            sni: 'baidu.com',
            cacheSize: 1000,
          },
          'cf-DoH': {
            server: 'https://cloudflare-dns.com/dns-query',
            sni: 'baidu.com',
            cacheSize: 1000,
          },
          'Google-DoH': {
            server: 'https://dns.google/dns-query',
            sni: 'www.google.cn',
            cacheSize: 1000,
            desc: '不可用',
          },
        },
        mapping: {
          '*.jetbrains.com': 'cf-DoT',
          '*.azureedge.net': 'cf-DoT',
          '*.stackoverflow.com': 'cf-DoT',
          '*.github.com': 'cf-DoT',
          '*github*.com': 'cf-DoT',
          '*.github.io': 'cf-DoT',
          '*.docker.com': 'cf-DoT',
          '*.electronjs.org': 'cf-DoT',
          '*.amazonaws.com': 'cf-DoT',
          '*.yarnpkg.com': 'cf-DoT',
          '*.cloudfront.net': 'cf-DoT',
          '*.cloudflare.com': 'cf-DoT',
          'img.shields.io': 'cf-DoT',
          '*.vuepress.vuejs.org': 'cf-DoT',
          '*.gh.docmirror.top': 'cf-DoT',
          '*.v2ex.com': 'cf-DoT',
          '*.pypi.org': 'cf-DoT',

          // Pixiv站点相关
          '*.pixiv.org': 'cf-DoT',
          '*.pximg.net': 'cf-DoT',
          '*.onesignal.com': 'cf-DoT',

          '*.iubenda.com': 'cf-DoT',
        },
        speedTest: {
          enabled: true,
          interval: 300000,
          hostnameList: ['github.com'],
          dnsProviders: ['cloudflare', 'safe360', 'rubyfish'],
        },
        whiteList: {
          '*.cn': true,
          '*china*': true,
          '*.dingtalk.com': true,
          '*.apple.com': true,
          '*.microsoft.com': true,
          '*.alipay.com': true,
          '*.qq.com': true,
          '*.baidu.com': true,
          '*.icloud.com': true,
          '*.lenovo.net': true,

          // 本地
          'localhost': true,
          '127.*.*.*': true,
          '192.168.*.*': true,
        },
      },
    },
    proxy: {
      excludeDomesticDomainAllowList: true,
      autoUpdateDomesticDomainAllowList: true,
      remoteDomesticDomainAllowListFileUrl: 'https://xget.xi-xu.me/gh/pluwen/china-domain-allowlist/raw/main/allow-list.sorl',
      excludeIpList: {
        // Github文件上传所使用的域名，被DS代理会导致文件上传经常失败，从系统代理中排除掉
        'objects-origin.githubusercontent.com': true,
        // Github下载release文件的高速镜像地址
        '*.ghproxy.net': true,
        '*.ghp.ci': true,
        '*.kkgithub.com': true,
        '*.dgithub.xyz': true,

        // Github建站域名
        'pages.github.com': true,

        // Github帮助、文档页
        'help.github.com': true,
        'docs.github.com': true,

        // Github部分未被GFW拦截的域名
        '*.github.blog': true,
        'analytics.githubassets.com': true,
        'ghcc.githubassets.com': true,

        // DockerHub站点相关
        'www.docker.com': true,
        'login.docker.com': true,
        'api.dso.docker.com': true,
        'desktop.docker.com': true,
        'docs.docker.com': true,

        // 微软
        '*.s-microsoft.com': true,
        '*.xboxlive.com': true,

        // 米哈游
        '*.mihoyo.com': true,

        // Elastic相关
        '*.elastic.co': true,

        // bilibili相关
        '*.bilicomic.com': true,

        // 中国移动云盘登录API
        '[2049:8c54:813:10c::140]': true,
        '[2409:8a0c:a442:ff40:a51f:4b9c:8b41:25ea]': true,
        '[2606:2800:147:120f:30c:1ba0:fc6:265a]': true,
        // 移动云盘相关
        '*.cmicapm.com': true,

        // cloudflare：排除以下域名，cloudflare的人机校验会更快，成功率更高。
        '*.cloudflare-cn.com': true,

        // VS相关
        '*.microsoftonline.com': true, // 此域名不排除的话，部分功能将出现异常
        '*.msedge.net': true,

        // 卡巴斯基升级域名
        '*kaspersky*.com': true,
        '*.upd.kaspersky.com': true,

        // 蓝湖
        '*.lanhuapp.com': true,
        '*.soboten.com': true,

        // sandbox沙盒域名
        '*.sandboxie-plus.com': true,

        // 无忧论坛
        '*.wuyou.net': true,

        // python建图包域名（浏览器）
        '*.pyecharts.org': true,

        // 教育网站
        '*.bcloudlink.com': true,

        // 奇迹秀（资源）
        '*.qijishow.com': true,

        // Z-Library
        '*.z-lib.fo': true,

        // Finalshell（Linux学习网）
        '*.finalshell.com': true,

        // MineBBS（我的世界中文论坛）
        '*.minebbs.com': true,

        // 我的世界插件网
        '*.spigotmc.org': true,

        // bd测试
        '*.virustotal.com': true,

        // Gitlab
        '*.gitlab.com': true,

        // DeepSeek
        '*.deepseek.com': true,

        // Steam第三方库存助手
        '*steaminventoryhelper.com': true,

        // 未知
        '*.youdemai.com': true,
        '*.casualthink.com': true,
        '44.239.165.12': true,
        '3.164.110.117': true,

        // 移除配置
        'cn.*': null,
        'challenges.cloudflare.com': null,
      },
    },
    plugin: {
      overwall: {
        serverDefault: {
          'ow-prod.docmirror.top': {
            port: 443,
            path: 'X2dvX292ZXJfd2FsbF8',
            password: 'dev_sidecar_is_666',
          },
        },
        targets: {
          '*.github.com': true,
          '*github*.com': true,
          '*.wikimedia.org': true,
          '*.v2ex.com': true,
          '*.azureedge.net': true,
          '*.cloudfront.net': true,
          '*.bing.com': true,
          '*.discourse-cdn.com': true,
          '*.gravatar.com': true,
          '*.docker.com': true,
          '*.vueuse.org': true,
          '*.elastic.co': true,
          '*.optimizely.com': true,
          '*.stackpathcdn.com': true,
          '*.fastly.net': true,
          '*.cloudflare.com': true,
          '*.233v2.com': true,
          '*.v2fly.org': true,
          '*.telegram.org': true,
          '*.amazon.com': true,
          '*.googleapis.com': true,
          '*.google-analytics.com': true,
          '*.cloudflareinsights.com': true,
          '*.intlify.dev': true,
          '*.segment.io': true,
          '*.shields.io': true,
          '*.jsdelivr.net': true,
          '*.gitbook.io': true,
          '*.nodejs.org': true,
          '*.npmjs.com': true,
          '*.z-library.sk': true,
          '*.zlibrary*.se': true,

          // 维基百科
          '*.wikipedia-on-ipfs.org': true,

          // ChatGPT
          '*.chatgpt.com': false, // 不再支持ChatGPT，二层代理服务的IP似乎被该站点拉黑了
          '*.oaiusercontent.com': true, // 在ChatGPT中生成文件并下载所需的域名

          // 大模型托管站
          '*.huggingface.co': true,

          // Pixiv相关
          '*.pixiv.org': true,
          '*.fanbox.cc': true,
          '*.onesignal.com': true, // pixiv站点，会加载该域名下的js脚本

          // 油猴脚本网站
          '*.greasyfork.org': true,
          '*.cn-greasyfork.org': true,
        },
        pac: {
          enabled: true,
          autoUpdate: true,
          // 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt'
          pacFileUpdateUrl: 'https://xget.xi-xu.me/gh/gfwlist/gfwlist/raw/master/gfwlist.txt',
          pacFileAbsolutePath: null, // 自定义 pac.txt 文件位置，可以是本地文件路径
          pacFilePath: './extra/pac/pac.txt', // 内置 pac.txt 文件路径
        },
      },
      free_eye: {
        Route: {
          timeout: 0.1,
          addrs: {
            IPv4: '8.8.8.8',
            IPv6: '2001:4860:4860::8888',
          },
          port: 53,
        },
        DNS: {
          timeout: 3,
          allow: ['baidu.cn', 'taobao.com', 'www.gov.cn'],
          block: ['wikipedia.org', 'youtube.com', 'facebook.com'],
        },
        TCP: {
          timeout: 3,
          addrs: {
            IPv4: {
              allow: ['114.114.114.114', '223.6.6.6'],
              block: ['8.8.8.8', '1.1.1.1'],
            },
            IPv6: {
              allow: ['2402:4e00::', '2400:3200:baba::1'],
              block: ['2001:4860:4860::8888', '2606:4700:4700::1111'],
            },
          },
          ports: [80, 443],
        },
        TLS: {
          timeout: 3,
          addrs: {
            IPv4: '172.67.148.147',
            IPv6: '2606:4700:3036::ac43:9493',
          },
          snis: {
            allow: 'baidu.cn',
            block: 'wikipedia.org',
          },
        },
      },
    },
    help: {
      dataList: [
        {
          title: '查看DevSidecar的说明文档（Wiki）',
          url: 'https://github.com/docmirror/dev-sidecar/wiki',
        },
        {
          title: '为了展示更多帮助信息，请启用 “远程配置” 功能！！！',
        },
      ],
    },
  },
}

// 从本地文件中加载配置
defaultConfig.configFromFiles = configLoader.getConfigFromFiles(configLoader.getUserConfig(), defaultConfig)

module.exports = defaultConfig

/**
 * FreeEye 网络检测插件默认配置。
 *
 * 测试用例 (Route/DNS/TCP/TLS) 的具体参数定义在 `setting.config` 中，
 * 用户可在 `~/.dev-sidecar/config.json` 的 `plugin.free_eye.setting.config`
 * 路径下按需覆盖。
 */
const defaultTimeout = 3

const defaultTestConfig = {
  // ---- Route 测试：探测 IPv4/IPv6 路由可达性 ----
  Route: {
    timeout: defaultTimeout,
    addrs: {
      IPv4: '8.8.8.8',
      IPv6: '2001:4860:4860::8888',
    },
    port: 53,
  },

  // ---- DNS 测试：检测 DNS 劫持 / 污染 ----
  DNS: {
    timeout: defaultTimeout,
    allow: [
      'baidu.com',
      'google.com',
    ],
    block: [
      'google.com',
      'twitter.com',
      'facebook.com',
      'youtube.com',
    ],
  },

  // ---- TCP 测试：检测 TCP 阻断 ----
  TCP: {
    timeout: defaultTimeout,
    ports: [80, 443],
    addrs: {
      IPv4: {
        allow: ['8.8.8.8'],
        block: ['142.250.80.4'],
      },
      IPv6: {
        allow: ['2001:4860:4860::8888'],
        block: ['2607:f8b0:4005:0809:0000:0000:0000:200e'],
      },
    },
  },

  // ---- TLS 测试：检测 TLS SNI 阻断 / 分片绕过 ----
  TLS: {
    timeout: defaultTimeout,
    addrs: {
      IPv4: '8.8.8.8',
      IPv6: '2001:4860:4860::8888',
    },
    snis: {
      allow: 'google.com',
      block: 'twitter.com',
    },
  },
}

export default {
  name: '网络检测',
  statusOff: true,
  enabled: false,
  tip: '运行网络检测来评估当前网络环境',
  setting: {
    testsDir: 'checkpoints',
    config: defaultTestConfig,
  },
}

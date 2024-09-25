const request = require('request')
const HttpsAgent = require('@docmirror/mitmproxy/src/lib/proxy/common/ProxyHttpsAgent')

const options = {
  url: 'https://raw.githubusercontent.com/docmirror/dev-sidecar/refs/heads/master/packages/core/src/config/remote_config.json5',
  // url: 'https://gitee.com/wangliang181230/dev-sidecar/raw/docmirror/packages/core/src/config/remote_config.json5',
  servername: 'baidu.com',
  agent: new HttpsAgent({
    keepAlive: true,
    timeout: 20000,
    keepAliveTimeout: 30000,
    rejectUnauthorized: false
  })
}
if (options.agent.options) {
  options.agent.options.rejectUnauthorized = false
  console.info('options.agent.options.rejectUnauthorized = false')
}

request(options, (error, response, body) => {
  console.info('error:', error,
    '\n---------------------------------------------------------------------------\n' +
    'response:', response,
    '\n---------------------------------------------------------------------------\n' +
    'body:', body)
})

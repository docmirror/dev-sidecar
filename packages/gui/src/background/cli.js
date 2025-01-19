import DevSidecar from '@docmirror/dev-sidecar'
import { getExtraPath, mitmproxyPath } from './config'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import cac from 'cac'

const cli = cac('dev-sidecar')
const pk = require('../../package.json')

async function startup () {
  console.log('启动 DevSidecar 服务')
  const config = DevSidecar.api.config.get()

  if (config.server.pid) {
    process.kill(config.server.pid, os.constants.signals.SIGINT)
    config.server.pid = null
    DevSidecar.api.config.save(config)
  }

  // 开启自动下载远程配置
  await DevSidecar.api.config.startAutoDownloadRemoteConfig()

  const { server } = await DevSidecar.api.server.start({
    mitmproxyPath,
    options: {
      stdio: 'ignore',
    },
  })

  // 写入server进程pid
  config.server.pid = server.id
  DevSidecar.api.config.save(config)
}

async function stop () {
  console.log('关闭 DevSidecar 服务')
  const config = DevSidecar.api.config.get()

  if (config.server.pid) {
    process.kill(config.server.pid, os.constants.signals.SIGINT)
    config.server.pid = null
    DevSidecar.api.config.save(config)
  }
}

async function restart () {
  console.log('重启 DevSidecar 服务')
  const config = DevSidecar.api.config.get()

  if (config.server.pid) {
    process.kill(config.server.pid, 'SIGINT')
  }

  await startup()
}

const banner = fs.readFileSync(path.join(getExtraPath(), 'banner.txt'))
console.log(banner.toString())

cli
  .help()
  .usage('start')
  .version(pk.version)

cli
  .command('start', '启动 DevSidecar 服务')
  .action(async () => {
    await startup()
    process.exit(0)
  })

cli
  .command('stop', '关闭 DevSidecar 服务')
  .action(stop)

cli
  .command('restart', '重启 DevSidecar 服务')
  .action(restart)

cli.parse()

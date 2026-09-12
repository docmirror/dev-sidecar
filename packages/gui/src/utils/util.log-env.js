// 必须在加载 core/mitmproxy 日志模块之前 import，确保 DEV_SIDECAR_LOG_DISABLED 尽早生效
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function readUserConfig () {
  const userBase = path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
  const newFilePath = path.join(userBase, 'config.json')
  const oldFilePath = path.join(userBase, 'config.json5')
  // 与 core 的 local-config-loader 一致：优先新路径，不存在时回退 json5
  const configPath = fs.existsSync(newFilePath) ? newFilePath : oldFilePath
  if (!fs.existsSync(configPath)) {
    return null
  }
  const raw = fs.readFileSync(configPath, 'utf-8')
  try {
    return JSON.parse(raw)
  } catch {
    // json5 配置：使用 mitmproxy 同款解析器
    try {
      const jsonApi = require('@docmirror/mitmproxy/src/json')
      return jsonApi.parse(raw)
    } catch {
      return null
    }
  }
}

if (process.env.DEV_SIDECAR_LOG_DISABLED !== 'true') {
  try {
    const userConfig = readUserConfig()
    if (userConfig && userConfig.app && userConfig.app.logDisabled === true) {
      process.env.DEV_SIDECAR_LOG_DISABLED = 'true'
    }
  } catch {
    // 配置文件不存在或格式异常时，按默认（允许日志）处理
  }
}

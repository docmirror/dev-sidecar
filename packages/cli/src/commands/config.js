const fs = require('node:fs')
const path = require('node:path')

function getUserBase () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
}

function readRemoteConfigStr (configLoader, suffix) {
  const file = configLoader.getRemoteConfigPath(suffix)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
}

/**
 * 重新下载「用户在配置里指定地址」的远程配置（共享 + 个人），并写回 ~/.dev-sidecar。
 *
 * 与 GUI 的「重新拉取远程配置」等价：
 * - 地址取自 config.json 的 app.remoteConfig.url / personalUrl（enabled 为 false 时不下载）；
 * - 加载与下载都复用 core 的实现（config-api），因此优先级顺序、裸 HTTP 改写、超时保护都与 GUI 一致；
 * - 不自动重启：正在运行的守护进程仍持有旧配置，由用户执行 `ds-cli restart` 使其生效。
 *
 * @returns {Promise<number>} 进程退出码（0 成功，1 失败或未配置）
 */
async function updateRemoteConfig () {
  const configApi = require('@blue-frontier/dev-sidecar/src/config-api.js')
  const configLoader = require('@blue-frontier/dev-sidecar/src/config/local-config-loader')

  // 与 GUI 相同的加载路径：用户 config.json + 共享/个人远程配置 + 内置配置，按 core 的优先级合并
  const allConfig = configApi.reload()
  const remoteConfig = (allConfig && allConfig.app && allConfig.app.remoteConfig) || {}

  if (remoteConfig.enabled !== true) {
    console.log('远程配置已关闭（app.remoteConfig.enabled != true），未下载任何内容。')
    console.log(`如需启用，请编辑 ${path.join(getUserBase(), 'config.json')} 里的 app.remoteConfig。`)
    return 1
  }
  if (!remoteConfig.url && !remoteConfig.personalUrl) {
    console.log('未配置远程配置地址（app.remoteConfig.url 与 personalUrl 均为空），无可下载内容。')
    return 1
  }

  console.log(`共享远程配置: ${remoteConfig.url || '(未配置)'}`)
  console.log(`个人远程配置: ${remoteConfig.personalUrl || '(未配置)'}`)
  console.log('开始下载...')

  const before = {
    shared: readRemoteConfigStr(configLoader, ''),
    personal: readRemoteConfigStr(configLoader, '_personal'),
  }

  let updated
  try {
    updated = await configApi.downloadRemoteConfig()
  } catch (e) {
    console.error(`下载远程配置失败：${(e && e.message) || e}`)
    console.error('已保留本地缓存的远程配置，可继续使用。')
    return 1
  }

  const changed = before.shared !== readRemoteConfigStr(configLoader, '') ||
    before.personal !== readRemoteConfigStr(configLoader, '_personal')

  if (updated || changed) {
    console.log(`远程配置已更新并保存到 ${getUserBase()}`)
  } else {
    console.log('远程配置没有变化（与本地缓存一致），未做写入。')
  }
  console.log('提示：正在运行的 CLI 守护进程仍在用旧配置，执行 `ds-cli restart` 后生效。')
  return 0
}

module.exports = { updateRemoteConfig }
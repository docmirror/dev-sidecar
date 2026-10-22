import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import AdmZip from 'adm-zip'
import request from 'request'
import electron from '../../electron.js'
import log from '../../utils/util.log.gui.js'

const require = createRequire(import.meta.url)
const pkg = require('../../../package.json')

const DS_DIR = path.join(os.homedir(), '.dev-sidecar')
const LOGS_DIR = path.join(DS_DIR, 'logs')
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_TOTAL_SIZE = 60 * 1024 * 1024

// 只做轻量脱敏：保留 URL 便于排查，打码凭据类字段
const SENSITIVE_RULES = [
  [/((?:proxy-)?authorization\s*[:=]\s*)\S+/gi, '$1***'],
  [/((?:set-)?cookie\s*[:=]\s*).*/gi, '$1***'],
  [/([?&](?:token|password|passwd|pwd|secret|key|auth|signature|sig|access_token)=)[^&\s]+/gi, '$1***'],
  [/((?:password|passwd|privateKey|private_key|token|secret)\s*[:=]\s*)\S+/gi, '$1***'],
]

function redact (text) {
  let s = String(text)
  for (const [re, replacement] of SENSITIVE_RULES) {
    s = s.replace(re, replacement)
  }
  return s
}

function timestampName (date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())} Logs.zip`
}

function createBundle (targetDir) {
  const dir = targetDir || electron.app.getPath('downloads')
  fs.mkdirSync(dir, { recursive: true })
  const zipPath = path.join(dir, timestampName())
  const zip = new AdmZip()
  let total = 0
  let logCount = 0

  if (fs.existsSync(LOGS_DIR)) {
    for (const name of fs.readdirSync(LOGS_DIR)) {
      const filePath = path.join(LOGS_DIR, name)
      let stat
      try {
        stat = fs.statSync(filePath)
      } catch {
        continue
      }
      if (!stat.isFile() || stat.size > MAX_FILE_SIZE || total + stat.size > MAX_TOTAL_SIZE) {
        continue
      }
      zip.addFile(`logs/${name}`, Buffer.from(redact(fs.readFileSync(filePath, 'utf8'))))
      total += stat.size
      logCount++
    }
  }

  const runningPath = path.join(DS_DIR, 'running.json')
  if (fs.existsSync(runningPath)) {
    try {
      zip.addFile('running.json', Buffer.from(redact(fs.readFileSync(runningPath, 'utf8'))))
    } catch (e) {
      log.warn('读取 running.json 失败:', e)
    }
  }

  zip.addFile('meta.json', Buffer.from(JSON.stringify({
    appVersion: pkg.version,
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node,
    createdAt: new Date().toISOString(),
  }, null, 2)))

  zip.writeZip(zipPath)
  log.info('已生成反馈日志包:', zipPath, ', 日志文件数:', logCount)
  return { zipPath, logCount }
}

function uploadBundle (zipPath) {
  return new Promise((resolve) => {
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
    request.post({
      url: 'https://0x0.st',
      formData: { file: fs.createReadStream(zipPath) },
      proxy: proxy || undefined,
      timeout: 30000,
      gzip: true,
    }, (error, response, body) => {
      if (error || response == null || response.statusCode !== 200) {
        log.warn('日志包自动上传失败:', error == null ? `HTTP ${response && response.statusCode}` : error.message)
        resolve(null)
        return
      }
      const url = String(body).trim()
      resolve(/^https?:\/\//.test(url) ? url : null)
    })
  })
}

function buildIssueUrl ({ zipPath, uploadUrl, description }) {
  const title = `[反馈] ${description && description.trim() ? description.trim() : '问题反馈'}`
  const attachment = uploadUrl
    ? `日志与运行参数已自动上传：${uploadUrl}`
    : `日志压缩包已生成：${zipPath}\n\n请把该文件拖到下面的输入框上传（GitHub 不允许通过链接自动附加文件）。`
  const body = [
    '### Ⅰ. 请说明操作系统及DS的版本号：',
    '',
    `1. 操作系统：${process.platform} ${process.arch}`,
    `2. DS版本号：${pkg.version}`,
    '',
    '### Ⅱ. 问题描述：',
    '',
    description && description.trim() ? description.trim() : '（请在这里补充问题描述）',
    '',
    '### Ⅲ. 期望的结果：',
    '',
    '',
    '### Ⅳ. 如何复现问题？',
    '',
    '',
    '### Ⅴ. 附件：',
    '',
    attachment,
    '',
    '> 压缩包内已对 token / password / authorization 等字段做打码处理，仍建议上传前确认没有隐私信息。',
  ].join('\n')

  return `https://github.com/docmirror/dev-sidecar/issues/new?title=${encodeURIComponent(title)
  }&body=${encodeURIComponent(body)}&labels=${encodeURIComponent('Bug')}`
}

async function report (options = {}) {
  const { targetDir, description = '', upload = true } = options
  const bundle = createBundle(targetDir)
  const uploadUrl = upload ? await uploadBundle(bundle.zipPath) : null
  const issueUrl = buildIssueUrl({ ...bundle, uploadUrl, description })
  await electron.shell.openExternal(issueUrl)
  return { ...bundle, uploadUrl, issueUrl }
}

const feedbackApi = {
  report,
  createBundle,
  install ({ ipcMain, log: logger }) {
    ipcMain.handle('feedback', async (event, message = {}) => {
      logger.info('反馈：开始打包日志并打开 issue')
      return report(message)
    })
  },
}

export default feedbackApi

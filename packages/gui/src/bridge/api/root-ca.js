import fs from 'node:fs'
import { execFile } from 'node:child_process'

/**
 * 根证书的打开与安装。
 *
 * 为什么单独抽出来：`shell.openPath` 失败时只返回一句错误文本（例如 "Failed to open path"），
 * 以前界面把它丢掉了，于是证书文件不存在时表现为「点一下、什么都不发生」，
 * 而且照样把证书标成已安装。这里统一返回 { ok, path, error }，调用方必须看结果。
 */

/** 用系统默认程序打开文件（filePath 由调用方注入 shell.openPath） */
export async function openFile (target, openPath) {
  if (!fs.existsSync(target)) {
    return { ok: false, path: target, error: '文件不存在' }
  }
  const error = await openPath(target)
  if (error) {
    return { ok: false, path: target, error }
  }
  return { ok: true, path: target, error: null }
}

/**
 * 把根证书装进「当前用户」的根存储。
 * Windows 用 certutil（不需要管理员，系统会弹一次安全警告）；其他平台仍走打开文件。
 */
export async function installRootCa (target, options = {}) {
  const {
    openPath,
    platform = process.platform,
    run = runCertutil,
  } = options

  if (!fs.existsSync(target)) {
    return { ok: false, path: target, error: '证书文件不存在' }
  }
  if (platform !== 'win32') {
    return openFile(target, openPath)
  }

  const { code, detail } = await run(['-addstore', '-user', 'Root', target])
  if (code === 0) {
    return { ok: true, path: target, error: null, detail }
  }
  return { ok: false, path: target, error: describeCertutilCode(code), detail }
}

/** 运行 certutil。输出在中文系统上是本地编码，故只取退出码，不解析文本 */
export function runCertutil (args) {
  return new Promise((resolve) => {
    execFile('certutil.exe', args, { windowsHide: true }, (err, stdout, stderr) => {
      resolve({
        code: err ? err.code : 0,
        detail: String(stderr || stdout || '').trim(),
      })
    })
  })
}

/** certutil 的失败原因（按 HRESULT 判断，避免依赖本地化输出） */
export function describeCertutilCode (code) {
  if (code === -2147023673 || code === 0x800704C7) {
    return '已取消安装'
  }
  if (code === -2147024894 || code === 0x80070002) {
    return '证书文件不存在'
  }
  if (code === -2147024891 || code === 0x80070005) {
    return '没有权限'
  }
  if (typeof code === 'number') {
    return `certutil 失败（0x${(code >>> 0).toString(16)}）`
  }
  return 'certutil 调用失败'
}

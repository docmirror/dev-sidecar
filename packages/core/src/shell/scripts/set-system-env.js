/**
 * 设置环境变量
 * - Windows: HKCU\Environment + WM_SETTINGCHANGE 广播
 * - macOS:   launchctl setenv（会话立即生效）+ LaunchAgent（重启后恢复）
 * - Linux:   systemd user environment.d（有 systemd 时）+ shell profile 兜底
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const Registry = require('winreg')
const Shell = require('../shell')
const log = require('../../utils/util.log.core')

const execute = Shell.execute

const MAC_LAUNCH_AGENT_LABEL = 'com.docmirror.dev-sidecar.env'
const POSIX_MARKER_START = '# >>> dev-sidecar env >>>'
const POSIX_MARKER_END = '# <<< dev-sidecar env <<<'

function injectProcessEnv (list) {
  for (const item of list) {
    if (item.value == null) {
      delete process.env[item.key]
    } else {
      process.env[item.key] = String(item.value)
    }
  }
}

function execFileAsync (file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr
        reject(error)
      } else {
        resolve(stdout || '')
      }
    })
  })
}

function escapeXml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// macOS: launchctl + LaunchAgent
// ---------------------------------------------------------------------------

function macLaunchAgentPlistPath () {
  return path.join(os.homedir(), 'Library/LaunchAgents', `${MAC_LAUNCH_AGENT_LABEL}.plist`)
}

function buildMacLaunchAgentPlist (list) {
  // 登录时由该 Agent 执行 launchctl setenv，把变量写入用户 launchd 域
  // （EnvironmentVariables 只作用于 agent 自身，不能给全会话用）
  const commands = list
    .filter(item => item.value != null)
    .map((item) => {
      const value = String(item.value).replace(/'/g, `'\\''`)
      return `/bin/launchctl setenv ${item.key} '${value}'`
    })
  const script = commands.length > 0 ? commands.join('; ') : '/bin/true'

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${MAC_LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>${escapeXml(script)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
`
}

async function applyMacEnv (list) {
  const results = { launchctl: [], launchAgent: null }

  // 1) 立即写入当前用户 launchd 域：之后新启动的 GUI/多数进程可继承
  for (const item of list) {
    if (item.value == null) {
      await execFileAsync('launchctl', ['unsetenv', item.key])
      results.launchctl.push({ key: item.key, action: 'unsetenv' })
    } else {
      await execFileAsync('launchctl', ['setenv', item.key, String(item.value)])
      results.launchctl.push({ key: item.key, action: 'setenv' })
    }
  }

  // 2) LaunchAgent 持久化：重启/重新登录后由 launchd 自动加载
  const plistPath = macLaunchAgentPlistPath()
  fs.mkdirSync(path.dirname(plistPath), { recursive: true })
  fs.writeFileSync(plistPath, buildMacLaunchAgentPlist(list), 'utf-8')
  results.launchAgent = plistPath

  try {
    await execFileAsync('launchctl', ['unload', '-w', plistPath])
  } catch {
    // 尚未加载时 unload 可能失败，忽略
  }
  await execFileAsync('launchctl', ['load', '-w', plistPath])

  injectProcessEnv(list)
  return results
}

async function removeMacEnv (keys) {
  for (const key of keys) {
    try {
      await execFileAsync('launchctl', ['unsetenv', key])
    } catch {
      // ignore
    }
  }
  const plistPath = macLaunchAgentPlistPath()
  if (fs.existsSync(plistPath)) {
    try {
      await execFileAsync('launchctl', ['unload', '-w', plistPath])
    } catch {
      // ignore
    }
    try {
      fs.unlinkSync(plistPath)
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Linux: systemd environment.d 优先，否则 shell profile
// ---------------------------------------------------------------------------

function detectShellProfilePath () {
  const home = os.homedir()
  const shellName = path.basename(process.env.SHELL || '').toLowerCase()

  if (shellName === 'zsh') {
    return path.join(home, '.zshrc')
  }
  if (shellName === 'bash') {
    const bashrc = path.join(home, '.bashrc')
    return fs.existsSync(bashrc) ? bashrc : path.join(home, '.profile')
  }
  if (shellName === 'fish') {
    return path.join(home, '.config/fish/conf.d/dev-sidecar.fish')
  }
  if (shellName === 'ksh') {
    return path.join(home, '.kshrc')
  }
  const profile = path.join(home, '.profile')
  return fs.existsSync(profile) ? profile : path.join(home, '.bashrc')
}

function quoteShellValue (value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function stripManagedBlock (content) {
  const start = content.indexOf(POSIX_MARKER_START)
  if (start < 0) {
    return content
  }
  const end = content.indexOf(POSIX_MARKER_END, start)
  if (end < 0) {
    return content.slice(0, start).replace(/\n+$/, '\n')
  }
  const after = content.slice(end + POSIX_MARKER_END.length).replace(/^\n/, '')
  return content.slice(0, start).replace(/\n+$/, '\n') + after
}

function writeLinuxShellProfile (list) {
  const profilePath = detectShellProfilePath()
  const isFish = profilePath.endsWith('.fish')
  fs.mkdirSync(path.dirname(profilePath), { recursive: true })

  let original = ''
  if (fs.existsSync(profilePath)) {
    original = fs.readFileSync(profilePath, 'utf-8')
  }
  const cleaned = stripManagedBlock(original)

  const lines = isFish
    ? list.map((item) => {
        if (item.value == null) {
          return `set -e ${item.key}`
        }
        return `set -gx ${item.key} ${quoteShellValue(item.value)}`
      })
    : list.map((item) => {
        if (item.value == null) {
          return `unset ${item.key}`
        }
        return `export ${item.key}=${quoteShellValue(item.value)}`
      })

  const block = [
    '',
    POSIX_MARKER_START,
    '# managed by dev-sidecar, do not edit this block manually',
    ...lines,
    POSIX_MARKER_END,
    '',
  ].join('\n')

  const next = cleaned.endsWith('\n') || cleaned === '' ? `${cleaned}${block}` : `${cleaned}\n${block}`
  fs.writeFileSync(profilePath, next, 'utf-8')
  return profilePath
}

function writeLinuxEnvironmentD (list) {
  const confDir = path.join(os.homedir(), '.config/environment.d')
  const confPath = path.join(confDir, '90-dev-sidecar.conf')
  fs.mkdirSync(confDir, { recursive: true })

  // systemd environment.d：KEY=value，无 export；重启/新 user session 生效
  const lines = list.map((item) => {
    if (item.value == null) {
      // 空值在 environment.d 无法 unset，写空字符串近似
      return `${item.key}=`
    }
    // 简单转义：值中空格/引号用双引号
    const value = String(item.value)
    if (/[\s"'\\$]/.test(value)) {
      return `${item.key}="${value.replace(/(["\\$])/g, '\\$1')}"`
    }
    return `${item.key}=${value}`
  })

  const content = [
    '# Managed by dev-sidecar. systemd user environment.d',
    ...lines,
    '',
  ].join('\n')
  fs.writeFileSync(confPath, content, 'utf-8')
  return confPath
}

function hasSystemdUserSession () {
  return process.platform === 'linux' && !!process.env.XDG_RUNTIME_DIR && process.env.XDG_RUNTIME_DIR.startsWith('/run/user/')
}

// ---------------------------------------------------------------------------

const executor = {
  async windows (exec, { list }) {
    const regKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Environment',
    })

    const setItem = (item) => {
      const value = item.value == null ? '' : String(item.value)
      return new Promise((resolve, reject) => {
        regKey.set(item.key, Registry.REG_SZ, value, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }

    try {
      for (const item of list) {
        await setItem(item)
      }

      // 广播环境变量变更（setx 一个临时值触发 WM_SETTINGCHANGE）
      try {
        await exec('setx DS_REFRESH "1"', { type: 'cmd' })
      } catch {
        // 广播失败不影响主流程
      }

      let envUpdateError = null
      try {
        injectProcessEnv(list)
      } catch (e) {
        envUpdateError = e.message || String(e)
      }

      return { success: true, scope: 'User:winreg', envUpdateError }
    } catch (e) {
      return { success: false, error: 'Failed to set environment variables', details: e.message || String(e) }
    }
  },

  async linux (exec, { list }) {
    try {
      const applied = []
      let primaryPath = null

      if (hasSystemdUserSession()) {
        primaryPath = writeLinuxEnvironmentD(list)
        applied.push(`systemd-environment.d:${primaryPath}`)
        try {
          // 尽量让当前 systemd user 立刻重载；失败不影响写入
          await execFileAsync('systemctl', ['--user', 'daemon-reload'])
        } catch {
          // ignore
        }
      }

      // shell profile 兜底：无 systemd 会话 / 终端内 npm 等场景仍需要
      const profilePath = writeLinuxShellProfile(list)
      applied.push(`shell-profile:${profilePath}`)

      injectProcessEnv(list)
      log.info(`Linux 环境变量已写入: ${applied.join(', ')}（当前进程已生效）`)
      return { success: true, scope: applied.join('|'), primaryPath }
    } catch (e) {
      return { success: false, error: 'Failed to set environment variables', details: e.message || String(e) }
    }
  },

  async mac (exec, { list }) {
    try {
      const results = await applyMacEnv(list)
      log.info(`macOS 环境变量已通过 launchctl setenv + LaunchAgent 写入: ${results.launchAgent}`)
      return {
        success: true,
        scope: 'User:launchctl+LaunchAgent',
        launchAgent: results.launchAgent,
      }
    } catch (e) {
      return { success: false, error: 'Failed to set environment variables', details: e.message || String(e) }
    }
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}

// 供关闭代理时清理 macOS 残留（可选调用）
module.exports.removeMacEnv = removeMacEnv

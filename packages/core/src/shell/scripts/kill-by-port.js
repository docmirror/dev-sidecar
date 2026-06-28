const Shell = require('../shell')

const execute = Shell.execute

/**
 * 终止占用指定端口的进程
 *
 * 各平台均采用 主方案 + 备选方案 的策略：
 * - windows: pwsh (Get-NetTCPConnection) → cmd (netstat + taskkill)
 * - linux:   lsof → fuser
 * - mac:     lsof → fuser
 */
const executor = {
  async windows (exec, { port }) {
    // 主方案：PowerShell（更可靠，跨平台一致，Win7+ 默认可用）
    try {
      const cmds = [
        // 查找处于 Listen 状态的 TCP 连接并终止对应进程
        `$conn = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -First 1; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }`,
      ]
      await exec(cmds, { type: 'ps' })
      return true
    } catch (psError) {
      // 备选方案：CMD netstat + taskkill（Win7 无 pwsh 或 pwsh 执行失败时回退）
      // 分两步执行，避免 for /f 在 cmd /s /c 下的引号解析问题
      try {
        const output = await exec([`netstat -aon | find ":${port}"`], { type: 'cmd', printErrorLog: false })
        if (!output) {
          throw new Error('没有找到占用该端口的进程')
        }

        // 解析 netstat 输出，提取处于 LISTENING 状态的 PID
        const lines = output.split(/\r?\n/)
        let killed = false
        for (const line of lines) {
          if (!line.includes('LISTENING')) {
            continue
          }
          const parts = line.trim().split(/\s+/)
          const pid = parts[parts.length - 1]
          if (pid && /^\d+$/.test(pid)) {
            await exec([`taskkill /f /pid ${pid} /t`], { type: 'cmd', printErrorLog: false })
            killed = true
          }
        }
        if (!killed) {
          throw new Error('未找到处于 LISTENING 状态的进程')
        }
        return true
      } catch (cmdError) {
        // 两种方案都失败，抛出包含原始错误信息的异常
        throw new Error(
          `终止占用端口 ${port} 的进程失败。\n`
          + `PowerShell 方案: ${psError.message}\n`
          + `CMD 方案: ${cmdError.message}`,
        )
      }
    }
  },

  async linux (exec, { port }) {
    // 主方案：lsof
    try {
      await exec(`kill $(lsof -i:${port} -t 2>/dev/null) 2>/dev/null || true`)
      return true
    } catch (_lsofError) {
      // 备选方案：fuser
      try {
        await exec(`fuser -k ${port}/tcp 2>/dev/null || true`)
        return true
      } catch (fuserError) {
        throw new Error(
          `终止占用端口 ${port} 的进程失败。\n`
          + `lsof 方案失败\n`
          + `fuser 方案: ${fuserError.message}`,
        )
      }
    }
  },

  async mac (exec, { port }) {
    // macOS 与 Linux 采用相同策略
    return executor.linux(exec, { port })
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}

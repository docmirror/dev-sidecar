const Shell = require('../shell')
const sudo = require('../sudo')

const execute = Shell.execute

const executor = {
  async windows (exec, { port }) {
    const killCmd = `for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do (taskkill /f /pid %a & exit /B)`
    try {
      await exec([killCmd], { type: 'cmd' })
      return true
    } catch (e) {
      const msg = String(e || '')
      if (/Access is denied|not permitted|permission denied/i.test(msg)) {
        // Re-run via sudo to trigger UAC elevation on Windows
        await sudo(killCmd, { name: `KillByPort ${port}` })
        return true
      }
      throw e
    }
  },
  async linux (exec, { port }) {
    const pidCmd = `lsof -i:${port} |grep 'dev-sidecar\\|electron\\|@docmirro' |awk '{print $2}'`
    try {
      await exec(`kill \`${pidCmd}\``)
      return true
    } catch (e) {
      const msg = String(e || '')
      if (/not permitted|Operation not permitted|permission denied/i.test(msg)) {
        await sudo(`kill \`${pidCmd}\``, { name: `KillByPort ${port}` })
        return true
      }
      throw e
    }
  },
  async mac (exec, { port }) {
    const pidCmd = `lsof -i:${port} |grep 'dev-side\\|Elect' |awk '{print $2}'`
    try {
      await exec(`kill \`${pidCmd}\``)
      return true
    } catch (e) {
      const msg = String(e || '')
      if (/not permitted|Operation not permitted|permission denied/i.test(msg)) {
        await sudo(`kill \`${pidCmd}\``, { name: `KillByPort ${port}` })
        return true
      }
      throw e
    }
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}

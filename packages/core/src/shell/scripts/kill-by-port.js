const Shell = require('../shell')
const sudo = require('../sudo')

const execute = Shell.execute

const executor = {
  async windows(exec, { port }) {
    const killCmd = `for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do (taskkill /f /pid %a & exit /B)`
    await sudo(killCmd, { name: `KillByPort ${port}` })
    return true
  },
  async linux(exec, { port }) {
    const pidCmd = `lsof -i:${port} |grep 'dev-sidecar\\|electron\\|@docmirro' |awk '{print $2}'`
    await sudo(`kill \`${pidCmd}\``, { name: `KillByPort ${port}` })
    return true
  },
  async mac(exec, { port }) {
    const pidCmd = `lsof -i:${port} |grep 'dev-side\\|Elect' |awk '{print $2}'`
    await sudo(`kill \`${pidCmd}\``, { name: `KillByPort ${port}` })
    return true
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}

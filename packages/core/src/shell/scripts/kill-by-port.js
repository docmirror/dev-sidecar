const Shell = require('../shell')
const execute = Shell.execute

const executor = {
  async windows (exec, { port }) {
    const cmds = [`for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do (taskkill /f /pid %a & exit /B) `]
    // eslint-disable-next-line no-unused-vars
    const ret = await exec(cmds, { type: 'cmd' })
    return true
  },
  async linux (exec, { port }) {
    await exec('kill `lsof -i:' + port + " |grep 'dev-sidecar\\|electron\\|@docmirro' |awk '{print $2}'`")
    return true
  },
  async mac (exec, { port }) {
    await exec('kill `lsof -i:' + port + " |grep 'dev-side\\|Elect' |awk '{print $2}'`")
    return true
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}

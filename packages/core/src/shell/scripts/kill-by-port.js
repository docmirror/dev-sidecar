import Shell from '../shell.js';
import sudo from '../sudo.js';

const execute = Shell.execute

let _sudo = sudo

const executor = {
  async windows(exec, { port }) {
    const killCmd = `for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do (taskkill /f /pid %a & exit /B)`
    await sudo(killCmd, { name: `KillByPort ${port}` })
    return true
  },
  async linux(exec, { port }) {
    const pidCmd = `lsof -i:${port} |grep 'dev-sidecar\|electron\|@docmirro' |awk '{print $2}'`
    await _sudo(`kill \`${pidCmd}\``, { name: `KillByPort ${port}` })
    return true
  },
  async mac(exec, { port }) {
    const pidCmd = `lsof -i:${port} |grep 'dev-side\\|Elect' |awk '{print $2}'`
    await _sudo(`kill \`${pidCmd}\``, { name: `KillByPort ${port}` })
    return true
  },
}

export default async function (args) {
  return execute(executor, args)
};

// Testing helpers: allow tests to inject a fake sudo implementation
export function __setSudo (newSudo) {
  _sudo = newSudo
}

export { executor }

import Shell from '../shell.js'
import extraPath from './extra-path/index.js'
import sudo from '../sudo.js'
const execute = Shell.execute

const executor = {
  windows (exec) {
    const loopbackPath = extraPath.getEnableLoopbackPath()
    const sudoCommand = `"${loopbackPath}"`

    return sudo(sudoCommand, { name: 'EnableLoopback' })
  },
  async linux (exec, { port }) {
    throw new Error('不支持此操作')
  },
  async mac (exec, { port }) {
    throw new Error('不支持此操作')
  },
}

export default async function (args) {
  return execute(executor, args)
};

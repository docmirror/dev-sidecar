import Shell from '../shell.js';

const execute = Shell.execute

const executor = {
  async windows (exec, { list }) {
    const cmds = []
    for (const item of list) {
      cmds.push(`npm config set ${item.key}  ${item.value}`)
    }
    return await exec(cmds, { type: 'cmd' })
  },
  async linux (exec, { port }) {
    throw new Error('暂未实现此功能')
  },
  async mac (exec, { port }) {
    throw new Error('暂未实现此功能')
  },
}

export default async function (args) {
  return execute(executor, args)
};

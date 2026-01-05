import Shell from '../shell.js';

const execute = Shell.execute

const executor = {
  async windows (exec, { list }) {
    const cmds = []
    for (const item of list) {
      // [Environment]::SetEnvironmentVariable('FOO', 'bar', 'Machine')
      cmds.push(`[Environment]::SetEnvironmentVariable('${item.key}', '${item.value}', 'Machine')`)
    }
    const ret = await exec(cmds, { type: 'ps' })

    const cmds2 = []
    for (const item of list) {
      // [Environment]::SetEnvironmentVariable('FOO', 'bar', 'Machine')
      cmds2.push(`set ${item.key}=""`)
    }
    await exec(cmds2, { type: 'cmd' })
    return ret
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

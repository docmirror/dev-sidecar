import Shell from '../shell.js';

const execute = Shell.execute

const executor = {
  async windows (exec) {
    const ret = await exec(['set'], { type: 'cmd' })
    const map = {}
    if (ret != null) {
      const lines = ret.split('\r\n')
      for (const item of lines) {
        const kv = item.split('=')
        if (kv.length > 1) {
          map[kv[0].trim()] = kv[1].trim()
        }
      }
    }
    return map
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
